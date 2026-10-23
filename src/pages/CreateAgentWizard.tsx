import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  GraduationCap,
  HeartPulse,
  Home,
  LoaderCircle,
  MapPin,
  Mic2,
  Play,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Utensils,
  Volume2,
  Wrench,
  BriefcaseBusiness,
  CarFront,
  Plus,
  TriangleAlert,
} from 'lucide-react';
import { api } from '../api/client.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { AgentPlanEditor } from '../components/agents/AgentPlanEditor.tsx';
import { generateDemoAgentPlan } from '../agents/generateDemoAgentPlan.ts';
import type { AgentPlan, BusinessCategory, BusinessIntake } from '../agents/agentPlan.types.ts';
import {
  getPlanWarnings,
  validateBusinessDetails,
  validateBusinessSelection,
} from '../agents/agentWizardValidation.ts';
import type { AgentType, ElevenLabsVoice } from '../types.ts';
import type { OnboardingData } from '../types.ts';

interface CreateAgentWizardProps {
  onSuccess: (agentId: string) => void;
  onCancel: () => void;
  onTest: (agentId: string) => void;
  initialBusiness?: OnboardingData;
}

const BUSINESS_TYPES: {
  id: BusinessCategory;
  label: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'healthcare', label: 'Healthcare and Clinics', description: 'Clinics, care providers, and health practices', Icon: HeartPulse },
  { id: 'real-estate', label: 'Real Estate', description: 'Property enquiries, viewings, and lead follow-up', Icon: Home },
  { id: 'education', label: 'Education', description: 'Schools, courses, tutoring, and admissions', Icon: GraduationCap },
  { id: 'automotive', label: 'Automotive', description: 'Dealerships, workshops, and vehicle services', Icon: CarFront },
  { id: 'e-commerce', label: 'E-commerce', description: 'Online stores, orders, and customer support', Icon: ShoppingBag },
  { id: 'hospitality', label: 'Hospitality and Restaurants', description: 'Dining, stays, reservations, and guest services', Icon: Utensils },
  { id: 'professional-services', label: 'Financial and Professional Services', description: 'Advisory, accounting, legal, and other practices', Icon: BriefcaseBusiness },
  { id: 'local-services', label: 'Home and Local Services', description: 'Home repair, maintenance, and local businesses', Icon: Wrench },
  { id: 'other', label: 'Other Business', description: 'Tell us what makes your business unique', Icon: Building2 },
];

const ANALYSIS_STAGES = [
  'Understanding your business',
  'Identifying common customer enquiries',
  'Planning the conversation flow',
  'Preparing greetings and agent instructions',
  'Defining information collection fields',
  'Configuring escalation and follow-up rules',
];

const STEP_NAMES = ['Business type', 'Business details', 'Business analysis', 'Agent plan', 'Voice & calls', 'Review & test'];
const controlClass =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';
const labelClass = 'block text-xs font-semibold text-slate-700';

function splitLines(value: string): string[] {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function parseFaqs(value: string) {
  return splitLines(value).map((line) => {
    const [question, ...answer] = line.split('|');
    return { question: question.trim(), answer: answer.join('|').trim() };
  });
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  required,
  error,
  multiline = false,
  rows = 3,
  type = 'text',
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  error?: string;
  multiline?: boolean;
  rows?: number;
  type?: string;
  readOnly?: boolean;
}) {
  const id = useId();
  const className = `${controlClass} ${error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' : ''}`;
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}{required && <span aria-hidden="true" className="ml-1 text-rose-600">*</span>}
      </label>
      {multiline ? (
        <textarea id={id} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} readOnly={readOnly} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} className={`${className} resize-y ${readOnly ? 'bg-slate-50 text-slate-500' : ''}`} />
      ) : (
        <input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} readOnly={readOnly} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} className={`${className} ${readOnly ? 'bg-slate-50 text-slate-500' : ''}`} />
      )}
      {hint && !error && <p id={`${id}-hint`} className="mt-1.5 text-xs leading-relaxed text-slate-500">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-rose-700">{error}</p>}
    </div>
  );
}

function Banner({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'warning' | 'error' | 'success' }) {
  const styles = {
    info: 'border-blue-200 bg-blue-50 text-blue-950',
    warning: 'border-amber-200 bg-amber-50 text-amber-950',
    error: 'border-rose-200 bg-rose-50 text-rose-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-950',
  };
  return <div className={`rounded-xl border p-4 text-sm leading-relaxed ${styles[tone]}`}>{children}</div>;
}

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{subtitle}</p>
    </div>
  );
}

