import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Headphones,
  HelpCircle,
  MapPin,
  PhoneCall,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import type { OnboardingData } from '../../types.ts';

type OnboardingValues = Pick<
  OnboardingData,
  'businessName' | 'businessCategory' | 'website' | 'location' | 'timezone' | 'goals' | 'startingPoint'
>;

interface OnboardingWizardProps {
  initialData: OnboardingData;
  onSave: (data: Partial<OnboardingData>) => Promise<void>;
  onComplete: (data: OnboardingData) => Promise<void>;
  onSkip: () => Promise<void>;
}

const categories = [
  'Healthcare',
  'Real Estate',
  'Education',
  'Restaurant',
  'Retail',
  'Automotive',
  'Hospitality',
  'Professional Services',
  'Other',
];

const goalOptions = [
  { id: 'inbound', label: 'Answer inbound calls', detail: 'Respond to callers when your team is busy or unavailable.', Icon: PhoneCall },
  { id: 'leads', label: 'Capture new leads', detail: 'Collect the caller details your team needs to follow up.', Icon: Users },
  { id: 'faqs', label: 'Answer common questions', detail: 'Share approved information about your business.', Icon: HelpCircle },
  { id: 'callbacks', label: 'Arrange callbacks', detail: 'Record a callback request for your team.', Icon: Headphones },
  { id: 'followups', label: 'Follow up with existing leads', detail: 'Support follow-ups when the related features are configured.', Icon: ArrowRight },
  { id: 'campaigns', label: 'Explore outbound campaigns', detail: 'Campaign calling requires supported configuration and is not started here.', Icon: Sparkles },
];

