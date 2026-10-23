import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Save,
  Play,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import { api } from '../api/client.ts';
import { Agent, AgentConfig, FAQItem, ContactField } from '../types.ts';
import type { AgentPlan } from '../agents/agentPlan.types.ts';
import { AgentPlanEditor } from '../components/agents/AgentPlanEditor.tsx';

interface AgentConfigEditorProps {
  agentId: string;
  onBack: () => void;
  onTest: (agentId: string) => void;
}

export const AgentConfigEditor: React.FC<AgentConfigEditorProps> = ({ agentId, onBack, onTest }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'conversation' | 'faqs' | 'voice' | 'telephony' | 'plan'>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [agent, setAgent] = useState<Agent | null>(null);
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [agentPlan, setAgentPlan] = useState<AgentPlan | null>(null);
  const [inboundPhoneNumber, setInboundPhoneNumber] = useState('');

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'paused' | 'draft'>('active');

  const [greeting, setGreeting] = useState('');
  const [instructions, setInstructions] = useState('');
  const [objectives, setObjectives] = useState('');
  const [faqs, setFaqs] = useState<FAQItem[]>([]);

  const [voiceId, setVoiceId] = useState('');
  const [voiceName, setVoiceName] = useState('');
  const [stability, setStability] = useState(0.5);
  const [similarity, setSimilarity] = useState(0.75);
  const [languages, setLanguages] = useState<string[]>(['en-US']);

  const [maxDuration, setMaxDuration] = useState(300);
  const [transferEnabled, setTransferEnabled] = useState(false);
  const [transferPhone, setTransferPhone] = useState('');
  const [transferConditions, setTransferConditions] = useState('');
  const [callbackInstructions, setCallbackInstructions] = useState('');
  const [contactFields, setContactFields] = useState<ContactField[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await api.getAgent(agentId);
        setAgent(data.agent);
        setInboundPhoneNumber(data.agent.inbound_phone_number || '');
        setConfig(data.config);
        setAgentPlan(data.config?.agent_plan || null);

        setName(data.agent.name);
        setDescription(data.agent.description);
        setStatus(data.agent.status);

        if (data.config) {
          setGreeting(data.config.greeting || '');
          setInstructions(data.config.instructions || '');
          setObjectives(data.config.objectives || '');
          setFaqs(data.config.business_faqs || []);
          setVoiceId(data.config.voice_id || '21m00Tcm4TlvDq8ikWAM');
          setVoiceName(data.config.voice_name || 'Rachel');
          setStability(data.config.voice_settings?.stability ?? 0.5);
          setSimilarity(data.config.voice_settings?.similarity_boost ?? 0.75);
          setLanguages(data.config.supported_languages || ['en-US']);
          setMaxDuration(data.config.max_duration_seconds || 300);
          setTransferEnabled(data.config.transfer_enabled || false);
          setTransferPhone(data.config.transfer_phone || '');
          setTransferConditions(data.config.transfer_conditions || '');
          setCallbackInstructions(data.config.callback_instructions || '');
          setContactFields(data.config.contact_fields_to_collect || []);
        }
      } catch (err: any) {
        setError(err.message || 'Failed loading agent configuration');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [agentId]);

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    setSaveSuccess(false);
    try {
      const structuredPlan = activeTab === 'plan' ? agentPlan : null;
      const nextPlan = structuredPlan
        ? {
            ...structuredPlan,
            voice: {
              ...structuredPlan.voice,
              voiceId,
              voiceName,
              language: languages[0] || structuredPlan.voice.language,
              speakingRate: config?.voice_settings?.speaking_rate ?? structuredPlan.voice.speakingRate,
            },
          }
        : undefined;
      await api.updateAgent(agentId, {
        name: nextPlan?.identity.name || name,
        description: nextPlan?.identity.businessContext || description,
        status,
      });

      const planContactFields: ContactField[] = nextPlan
        ? nextPlan.informationFields.map((field) => {
            const name = `${field.name} ${field.description}`.toLowerCase();
            const type = name.includes('phone') || name.includes('number')
              ? 'phone'
              : name.includes('email')
                ? 'email'
                : name.includes('date') || name.includes('time')
                  ? 'date'
                  : 'text';
            return {
              name: field.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'),
              label: field.description || field.name,
              required: field.required,
              type,
            };
          })
        : contactFields;

      await api.saveAgentConfig(agentId, {
        greeting: nextPlan?.identity.greeting || greeting,
        instructions: nextPlan?.identity.tone || instructions,
        objectives: nextPlan?.objectives.join('\n') || objectives,
        business_faqs: nextPlan?.knowledge.faqs || faqs,
        voice_id: voiceId,
        voice_name: voiceName,
        voice_settings: {
          stability,
          similarity_boost: similarity,
          speaking_rate: config?.voice_settings?.speaking_rate,
        },
        supported_languages: languages,
        max_duration_seconds: maxDuration,
        transfer_enabled: nextPlan?.transfer.enabled ?? transferEnabled,
        transfer_phone: nextPlan?.transfer.destination ?? transferPhone,
        transfer_conditions: nextPlan?.transfer.conditions || transferConditions,
        callback_instructions: nextPlan?.callback.enabled
          ? `Ask permission before scheduling. Confirm date, time, and timezone; record callback status. Ask whether the person is available before attempting transfer. Offer rescheduling if unavailable, stop on opt-out, and stop when the configured limit of ${nextPlan.callback.maxRetries} retries is reached.`
          : callbackInstructions,
        contact_fields_to_collect: planContactFields,
        agent_plan: nextPlan,
      });
      if (nextPlan) {
        setAgentPlan(nextPlan);
        setName(nextPlan.identity.name);
        setDescription(nextPlan.identity.businessContext);
        setGreeting(nextPlan.identity.greeting);
        setInstructions(nextPlan.identity.tone);
        setObjectives(nextPlan.objectives.join('\n'));
        setFaqs(nextPlan.knowledge.faqs);
        setTransferEnabled(nextPlan.transfer.enabled);
        setTransferPhone(nextPlan.transfer.destination);
        setTransferConditions(nextPlan.transfer.conditions);
        setContactFields(planContactFields);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed saving updates');
    } finally {
      setSaving(false);
    }
  };

  const handleDeployInboundAgent = async () => {
    setError(null);
    setDeploying(true);
    try {
      const result = await api.deployInboundAgent(agentId, inboundPhoneNumber);
      setAgent(result.agent);
      setStatus(result.agent.status);
      setInboundPhoneNumber(result.agent.inbound_phone_number || '');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed deploying inbound agent');
    } finally {
      setDeploying(false);
    }
  };

  const handleDeactivateInboundAgent = async () => {
    setError(null);
    setDeploying(true);
    try {
      const result = await api.deactivateInboundAgent(agentId);
      setAgent(result.agent);
      setStatus(result.agent.status);
      setInboundPhoneNumber('');
    } catch (err: any) {
      setError(err.message || 'Failed deactivating inbound agent');
    } finally {
      setDeploying(false);
    }
  };

  const addFaq = () => {
    setFaqs([...faqs, { question: '', answer: '' }]);
  };

  const removeFaq = (index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index));
  };

  const updateFaq = (index: number, key: 'question' | 'answer', val: string) => {
    const updated = [...faqs];
    updated[index][key] = val;
    setFaqs(updated);
  };

  const addField = () => {
    setContactFields([
      ...contactFields,
      { name: `field_${Date.now()}`, label: 'Field Label', required: false, type: 'text' },
    ]);
  };

  const removeField = (index: number) => {
    setContactFields(contactFields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, key: keyof ContactField, val: any) => {
    const updated = [...contactFields];
    updated[index] = { ...updated[index], [key]: val };
    setContactFields(updated);
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading agent editor...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{name || 'Agent Editor'}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Edit conversational rules, instructions, voice tuning, and telephony escalation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Saved successfully
            </span>
          )}
          <button
            onClick={() => onTest(agentId)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors shadow-xs"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Test Agent</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm disabled:opacity-70"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Configuration</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('general')}
          className={`pb-3 px-3 transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'general'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          General & Persona
        </button>
        <button
          onClick={() => setActiveTab('conversation')}
          className={`pb-3 px-3 transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'conversation'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Greeting & Objectives
        </button>
        <button
          onClick={() => setActiveTab('faqs')}
          className={`pb-3 px-3 transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'faqs'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Business FAQs ({faqs.length})
        </button>
        <button
          onClick={() => setActiveTab('voice')}
          className={`pb-3 px-3 transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'voice'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Voice & Tuning
        </button>
        <button
          onClick={() => setActiveTab('telephony')}
          className={`pb-3 px-3 transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'telephony'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Telephony Rules & Data Fields
        </button>
        {agent?.status === 'draft' || agentPlan ? (
          <button
            onClick={() => setActiveTab('plan')}
            className={`pb-3 px-3 transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'plan'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Structured Agent Plan
          </button>
        ) : null}
      </div>

      {/* TAB 1: General & Persona */}
      {activeTab === 'general' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Agent Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Deployment Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'paused' | 'draft')}
                disabled={agent?.status === 'draft'}
                className="mt-1 block w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900"
              >
                <option value="active" disabled>Active (use inbound deployment to activate)</option>
                <option value="paused">Paused (Holding incoming/outbound calls)</option>
                <option value="draft">Draft (Testing only)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Role & Behavior Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* TAB 2: Greeting & Objectives */}
      {activeTab === 'conversation' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Opening Spoken Greeting
            </label>
            <textarea
              rows={2}
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              className="mt-1 block w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Agent Behavioral Instructions
            </label>
            <textarea
              rows={4}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="mt-1 block w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Call Objectives & Conversion Goals
            </label>
            <textarea
              rows={4}
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              className="mt-1 block w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
            />
          </div>
        </div>
      )}

      {/* TAB 3: FAQs */}
      {activeTab === 'faqs' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Business Knowledge FAQs</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Accurate answers for customer questions on pricing, services, and policies.
              </p>
            </div>
            <button
              onClick={addFaq}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add FAQ</span>
            </button>
          </div>

          {faqs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No business FAQs added yet. Click &quot;Add FAQ&quot; to provide company knowledge.
            </div>
          ) : (
            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">FAQ Item #{idx + 1}</span>
                    <button
                      onClick={() => removeFaq(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={faq.question}
                    onChange={(e) => updateFaq(idx, 'question', e.target.value)}
                    placeholder="Customer Question (e.g. What are your opening hours?)"
                    className="block w-full text-xs border border-slate-300 rounded-md p-2 bg-white"
                  />
                  <textarea
                    rows={2}
                    value={faq.answer}
                    onChange={(e) => updateFaq(idx, 'answer', e.target.value)}
                    placeholder="Approved Spoken Answer"
                    className="block w-full text-xs border border-slate-300 rounded-md p-2 bg-white leading-relaxed"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Voice & Tuning */}
      {activeTab === 'voice' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700">ElevenLabs Voice Preset</label>
              <select
                value={voiceId}
                onChange={(e) => {
                  setVoiceId(e.target.value);
                  const nameMap: Record<string, string> = {
                    '21m00Tcm4TlvDq8ikWAM': 'Rachel (Calm & Professional)',
                    pNInz6obpgDQGcFmaJgB: 'Adam (Direct & Friendly)',
                    EXAVITQu4vr4xnSDxMaL: 'Bella (Warm & Expressive)',
                    VR6AewLTigWG4xSOukaG: 'Arnold (Crisp & Authoritative)',
                  };
                  setVoiceName(nameMap[e.target.value] || 'Custom Voice');
                }}
                className="mt-1 block w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900"
              >
                <option value="21m00Tcm4TlvDq8ikWAM">Rachel — Calm & Professional</option>
                <option value="pNInz6obpgDQGcFmaJgB">Adam — Direct & Friendly</option>
                <option value="EXAVITQu4vr4xnSDxMaL">Bella — Warm & Expressive</option>
                <option value="VR6AewLTigWG4xSOukaG">Arnold — Crisp & Authoritative</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Supported Language</label>
              <select
                value={languages[0] || 'en-US'}
                onChange={(e) => setLanguages([e.target.value])}
                className="mt-1 block w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900"
              >
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="en-IN">English (India)</option>
                <option value="hi-IN">Hindi (हिन्दी)</option>
                <option value="es-ES">Spanish (Español)</option>
                <option value="fr-FR">French (Français)</option>
                <option value="de-DE">German (Deutsch)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Voice Stability</label>
                <span className="text-xs font-mono font-bold text-slate-900">{stability}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={stability}
                onChange={(e) => setStability(parseFloat(e.target.value))}
                className="w-full mt-2 accent-indigo-600"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Higher stability ensures consistent tone; lower allows more expressive variance.
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Clarity & Similarity Boost</label>
                <span className="text-xs font-mono font-bold text-slate-900">{similarity}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={similarity}
                onChange={(e) => setSimilarity(parseFloat(e.target.value))}
                className="w-full mt-2 accent-indigo-600"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Controls closeness to target voice character.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Telephony & Data Fields */}
      {activeTab === 'telephony' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          {agent?.agent_type === 'inbound_receptionist' && (
            <section className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Inbound phone deployment</h3>
                <p className="mt-1 text-xs text-slate-600">
                  Assign an Exotel number you already provisioned. This does not purchase a number.
                  Save your agent configuration before activating it.
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Deployment status: <strong>{agent.status}</strong>
                  {agent.inbound_phone_number ? ` · ${agent.inbound_phone_number}` : ' · no number assigned'}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="tel"
                  value={inboundPhoneNumber}
                  onChange={(event) => setInboundPhoneNumber(event.target.value)}
                  placeholder="Provisioned Exotel number (8–15 digits)"
                  disabled={deploying}
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white p-2.5 text-xs"
                />
                <button
                  type="button"
                  onClick={handleDeployInboundAgent}
                  disabled={deploying || !inboundPhoneNumber.trim()}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {deploying ? 'Working…' : 'Assign number & activate'}
                </button>
                {agent.status === 'active' && (
                  <button
                    type="button"
                    onClick={handleDeactivateInboundAgent}
                    disabled={deploying}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
                  >
                    Deactivate
                  </button>
                )}
              </div>
            </section>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Maximum Call Duration (Seconds)
              </label>
              <input
                type="number"
                value={maxDuration}
                onChange={(e) => setMaxDuration(parseInt(e.target.value, 10) || 180)}
                className="mt-1 block w-full text-xs border border-slate-300 rounded-lg p-2.5"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Call Transfer</label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="transferToggle"
                  checked={transferEnabled}
                  onChange={(e) => setTransferEnabled(e.target.checked)}
                  className="rounded text-indigo-600 h-4 w-4"
                />
                <label htmlFor="transferToggle" className="text-xs text-slate-700">
                  Enable live call transfer to human queue
                </label>
              </div>
            </div>
          </div>

          {transferEnabled && (
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Transfer Phone Number
                </label>
                <input
                  type="text"
                  value={transferPhone}
                  onChange={(e) => setTransferPhone(e.target.value)}
                  placeholder="+1 (555) 902-1100"
                  className="mt-1 block w-full text-xs border border-slate-300 rounded p-2 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Transfer Conditions
                </label>
                <input
                  type="text"
                  value={transferConditions}
                  onChange={(e) => setTransferConditions(e.target.value)}
                  className="mt-1 block w-full text-xs border border-slate-300 rounded p-2 bg-white"
                />
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700">Callback Instructions</label>
            <input
              type="text"
              value={callbackInstructions}
              onChange={(e) => setCallbackInstructions(e.target.value)}
              placeholder="e.g. Schedule callback if caller is driving or unavailable"
              className="mt-1 block w-full text-xs border border-slate-300 rounded-lg p-2.5"
            />
          </div>

          {/* Contact Fields */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-slate-700">
                Contact Data Fields to Extract
              </label>
              <button
                type="button"
                onClick={addField}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Extraction Field</span>
              </button>
            </div>

            <div className="space-y-2">
              {contactFields.map((field, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => updateField(idx, 'label', e.target.value)}
                    className="flex-1 text-xs border border-slate-300 rounded p-1.5 bg-white"
                  />
                  <select
                    value={field.type}
                    onChange={(e) => updateField(idx, 'type', e.target.value)}
                    className="text-xs border border-slate-300 rounded p-1.5 bg-white text-slate-700"
                  >
                    <option value="text">Text</option>
                    <option value="phone">Phone</option>
                    <option value="email">Email</option>
                    <option value="date">Date</option>
                  </select>
                  <label className="flex items-center gap-1 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => updateField(idx, 'required', e.target.checked)}
                      className="rounded text-indigo-600 h-3.5 w-3.5"
                    />
                    <span>Required</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => removeField(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {activeTab === 'plan' && (
        agentPlan ? (
          <AgentPlanEditor plan={agentPlan} onChange={setAgentPlan} mode="edit" />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <h2 className="text-base font-semibold text-slate-900">No structured plan saved</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-600">
              This agent was created before the guided wizard. Its existing settings remain editable in the other tabs.
            </p>
          </div>
        )
      )}
    </div>
  );
};