export const CreateAgentWizard: React.FC<CreateAgentWizardProps> = ({ onSuccess, onCancel, onTest, initialBusiness }) => {
  const { business: workspaceBusiness } = useAuth();
  const [step, setStep] = useState(1);
  const [business, setBusiness] = useState<BusinessIntake>({
    businessName: initialBusiness?.businessName || workspaceBusiness?.name || '',
    category: ({
      healthcare: 'healthcare',
      'real estate': 'real-estate',
      education: 'education',
      restaurant: 'hospitality',
      retail: 'e-commerce',
      automotive: 'automotive',
      hospitality: 'hospitality',
      'professional services': 'professional-services',
      other: 'other',
    }[initialBusiness?.businessCategory?.toLowerCase() || ''] || '') as BusinessCategory,
    customCategory: initialBusiness?.businessCategory.toLowerCase() === 'other' ? 'Other business' : '',
    description: '',
    website: initialBusiness?.website || '',
    location: initialBusiness?.location || '',
    timezone: initialBusiness?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    services: [],
    openingHours: '',
    contactDetails: '',
    faqs: [],
    primaryObjective: initialBusiness?.goals?.includes('campaigns')
      ? 'bulk_caller'
      : initialBusiness?.goals?.some((goal) => goal === 'leads' || goal === 'followups')
        ? 'instant_lead'
        : 'inbound_receptionist',
    supportedLanguages: ['en-US'],
    transferDestination: '',
    operatingRules: [],
  });
  const [plan, setPlan] = useState<AgentPlan | null>(null);
  const [editPlan, setEditPlan] = useState(false);
  const [analysisStage, setAnalysisStage] = useState(-1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const cancelledAnalysis = useRef(false);
  const [search, setSearch] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [voiceCatalog, setVoiceCatalog] = useState<ElevenLabsVoice[]>([]);
  const [supportedLanguages, setSupportedLanguages] = useState<{ code: string; name: string; native: string }[]>([]);
  const [voiceProviderConnected, setVoiceProviderConnected] = useState<boolean | null>(null);
  const [voiceError, setVoiceError] = useState('');
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [voiceId, setVoiceId] = useState('');
  const [voiceName, setVoiceName] = useState('');
  const [primaryLanguage, setPrimaryLanguage] = useState('en-US');
  const [speakingRate, setSpeakingRate] = useState(1);
  const [previewingVoiceId, setPreviewingVoiceId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [createdAgentId, setCreatedAgentId] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => audioRef.current?.pause(), []);

  const filteredBusinessTypes = useMemo(
    () => BUSINESS_TYPES.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(search.toLowerCase())),
    [search]
  );
  const businessErrors = validateBusinessDetails(business);
  const planWarnings = plan ? getPlanWarnings(plan) : [];
  const hasVoice = Boolean(voiceId && voiceName);

  const updateBusiness = <K extends keyof BusinessIntake>(key: K, value: BusinessIntake[K]) => {
    setBusiness((previous) => ({ ...previous, [key]: value }));
    setPlan(null);
    setErrors([]);
  };

  const runAnalysis = async () => {
    const selectionErrors = validateBusinessSelection(business.category, business.customCategory);
    const detailsErrors = validateBusinessDetails(business);
    const validationErrors = [...selectionErrors, ...detailsErrors];
    setErrors(validationErrors);
    if (validationErrors.length > 0) return;

    cancelledAnalysis.current = false;
    setAnalysisError('');
    setAnalysisStage(-1);
    setPlan(null);
    setStep(3);
    setIsAnalyzing(true);

    try {
      for (let index = 0; index < ANALYSIS_STAGES.length; index += 1) {
        if (cancelledAnalysis.current) return;
        setAnalysisStage(index);
        await new Promise<void>((resolve) => window.setTimeout(resolve, 550));
      }
      if (cancelledAnalysis.current) return;
      const initialVoice = {
        provider: 'elevenlabs' as const,
        voiceId,
        voiceName,
        language: primaryLanguage,
        speakingRate,
      };
      setPlan(generateDemoAgentPlan(business, initialVoice));
      setStep(4);
      setEditPlan(false);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'The demo plan could not be prepared.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const cancelAnalysis = () => {
    cancelledAnalysis.current = true;
    setIsAnalyzing(false);
    setStep(2);
  };

  const loadVoices = async () => {
    setLoadingVoices(true);
    setVoiceError('');
    try {
      const catalog = await api.getVoices();
      setVoiceCatalog(catalog.voices);
      setSupportedLanguages(catalog.supported_languages);
      setVoiceProviderConnected(catalog.configured);
      if (!voiceId && catalog.voices[0]) {
        setVoiceId(catalog.voices[0].voice_id);
        setVoiceName(catalog.voices[0].name);
        setPlan((previous) =>
          previous
            ? { ...previous, voice: { ...previous.voice, voiceId: catalog.voices[0].voice_id, voiceName: catalog.voices[0].name } }
            : previous
        );
      }
      if (!catalog.supported_languages.some((language) => language.code === primaryLanguage) && catalog.supported_languages[0]) {
        setPrimaryLanguage(catalog.supported_languages[0].code);
        setPlan((previous) =>
          previous
            ? { ...previous, voice: { ...previous.voice, language: catalog.supported_languages[0].code } }
            : previous
        );
      }
    } catch (error) {
      setVoiceError(error instanceof Error ? error.message : 'Could not load the voice catalogue.');
    } finally {
      setLoadingVoices(false);
    }
  };

  useEffect(() => {
    if (step === 5 && voiceCatalog.length === 0 && !voiceError && !loadingVoices) {
      void loadVoices();
    }
  }, [step]);

  const updateVoice = (updates: Partial<AgentPlan['voice']>) => {
    if (!plan) return;
    const nextVoice = { ...plan.voice, ...updates };
    setPlan({ ...plan, voice: nextVoice });
    setVoiceId(nextVoice.voiceId);
    setVoiceName(nextVoice.voiceName);
    setPrimaryLanguage(nextVoice.language);
    setSpeakingRate(nextVoice.speakingRate);
  };

  const previewVoice = async (voice: ElevenLabsVoice) => {
    if (!voice.preview_url) return;
    audioRef.current?.pause();
    const audio = new Audio(voice.preview_url);
    audioRef.current = audio;
    setPreviewingVoiceId(voice.voice_id);
    audio.onended = () => setPreviewingVoiceId('');
    audio.onerror = () => setPreviewingVoiceId('');
    try {
      await audio.play();
    } catch {
      setPreviewingVoiceId('');
      setVoiceError('This voice preview could not be played. You can still select the voice.');
    }
  };

  const handleSaveDraft = async (testAfterSave = false) => {
    setSaveError('');
    if (!plan || !hasVoice) {
      setSaveError('Choose a voice before saving this agent draft.');
      return;
    }
    const validationErrors = [...validateBusinessSelection(business.category, business.customCategory), ...businessErrors];
    if (validationErrors.length) {
      setSaveError(validationErrors.join(' '));
      return;
    }

    setSaving(true);
    try {
      const configFields = plan.informationFields.map((field) => {
        const lowerName = `${field.name} ${field.description}`.toLowerCase();
        const type = lowerName.includes('phone') || lowerName.includes('number')
          ? 'phone'
          : lowerName.includes('email')
            ? 'email'
            : lowerName.includes('date') || lowerName.includes('time')
              ? 'date'
              : 'text';
        return {
          name: field.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'),
          label: field.description || field.name,
          required: field.required,
          type: type as 'text' | 'phone' | 'email' | 'date',
        };
      });
      const callback = plan.callback.enabled
        ? `Ask permission before scheduling. Confirm the date, time, and ${business.timezone || 'caller timezone'}; record callback status. At callback time, ask whether the person is available before attempting a transfer. Offer rescheduling if unavailable, stop on opt-out, and stop when the configured limit of ${plan.callback.maxRetries} retries is reached.`
        : 'Do not schedule callbacks unless the business enables them.';
      const result = await api.createAgent({
        name: plan.identity.name,
        agent_type: business.primaryObjective,
        description: plan.identity.businessContext,
        status: 'draft',
        config: {
          greeting: plan.identity.greeting,
          instructions: `${plan.identity.tone}\n\nUse the saved structured workflow and safety rules. Do not guess when approved business knowledge is missing.`,
          objectives: plan.objectives.map((objective, index) => `${index + 1}. ${objective}`).join('\n'),
          supported_languages: Array.from(new Set([primaryLanguage, ...business.supportedLanguages])),
          voice_id: voiceId,
          voice_name: voiceName,
          voice_settings: { stability: 0.5, similarity_boost: 0.75, speaking_rate: speakingRate },
          max_duration_seconds: 300,
          transfer_enabled: plan.transfer.enabled,
          transfer_phone: plan.transfer.destination,
          transfer_conditions: plan.transfer.conditions,
          callback_instructions: callback,
          contact_fields_to_collect: configFields,
          business_faqs: plan.knowledge.faqs,
          agent_plan: plan,
        },
      });
      setCreatedAgentId(result.agent.id);
      if (testAfterSave) onTest(result.agent.id);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'The draft could not be saved. Your entries are still here; try again.');
    } finally {
      setSaving(false);
    }
  };

  const setStepAfterValidation = (nextStep: number) => {
    setErrors([]);
    if (nextStep === 2) {
      const validationErrors = validateBusinessSelection(business.category, business.customCategory);
      setErrors(validationErrors);
      if (validationErrors.length) return;
    }
    if (nextStep === 3) {
      void runAnalysis();
      return;
    }
    setStep(nextStep);
  };

  if (createdAgentId) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-slate-950 px-6 py-10 text-center text-white sm:px-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">Draft saved</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{plan?.identity.name}</h1>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-300">
              Your editable agent plan is saved in this workspace. It is a draft, not a live phone agent.
            </p>
          </div>
          <div className="space-y-5 p-6 sm:p-8">
            <Banner tone="warning">
              This workspace currently supports saved agent drafts and the interactive test lab. Live deployment, phone-number provisioning, and callback execution require connected telephony services and deployment capabilities.
            </Banner>
            <div className="grid gap-3 sm:grid-cols-3">
              <button onClick={() => onSuccess(createdAgentId)} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                Open agent settings
              </button>
              <button onClick={() => onTest(createdAgentId)} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                Test agent
              </button>
              <button onClick={onCancel} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                Open AI Agents
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <header className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-sm">
        <div className="flex flex-col gap-7 px-5 py-6 sm:px-8 sm:py-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <button onClick={onCancel} className="mb-5 inline-flex items-center gap-2 rounded-md text-sm text-slate-300 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
              <ArrowLeft className="h-4 w-4" /> AI Agents
            </button>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
              <Sparkles className="h-4 w-4" /> VoxMitra Agent Studio
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Let's build your AI agent</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
              Tell us what your business does. We'll prepare an agent around your needs.
            </p>
          </div>
          <div className="w-full lg:max-w-xl">
            <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
              <span>Step {step} of 6</span>
              <span className="font-medium text-slate-200">{STEP_NAMES[step - 1]}</span>
            </div>
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-label="Agent creation progress" aria-valuemin={1} aria-valuemax={6} aria-valuenow={step}>
              <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${(step / 6) * 100}%` }} />
            </div>
            <ol className="grid grid-cols-6 gap-1">
              {STEP_NAMES.map((name, index) => {
                const stepNumber = index + 1;
                const reachable = stepNumber < step || (stepNumber >= 4 && Boolean(plan));
                return (
                  <li key={name}>
                    <button
                      type="button"
                      disabled={!reachable && stepNumber !== step}
                      onClick={() => {
                        if (!reachable) return;
                        if (stepNumber === 3 && plan) setStep(4);
                        else setStep(stepNumber);
                      }}
                      aria-current={stepNumber === step ? 'step' : undefined}
                      className={`flex w-full items-center gap-1.5 rounded px-1 py-1.5 text-left text-[10px] leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:text-[11px] ${
                        stepNumber === step ? 'text-white' : stepNumber < step ? 'text-blue-300' : 'text-slate-500'
                      } disabled:cursor-default`}
                    >
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${stepNumber < step ? 'border-blue-400 bg-blue-500 text-white' : stepNumber === step ? 'border-blue-300 text-blue-200' : 'border-slate-700 text-slate-500'}`}>
                        {stepNumber < step ? <Check className="h-3 w-3" /> : stepNumber}
                      </span>
                      <span className="hidden sm:block">{name}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </header>

      {errors.length > 0 && step !== 3 && (
        <Banner tone="error">
          <ul className="list-inside list-disc space-y-1">{errors.map((error) => <li key={error}>{error}</li>)}</ul>
        </Banner>
      )}

      {step === 1 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <SectionHeading eyebrow="Step 1 · Business type" title="What kind of business do you run?" subtitle="Choose the closest match. This helps us prepare relevant questions and sensible call-handling rules." />
          <label className="relative mb-5 block max-w-md">
            <span className="sr-only">Search business categories</span>
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search business types" className={`${controlClass} pl-9`} />
          </label>
          <div role="group" aria-label="Business category" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredBusinessTypes.map(({ id, label, description, Icon }) => {
              const selected = business.category === id;
              return (
                <button
                  type="button"
                  aria-pressed={selected}
                  key={id}
                  onClick={() => {
                    updateBusiness('category', id);
                    if (id !== 'other') updateBusiness('customCategory', '');
                  }}
                  className={`group relative rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                    selected ? 'border-blue-500 bg-blue-50/70 ring-1 ring-blue-500' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="block pr-7 text-sm font-semibold text-slate-950">{label}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-600">{description}</span>
                  {selected && <CheckCircle2 aria-hidden="true" className="absolute right-4 top-4 h-5 w-5 text-blue-600" />}
                </button>
              );
            })}
          </div>
          {filteredBusinessTypes.length === 0 && <p className="mt-5 text-sm text-slate-600">No category matches that search. Try a broader term or choose “Other Business”.</p>}
          {business.category === 'other' && (
            <div className="mt-5 max-w-lg">
              <Field label="What kind of business is it?" value={business.customCategory} onChange={(value) => updateBusiness('customCategory', value)} placeholder="For example, a pet grooming studio" required error={errors.find((error) => error.includes('Describe your business category'))} />
            </div>
          )}
          <div className="mt-7 flex justify-end border-t border-slate-100 pt-5">
            <button onClick={() => setStepAfterValidation(2)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <SectionHeading eyebrow="Step 2 · Business details" title="Give your agent the right context" subtitle="Share the essentials in your own words. You can refine every suggestion before saving." />
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Business name" value={business.businessName} onChange={(value) => updateBusiness('businessName', value)} placeholder="e.g. Riverside Family Clinic" required error={errors.find((error) => error.includes('business name'))} />
            <Field label="Business category" value={business.category === 'other' ? business.customCategory : BUSINESS_TYPES.find((item) => item.id === business.category)?.label || ''} onChange={() => undefined} readOnly hint="Selected in the previous step." />
            <div className="md:col-span-2">
              <Field label="What does your business do?" value={business.description} onChange={(value) => updateBusiness('description', value)} placeholder="Describe who you help, what you offer, and what customers usually contact you about." hint="A few plain-language sentences are enough. Avoid sharing confidential customer information." multiline rows={4} required error={errors.find((error) => error.includes('characters'))} />
            </div>
            <label className={labelClass}>
              What should this agent mainly do?
              <select value={business.primaryObjective} onChange={(event) => updateBusiness('primaryObjective', event.target.value as AgentType)} className={controlClass}>
                <option value="inbound_receptionist">Answer inbound calls and enquiries</option>
                <option value="instant_lead">Follow up with new leads</option>
                <option value="bulk_caller">Make planned campaign calls</option>
              </select>
              <span className="mt-1 block text-xs font-normal text-slate-500">You can change this later.</span>
            </label>
            <div className="md:col-span-2">
              <details className="group rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <summary className="cursor-pointer list-none rounded text-sm font-semibold text-slate-800 marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                  Optional business details <span className="ml-1 text-xs font-normal text-slate-500">— add context for more useful answers</span>
                </summary>
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <Field label="Website" value={business.website} onChange={(value) => updateBusiness('website', value)} placeholder="https://yourbusiness.com" type="url" hint="Saved as a reference; it is not crawled automatically." />
                  <Field label="Location" value={business.location} onChange={(value) => updateBusiness('location', value)} placeholder="City, region, country" />
                  <Field label="Timezone" value={business.timezone} onChange={(value) => updateBusiness('timezone', value)} placeholder="e.g. Asia/Kolkata" hint="Used when confirming appointment or callback times." />
            <div className="md:col-span-2">
              <Field label={business.category === 'healthcare' ? 'Services or specialties' : business.category === 'hospitality' ? 'Services, menu highlights, or amenities' : 'Services or products'} value={business.services.join('\n')} onChange={(value) => updateBusiness('services', splitLines(value))} placeholder="Add one service or product per line" multiline rows={3} hint="Optional, but useful for accurate answers." />
            </div>
            <Field label="Opening hours" value={business.openingHours} onChange={(value) => updateBusiness('openingHours', value)} placeholder="e.g. Mon–Fri, 9:00 AM–5:00 PM" multiline rows={3} hint="Leave blank if hours vary. The agent will not guess." />
            <Field label="Business contact details" value={business.contactDetails} onChange={(value) => updateBusiness('contactDetails', value)} placeholder="Public phone, email, or department name" multiline rows={3} />
            <div className="md:col-span-2">
              <Field label="Frequently asked questions and approved answers" value={business.faqs.map((faq) => `${faq.question} | ${faq.answer}`).join('\n')} onChange={(value) => updateBusiness('faqs', parseFaqs(value))} placeholder={'Do you accept new patients? | Yes, please call our reception team.\nDo you offer weekend appointments? | Weekend hours are not currently provided.'} hint="One question per line. Separate each approved answer with a vertical bar (|)." multiline rows={4} />
            </div>
            <Field label="Languages your team supports" value={business.supportedLanguages.join(', ')} onChange={(value) => updateBusiness('supportedLanguages', value.split(',').map((item) => item.trim()).filter(Boolean))} placeholder="en-US, hi-IN" hint="Comma-separated language or locale codes. Voice choices may vary by provider." />
            <Field label="Transfer destination" value={business.transferDestination} onChange={(value) => updateBusiness('transferDestination', value)} placeholder="+1 555 0100" hint="Optional. Add a number only if your team can receive transferred calls." />
            <Field label="Special operating rules" value={business.operatingRules.join('\n')} onChange={(value) => updateBusiness('operatingRules', splitLines(value))} placeholder="One rule per line, e.g. Never promise same-day appointments." multiline rows={3} />
                </div>
              </details>
            </div>
          </div>
          <div className="mt-7 flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row">
            <button onClick={() => setStep(1)} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Back</button>
            <button onClick={() => void runAnalysis()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
              Analyze business <Sparkles className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <SectionHeading eyebrow="Step 3 · Business analysis" title={isAnalyzing ? 'Preparing your agent plan' : analysisError ? 'Plan preparation needs another try' : 'Business analysis'} subtitle="We turn the information you provided into a structured starting point you can review and edit." />
          <Banner tone="warning">
            <span className="font-semibold">Development demo mode.</span> This analysis uses local, rule-based templates. No AI analysis service is connected, and no business information is sent to an AI provider.
          </Banner>
          <div className="my-6 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Analysis stages" aria-valuemin={0} aria-valuemax={ANALYSIS_STAGES.length} aria-valuenow={Math.max(0, analysisStage + 1)}>
            <div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${Math.max(0, ((analysisStage + 1) / ANALYSIS_STAGES.length) * 100)}%` }} />
          </div>
          <ol className="space-y-3">
            {ANALYSIS_STAGES.map((stageName, index) => {
              const completed = !isAnalyzing || index < analysisStage;
              const active = isAnalyzing && index === analysisStage;
              return (
                <li key={stageName} className={`flex items-center gap-3 rounded-xl border p-3 transition ${active ? 'border-blue-200 bg-blue-50' : completed ? 'border-slate-100 bg-slate-50' : 'border-transparent'}`}>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${completed ? 'bg-emerald-100 text-emerald-700' : active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                    {completed ? <Check className="h-4 w-4" /> : active ? <LoaderCircle className="h-4 w-4 animate-spin" /> : index + 1}
                  </span>
                  <span className={`text-sm ${active ? 'font-semibold text-blue-950' : completed ? 'text-slate-700' : 'text-slate-400'}`}>{stageName}</span>
                </li>
              );
            })}
          </ol>
          {analysisError && <div className="mt-5"><Banner tone="error">{analysisError}</Banner></div>}
          <div className="mt-7 flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row">
            <button onClick={cancelAnalysis} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              {isAnalyzing ? 'Cancel analysis' : 'Back to details'}
            </button>
            {analysisError && <button onClick={() => void runAnalysis()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Retry <Sparkles className="h-4 w-4" /></button>}
          </div>
        </section>
      )}

      {step === 4 && plan && (
        <section className="space-y-5">
          <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <SectionHeading eyebrow="Step 4 · Agent plan" title="A plan built around your business" subtitle="Review the proposed behavior, or switch to Edit to refine every section before saving." />
            <div className="mb-6 inline-flex shrink-0 rounded-xl bg-slate-100 p-1" role="group" aria-label="Plan view">
              <button onClick={() => setEditPlan(false)} aria-pressed={!editPlan} className={`rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${!editPlan ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600'}`}>Overview</button>
              <button onClick={() => setEditPlan(true)} aria-pressed={editPlan} className={`rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${editPlan ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600'}`}>Edit plan</button>
            </div>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
            <span className="font-semibold">Demo-generated structure.</span> Suggestions are based on the details you supplied, not a live AI analysis. Verify every business fact before using this agent.
          </div>
          <AgentPlanEditor plan={plan} onChange={setPlan} mode={editPlan ? 'edit' : 'overview'} />
          <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-200 pt-5 sm:flex-row">
            <button onClick={() => setStep(2)} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Back to business details</button>
            <button onClick={() => { updateVoice({ voiceId, voiceName, language: primaryLanguage, speakingRate }); setStep(5); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
              Voice & call settings <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {step === 5 && plan && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <SectionHeading eyebrow="Step 5 · Voice and call settings" title="Choose how your agent sounds" subtitle="Voice availability and previews come from the configured provider. No preview is shown unless the provider supplies audio." />
          {loadingVoices && <div className="mb-5 flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-600"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading available voices…</div>}
          {voiceError && (
            <div className="mb-5 space-y-3">
              <Banner tone="error">{voiceError}</Banner>
              <button onClick={() => void loadVoices()} disabled={loadingVoices} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Retry voice catalogue</button>
            </div>
          )}
          {voiceProviderConnected === false && (
            <div className="mb-5"><Banner tone="warning">ElevenLabs is not connected. These are standard voice presets; audio previews and live voice synthesis are unavailable until the provider is configured.</Banner></div>
          )}
          {voiceProviderConnected === true && (
            <div className="mb-5"><Banner tone="success">Connected to ElevenLabs. Only voices and preview audio returned by the provider are listed here.</Banner></div>
          )}
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <Field label="Agent display name" value={plan.identity.name} onChange={(value) => setPlan({ ...plan, identity: { ...plan.identity, name: value } })} required />
            <label className={labelClass}>
              Primary language
              <select value={primaryLanguage} onChange={(event) => updateVoice({ language: event.target.value })} className={controlClass}>
                {supportedLanguages.map((language) => <option value={language.code} key={language.code}>{language.name} · {language.native}</option>)}
              </select>
              <span className="mt-1 block text-xs font-normal text-slate-500">Other supported languages: {business.supportedLanguages.join(', ') || 'Not specified'}</span>
            </label>
          </div>
          <div className="mb-7">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900"><Mic2 className="h-4 w-4 text-blue-700" /> Available voices</div>
            {voiceCatalog.length === 0 && !loadingVoices ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-600">
                {voiceError ? 'Voice options could not be loaded. Retry the catalogue before selecting a provider voice.' : 'No provider voices are currently available.'}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {voiceCatalog.map((voice) => {
                  const selected = voiceId === voice.voice_id;
                  const gender = voice.labels?.gender;
                  const style = voice.labels?.accent || voice.labels?.use_case || voice.category;
                  return (
                    <div key={voice.voice_id} className={`rounded-2xl border p-4 transition ${selected ? 'border-blue-500 bg-blue-50/70 ring-1 ring-blue-500' : 'border-slate-200'}`}>
                      <button type="button" onClick={() => updateVoice({ voiceId: voice.voice_id, voiceName: voice.name })} aria-pressed={selected} className="w-full rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-950">{voice.name}</span>
                          {selected && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                        </span>
                        {Boolean(gender || style) && <span className="mt-1 block text-xs capitalize text-slate-500">{[gender, style].filter(Boolean).join(' · ')}</span>}
                        {voice.description && <span className="mt-2 block text-xs leading-relaxed text-slate-600">{voice.description}</span>}
                      </button>
                      {voice.preview_url ? (
                        <button type="button" onClick={() => void previewVoice(voice)} className="mt-3 inline-flex items-center gap-1.5 rounded text-xs font-semibold text-blue-700 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                          {previewingVoiceId === voice.voice_id ? <Volume2 className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                          {previewingVoiceId === voice.voice_id ? 'Playing preview' : 'Play preview'}
                        </button>
                      ) : (
                        <span className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-400"><Volume2 className="h-3.5 w-3.5" /> Preview unavailable</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <label className={labelClass}>
              Speaking pace <span className="font-normal text-slate-500">{speakingRate.toFixed(1)}×</span>
              <input type="range" min="0.7" max="1.2" step="0.1" value={speakingRate} onChange={(event) => updateVoice({ speakingRate: Number(event.target.value) })} className="mt-3 w-full accent-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" />
              <span className="mt-1 block text-xs font-normal text-slate-500">Saved with this plan. Applying speaking pace depends on provider integration support.</span>
            </label>
            <Field label="Transfer destination" value={plan.transfer.destination} onChange={(value) => {
              setBusiness((previous) => ({ ...previous, transferDestination: value }));
              setPlan({ ...plan, business: { ...plan.business, transferDestination: value }, transfer: { ...plan.transfer, destination: value, enabled: Boolean(value) } });
            }} placeholder="Phone number in international format" hint="Transfers remain unavailable until a telephony integration is connected." />
            <Field label="Business hours" value={plan.knowledge.openingHours} onChange={(value) => {
              setBusiness((previous) => ({ ...previous, openingHours: value }));
              setPlan({ ...plan, business: { ...plan.business, openingHours: value }, knowledge: { ...plan.knowledge, openingHours: value } });
            }} placeholder="Your confirmed opening hours" />
            <Field label="Timezone" value={business.timezone} onChange={(value) => {
              setBusiness((previous) => ({ ...previous, timezone: value }));
              setPlan({ ...plan, business: { ...plan.business, timezone: value } });
            }} placeholder="e.g. Asia/Kolkata" />
            <Field label="Maximum callback retries" value={String(plan.callback.maxRetries)} onChange={(value) => setPlan({ ...plan, callback: { ...plan.callback, maxRetries: Math.max(0, Number(value) || 0) } })} type="number" hint="The plan stops on opt-out or once this limit is reached." />
            <Field label="Transfer behavior" value={plan.transfer.conditions} onChange={(value) => setPlan({ ...plan, transfer: { ...plan.transfer, conditions: value } })} multiline rows={2} />
          </div>
          <div className="mt-7 flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row">
            <button onClick={() => setStep(4)} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Back to plan</button>
            <button onClick={() => setStep(6)} disabled={!hasVoice} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              Review agent <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {step === 6 && plan && (
        <section className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <SectionHeading eyebrow="Step 6 · Review, test and save" title="Review your agent before creating it" subtitle="Your agent is saved as a draft first. You can test it in the existing voice lab, then update its configuration." />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Agent and business', `${plan.identity.name} · ${business.businessName}`],
                ['Voice and language', `${voiceName} · ${primaryLanguage}`],
                ['Primary goal', business.primaryObjective.replaceAll('_', ' ')],
                ['Information fields', `${plan.informationFields.length} configured`],
                ['Workflow', `${plan.workflow.length} steps`],
                ['Transfer', plan.transfer.enabled ? plan.transfer.destination || 'Enabled; destination missing' : 'Disabled'],
                ['Callback policy', plan.callback.enabled ? `Consent required · up to ${plan.callback.maxRetries} retries` : 'Disabled'],
                ['Business knowledge', `${plan.knowledge.services.length} services · ${plan.knowledge.faqs.length} FAQs`],
                ['Timezone', business.timezone || 'Not provided'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-2 text-sm font-medium capitalize leading-relaxed text-slate-900">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <Clock3 className="h-4 w-4" /> Maximum duration: 5 minutes
              <span className="mx-1 text-slate-300">·</span>
              <MapPin className="h-4 w-4" /> Business location: {business.location || 'Not provided'}
            </div>
          </div>

          {planWarnings.length > 0 && (
            <Banner tone="warning">
              <p className="font-semibold">Configuration warnings</p>
              <ul className="mt-2 list-inside list-disc space-y-1">{planWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </Banner>
          )}
          {!planWarnings.length && <Banner tone="success">No plan warnings. Review business facts and test the draft before any live use.</Banner>}
          <Banner tone="info">
            <span className="font-semibold">Live deployment is not connected.</span> This project has no agent deployment/phone-number provisioning endpoint. The deploy control is intentionally unavailable; creating or testing this draft will not activate a live phone agent.
          </Banner>
          {saveError && <Banner tone="error">{saveError}</Banner>}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <button onClick={() => setStep(4)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              <ArrowLeft className="h-4 w-4" /> Back to edit
            </button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button onClick={() => void handleSaveDraft()} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50">
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Save as draft
              </button>
              <button onClick={() => void handleSaveDraft(true)} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50">
                <Play className="h-4 w-4" /> Test agent
              </button>
              <button type="button" disabled aria-describedby="deployment-unavailable" className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-500">
                <ShieldCheck className="h-4 w-4" /> Deploy agent
              </button>
            </div>
          </div>
          <p id="deployment-unavailable" className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            Deployment requires a connected telephony provider and a supported activation endpoint. It cannot be confirmed or performed from this app yet.
          </p>
        </section>
      )}
      <audio ref={audioRef} className="sr-only" />
    </div>
  );
};