const inputClass =
  'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20';

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  initialData,
  onSave,
  onComplete,
  onSkip,
}) => {
  const [step, setStep] = useState(Math.max(0, Math.min(initialData.step || 0, 4)));
  const [values, setValues] = useState<OnboardingValues>({
    businessName: initialData.businessName || '',
    businessCategory: initialData.businessCategory || '',
    website: initialData.website || '',
    location: initialData.location || '',
    timezone: initialData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    goals: initialData.goals || [],
    startingPoint: initialData.startingPoint || 'agent',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (step === 0) return;
    const timeout = window.setTimeout(() => {
      setSaving(true);
      void onSave({ ...values, status: 'in_progress', step })
        .catch((saveError) => {
          setError(saveError instanceof Error ? saveError.message : 'Could not save onboarding progress.');
        })
        .finally(() => setSaving(false));
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [onSave, step, values]);

  const persist = async (nextStep: number, status: OnboardingData['status'] = 'in_progress') => {
    setSaving(true);
    setError('');
    try {
      await onSave({ ...values, status, step: nextStep });
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save onboarding progress. Please try again.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const continueStep = async () => {
    if (step === 1 && (!values.businessName.trim() || !values.businessCategory)) {
      setError('Enter your business name and choose a category to continue.');
      return;
    }
    const nextStep = Math.min(step + 1, 4);
    if (await persist(nextStep)) setStep(nextStep);
  };

  const goBack = async () => {
    const nextStep = Math.max(step - 1, 0);
    if (await persist(nextStep)) setStep(nextStep);
  };

  const skip = async () => {
    setSaving(true);
    setError('');
    try {
      await onSkip();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save your choice. Please try again.');
      setSaving(false);
    }
  };

  const finish = async () => {
    setSaving(true);
    setError('');
    try {
      await onSave({ ...values, status: 'completed', step: 5, pendingAgentStart: values.startingPoint === 'agent' });
      await onComplete({
        ...initialData,
        ...values,
        status: 'completed',
        completed: true,
        step: 5,
        tourCompleted: false,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not finish onboarding. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof OnboardingValues>(key: K, value: OnboardingValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setError('');
  };

  const toggleGoal = (goal: string) => {
    update('goals', values.goals?.includes(goal)
      ? values.goals.filter((item) => item !== goal)
      : [...(values.goals || []), goal]);
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/90 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="mx-auto flex min-h-full max-w-3xl items-center justify-center">
        <section className="w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          <header className="flex items-center justify-between bg-slate-950 px-5 py-4 text-white sm:px-8">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/30 bg-blue-500/15 text-blue-300"><Sparkles className="h-5 w-5" /></span>
              <div>
                <p className="text-sm font-semibold">VoxMitra setup</p>
                <p className="text-xs text-slate-400">A few details to make your workspace yours</p>
              </div>
            </div>
            <button type="button" onClick={() => void skip()} disabled={saving} aria-label="Skip onboarding for now" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-50"><X className="h-5 w-5" /></button>
          </header>

          <div className="h-1 bg-slate-100"><div className="h-full bg-blue-600 transition-all" style={{ width: `${((step + 1) / 5) * 100}%` }} /></div>
          <div className="p-5 sm:p-8">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Step {step + 1} of 5</p>

            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <h1 id="onboarding-title" className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Welcome to VoxMitra</h1>
                  <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">Turn everyday business calls into opportunities. Let&apos;s set up your AI voice assistant.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['Answer customer enquiries', 'Share approved information with callers.'],
                    ['Capture leads and caller details', 'Keep important follow-up information organized.'],
                    ['Manage follow-ups and callbacks', 'Track callback requests and outcomes.'],
                    ['Review call history and outcomes', 'See supported records and summaries as activity arrives.'],
                    ['Support configured languages and voices', 'Available options depend on connected providers.'],
                  ].map(([title, description]) => (
                    <div key={title} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                      <div><p className="text-sm font-semibold text-slate-900">{title}</p><p className="mt-1 text-xs leading-relaxed text-slate-600">{description}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <div><h1 id="onboarding-title" className="text-2xl font-bold tracking-tight text-slate-950">Tell us about your business</h1><p className="mt-2 text-sm text-slate-600">These details help personalize your workspace. Optional fields can be left blank.</p></div>
                <label className="block text-sm font-semibold text-slate-800">Business name <span className="text-rose-600">*</span><input autoFocus value={values.businessName} onChange={(event) => update('businessName', event.target.value)} className={inputClass} placeholder="For example, Northside Dental" /></label>
                <label className="block text-sm font-semibold text-slate-800">Business category <span className="text-rose-600">*</span><select value={values.businessCategory} onChange={(event) => update('businessCategory', event.target.value)} className={inputClass}><option value="">Choose a category</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-800">Website <span className="font-normal text-slate-400">Optional</span><input type="url" value={values.website} onChange={(event) => update('website', event.target.value)} className={inputClass} placeholder="https://yourbusiness.com" /></label>
                  <label className="block text-sm font-semibold text-slate-800">Business location <span className="font-normal text-slate-400">Optional</span><span className="relative block"><MapPin className="absolute left-3 top-4 h-4 w-4 text-slate-400" /><input value={values.location} onChange={(event) => update('location', event.target.value)} className={`${inputClass} pl-9`} placeholder="City or region" /></span></label>
                </div>
                <label className="block text-sm font-semibold text-slate-800">Time zone<select value={values.timezone} onChange={(event) => update('timezone', event.target.value)} className={inputClass}><option value={values.timezone}>{values.timezone} (detected)</option>{['Asia/Kolkata', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Europe/London', 'UTC'].filter((zone) => zone !== values.timezone).map((zone) => <option key={zone} value={zone}>{zone}</option>)}</select></label>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div><h1 id="onboarding-title" className="text-2xl font-bold tracking-tight text-slate-950">What would you like VoxMitra to help with?</h1><p className="mt-2 text-sm text-slate-600">Choose any goals that fit. This saves your preferences; it does not create an agent or start calls.</p></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {goalOptions.map(({ id, label, detail, Icon }) => {
                    const selected = values.goals?.includes(id) || false;
                    return <button key={id} type="button" aria-pressed={selected} onClick={() => toggleGoal(id)} className={`rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${selected ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-slate-200 hover:border-slate-300'}`}><span className="flex items-center justify-between"><Icon className="h-5 w-5 text-blue-600" />{selected && <Check className="h-4 w-4 text-blue-700" />}</span><span className="mt-3 block text-sm font-semibold text-slate-900">{label}</span><span className="mt-1 block text-xs leading-relaxed text-slate-600">{detail}</span></button>;
                  })}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div><h1 id="onboarding-title" className="text-2xl font-bold tracking-tight text-slate-950">Choose your starting point</h1><p className="mt-2 text-sm text-slate-600">You can change your setup later. You don&apos;t need to connect a phone number or payment method now.</p></div>
                {[
                  { id: 'agent' as const, title: 'Create My First AI Agent', detail: 'Recommended · Use the guided agent wizard to create a draft configuration.' },
                  { id: 'dashboard' as const, title: 'Explore the Dashboard', detail: 'Take a quick look around before setting up an agent.' },
                ].map((option) => <button key={option.id} type="button" onClick={() => update('startingPoint', option.id)} className={`w-full rounded-2xl border p-5 text-left ${values.startingPoint === option.id ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-slate-200 hover:border-slate-300'}`}><span className="flex items-center gap-3"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${values.startingPoint === option.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{option.id === 'agent' ? <Sparkles className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}</span><span><span className="block text-sm font-semibold text-slate-900">{option.title}</span><span className="mt-1 block text-xs text-slate-600">{option.detail}</span></span></span></button>)}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <div><h1 id="onboarding-title" className="text-2xl font-bold tracking-tight text-slate-950">You&apos;re ready</h1><p className="mt-2 text-sm text-slate-600">Review your details. You can update business profile information later in settings.</p></div>
                <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-slate-50 px-4">
                  <div className="flex gap-3 py-4"><Building2 className="mt-0.5 h-4 w-4 text-blue-600" /><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Business</p><p className="mt-1 text-sm font-semibold text-slate-900">{values.businessName}</p><p className="text-xs text-slate-600">{values.businessCategory}{values.location ? ` · ${values.location}` : ''}</p></div></div>
                  <div className="flex gap-3 py-4"><Sparkles className="mt-0.5 h-4 w-4 text-violet-600" /><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your goals</p><p className="mt-1 text-sm text-slate-800">{values.goals?.length ? goalOptions.filter((goal) => values.goals?.includes(goal.id)).map((goal) => goal.label).join(', ') : 'No goals selected yet'}</p></div></div>
                  <div className="flex gap-3 py-4"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" /><div><p className="text-sm font-semibold text-slate-900">What happens next</p><p className="mt-1 text-xs leading-relaxed text-slate-600">Explore your dashboard, create a draft agent, and configure supported integrations when you&apos;re ready. Nothing is deployed or activated by this setup.</p></div></div>
                </div>
                <button type="button" onClick={() => setStep(1)} className="text-sm font-semibold text-blue-700 hover:text-blue-800">Edit details</button>
              </div>
            )}

            {error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                {step > 0 && <button type="button" onClick={() => void goBack()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><ArrowLeft className="h-4 w-4" />Back</button>}
                {step < 4 && <button type="button" onClick={() => void skip()} disabled={saving} className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-50">Skip for now</button>}
              </div>
              {step < 4
                ? <button type="button" onClick={() => void continueStep()} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">{step === 0 ? "Let's Get Started" : 'Continue'}<ArrowRight className="h-4 w-4" /></button>
                : <button type="button" onClick={() => void finish()} disabled={saving || !values.businessName.trim() || !values.businessCategory} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">{saving ? 'Saving...' : 'Go to Dashboard'}<ArrowRight className="h-4 w-4" /></button>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
