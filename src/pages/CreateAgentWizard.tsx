import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Zap,
  Layers,
  PhoneCall,
  Volume2,
  Sliders,
  ShieldCheck,
  Plus,
  Trash2,
  Loader2,
} from 'lucide-react';
import { api } from '../api/client.ts';
import { AgentType, ContactField } from '../types.ts';

interface CreateAgentWizardProps {
  onSuccess: (agentId: string) => void;
  onCancel: () => void;
}

export const CreateAgentWizard: React.FC<CreateAgentWizardProps> = ({ onSuccess, onCancel }) => {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [agentType, setAgentType] = useState<AgentType>('inbound_receptionist');
  const [agentName, setAgentName] = useState('Priya — Reception Concierge');
  const [description, setDescription] = useState(
    '24/7 business receptionist answering inquiries, office hours, and booking consultations.'
  );
  const [greeting, setGreeting] = useState(
    'Hello and thank you for calling. My name is Priya, your AI concierge. How may I assist you today?'
  );
  const [instructions, setInstructions] = useState(
    'You are a warm, professional voice receptionist. Answer questions accurately and help callers schedule appointments or connect with our team.'
  );
  const [objectives, setObjectives] = useState(
    '1. Greet caller warmly.\n2. Answer primary business questions.\n3. Collect caller name, phone number, and service needs.\n4. Confirm follow-up or transfer if urgent.'
  );
  const [voiceId, setVoiceId] = useState('21m00Tcm4TlvDq8ikWAM');
  const [voiceName, setVoiceName] = useState('Rachel (Calm & Professional)');
  const [language, setLanguage] = useState('en-US');
  const [maxDuration, setMaxDuration] = useState(300);
  const [transferEnabled, setTransferEnabled] = useState(true);
  const [transferPhone, setTransferPhone] = useState('+1 (555) 902-1100');
  const [transferConditions, setTransferConditions] = useState(
    'Caller asks to speak with a human engineer or urgent billing supervisor.'
  );
  const [callbackInstructions, setCallbackInstructions] = useState(
    'Offer callback within 2 hours if caller is currently driving.'
  );

  const [contactFields, setContactFields] = useState<ContactField[]>([
    { name: 'full_name', label: 'Full Name', required: true, type: 'text' },
    { name: 'phone', label: 'Phone Number', required: true, type: 'phone' },
    { name: 'inquiry_topic', label: 'Inquiry Topic', required: false, type: 'text' },
  ]);

  const handleSelectType = (type: AgentType) => {
    setAgentType(type);
    if (type === 'instant_lead') {
      setAgentName('Rohan — Speed-to-Lead Qualifier');
      setDescription('Instant outbound caller qualifying web form leads within 60 seconds.');
      setGreeting('Hi there! This is Rohan following up on your recent inquiry. Did I catch you at a good time?');
      setVoiceId('pNInz6obpgDQGcFmaJgB');
      setVoiceName('Adam (Direct & Friendly)');
    } else if (type === 'bulk_caller') {
      setAgentName('Tara — Campaign Outreach Agent');
      setDescription('Outbound campaign caller for renewal updates and seasonal announcements.');
      setGreeting('Hello! This is Tara calling on behalf of our team with a brief update on your account.');
      setVoiceId('EXAVITQu4vr4xnSDxMaL');
      setVoiceName('Bella (Warm & Expressive)');
    } else {
      setAgentName('Priya — Reception Concierge');
      setDescription('24/7 business receptionist answering inquiries, office hours, and booking consultations.');
      setGreeting('Hello and thank you for calling. My name is Priya, your AI concierge. How may I assist you today?');
      setVoiceId('21m00Tcm4TlvDq8ikWAM');
      setVoiceName('Rachel (Calm & Professional)');
    }
  };

  const addField = () => {
    setContactFields([
      ...contactFields,
      { name: `field_${Date.now()}`, label: 'Custom Field', required: false, type: 'text' },
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

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const res = await api.createAgent({
        name: agentName,
        agent_type: agentType,
        description,
        status: 'active',
        config: {
          greeting,
          instructions,
          objectives,
          supported_languages: [language],
          voice_id: voiceId,
          voice_name: voiceName,
          max_duration_seconds: maxDuration,
          transfer_enabled: transferEnabled,
          transfer_phone: transferPhone,
          transfer_conditions: transferConditions,
          callback_instructions: callbackInstructions,
          contact_fields_to_collect: contactFields,
        },
      });

      onSuccess(res.agent.id);
    } catch (err: any) {
      setError(err.message || 'Failed to save agent configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Navigation & Progress Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Cancel & Back</span>
        </button>

        {/* Step Indicator */}
        <div className="flex items-center gap-3">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  step === s
                    ? 'bg-indigo-600 text-white'
                    : step > s
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {step > s ? <Check className="w-3.5 h-3.5" /> : s}
              </div>
              <span className="text-xs font-medium text-slate-600 hidden sm:inline">
                {s === 1 ? 'Archetype' : s === 2 ? 'Voice & Speech' : s === 3 ? 'Rules & Fields' : 'Deploy'}
              </span>
              {s < 4 && <div className="w-4 h-px bg-slate-300 hidden sm:block" />}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* STEP 1: Archetype & Job Description */}
      {step === 1 && (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Step 1: Choose Agent Archetype</h2>
            <p className="text-xs text-slate-500 mt-1">
              Select the behavioral model best suited to your operational workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => handleSelectType('inbound_receptionist')}
              className={`p-5 rounded-xl border cursor-pointer transition-all ${
                agentType === 'inbound_receptionist'
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                <PhoneCall className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Inbound AI Receptionist</h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                24/7 front desk assistant. Answers inquiries, schedules consultations, transfers urgent callers.
              </p>
            </div>

            <div
              onClick={() => handleSelectType('instant_lead')}
              className={`p-5 rounded-xl border cursor-pointer transition-all ${
                agentType === 'instant_lead'
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Instant Lead Caller</h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Sub-60s outbound follow-up for web submissions. Qualifies intent and books sales demos.
              </p>
            </div>

            <div
              onClick={() => handleSelectType('bulk_caller')}
              className={`p-5 rounded-xl border cursor-pointer transition-all ${
                agentType === 'bulk_caller'
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Bulk Calling Agent</h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                High-throughput outbound outreach for list campaigns, announcements, and reminders.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Agent Display Name</label>
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="mt-1 block w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Job Description in Natural Language
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 leading-relaxed"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm"
            >
              <span>Next: Voice & Communication</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Voice Persona & Communication */}
      {step === 2 && (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Step 2: Voice Persona & Greeting</h2>
            <p className="text-xs text-slate-500 mt-1">
              Select an ElevenLabs voice model, configure supported language, and craft greeting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Voice Selection (ElevenLabs)</label>
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
                <option value="21m00Tcm4TlvDq8ikWAM">Rachel — Calm & Professional (Female)</option>
                <option value="pNInz6obpgDQGcFmaJgB">Adam — Direct & Energetic (Male)</option>
                <option value="EXAVITQu4vr4xnSDxMaL">Bella — Warm & Empathetic (Female)</option>
                <option value="VR6AewLTigWG4xSOukaG">Arnold — Clear & Authoritative (Male)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Primary Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
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

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Opening Greeting (Spoken first when call is answered)
              </label>
              <textarea
                rows={2}
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                className="mt-1 block w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Core Instructions & Tone
              </label>
              <textarea
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="mt-1 block w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Call Objectives (Concrete business goals to achieve)
              </label>
              <textarea
                rows={3}
                value={objectives}
                onChange={(e) => setObjectives(e.target.value)}
                className="mt-1 block w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 leading-relaxed"
              />
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm"
            >
              <span>Next: Rules & Data Fields</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Rules & Data Fields */}
      {step === 3 && (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Step 3: Call-Handling Rules & Data Extraction</h2>
            <p className="text-xs text-slate-500 mt-1">
              Define maximum call duration, transfer rules, and lead fields the agent should capture.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {Math.round(maxDuration / 60)} minutes maximum per call.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Live Call Transfer
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="transferCheck"
                    checked={transferEnabled}
                    onChange={(e) => setTransferEnabled(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <label htmlFor="transferCheck" className="text-xs text-slate-700">
                    Enable real-time phone transfer
                  </label>
                </div>
              </div>
            </div>

            {transferEnabled && (
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Transfer Destination Number (E.164 format)
                  </label>
                  <input
                    type="text"
                    value={transferPhone}
                    onChange={(e) => setTransferPhone(e.target.value)}
                    placeholder="+1 (555) 902-1100"
                    className="mt-1 block w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Transfer Criteria / Condition
                  </label>
                  <input
                    type="text"
                    value={transferConditions}
                    onChange={(e) => setTransferConditions(e.target.value)}
                    placeholder="When caller asks to speak to human specialist or urgent question"
                    className="mt-1 block w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                  />
                </div>
              </div>
            )}

            {/* Information to Collect Fields */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Contact Information Fields to Collect
                </label>
                <button
                  type="button"
                  onClick={addField}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Field</span>
                </button>
              </div>

              <div className="space-y-2">
                {contactFields.map((field, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateField(idx, 'label', e.target.value)}
                      placeholder="Field Label (e.g. Email)"
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
                    <label className="flex items-center gap-1.5 text-xs text-slate-600">
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

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm"
            >
              <span>Next: Review & Save</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Review & Deploy */}
      {step === 4 && (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Step 4: Review Configuration & Deploy</h2>
            <p className="text-xs text-slate-500 mt-1">
              Verify your agent parameters before saving to persistent database storage.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-6 bg-slate-50 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">
                  {agentType}
                </span>
                <h3 className="text-lg font-bold text-slate-900">{agentName}</h3>
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-100 text-emerald-800">
                Ready to Deploy
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Voice Engine</span>
                <span className="font-semibold text-slate-800">{voiceName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Language</span>
                <span className="font-semibold text-slate-800">{language}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Max Call Time</span>
                <span className="font-semibold text-slate-800">{maxDuration} seconds</span>
              </div>
              <div>
                <span className="text-slate-500 block">Call Transfer</span>
                <span className="font-semibold text-slate-800">
                  {transferEnabled ? `Enabled (${transferPhone})` : 'Disabled'}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200">
              <span className="text-xs text-slate-500 block mb-1">Configured Spoken Greeting:</span>
              <p className="text-xs text-slate-700 italic bg-white p-3 rounded border border-slate-200">
                &quot;{greeting}&quot;
              </p>
            </div>

            <div className="pt-2">
              <span className="text-xs text-slate-500 block mb-1">
                Fields to Extract ({contactFields.length}):
              </span>
              <div className="flex flex-wrap gap-2">
                {contactFields.map((f, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px] text-slate-700"
                  >
                    {f.label} {f.required && '· required'}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(3)}
              disabled={saving}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm disabled:opacity-70"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Save & Deploy AI Employee</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
