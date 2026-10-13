import React, { useState } from 'react';
import {
  Building2,
  PhoneCall,
  Volume2,
  Radio,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Zap,
  Layers,
  Play,
  Pause,
  X,
  Stethoscope,
  Briefcase,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { VoxMitraLogo } from '../common/VoxMitraLogo.tsx';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onNavigateToTesting?: (agentId?: string) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  onNavigateToTesting,
}) => {
  const { business } = useAuth();
  const [step, setStep] = useState<number>(1);

  // Form State
  const [businessName, setBusinessName] = useState(business?.name || 'Apex Health Services');
  const [industry, setIndustry] = useState('healthcare');
  const [operatingCity, setOperatingCity] = useState('Bengaluru (IST)');
  const [selectedArchetype, setSelectedArchetype] = useState<'inbound_receptionist' | 'instant_lead' | 'bulk_caller'>('inbound_receptionist');
  const [selectedVoice, setSelectedVoice] = useState('priya-indian-en');
  const [selectedLanguage, setSelectedLanguage] = useState('en-in-hi');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [telephonyMode, setTelephonyMode] = useState<'sandbox' | 'exotel'>('sandbox');

  if (!isOpen) return null;

  const industries = [
    { id: 'healthcare', label: 'Clinic / Healthcare', icon: Stethoscope, desc: 'Patient appointments & inquiries' },
    { id: 'realestate', label: 'Real Estate Developer', icon: Building2, desc: 'Buyer lead qualification & site visits' },
    { id: 'education', label: 'Education / EdTech', icon: GraduationCap, desc: 'Course inquiries & admissions' },
    { id: 'services', label: 'Professional Services', icon: Briefcase, desc: 'Client intake & consultation booking' },
  ];

  const archetypes = [
    {
      id: 'inbound_receptionist' as const,
      name: 'Priya — 24/7 Inbound Receptionist',
      icon: PhoneCall,
      color: 'text-blue-500 bg-blue-50 border-blue-200',
      description: 'Answers customer phone calls on the 1st ring, answers clinic/business FAQs, books appointments, and captures lead contact info.',
      bestFor: 'Never miss an inbound customer inquiry, even after hours.',
    },
    {
      id: 'instant_lead' as const,
      name: 'Rohan — Speed-to-Lead Qualifier',
      icon: Zap,
      color: 'text-amber-500 bg-amber-50 border-amber-200',
      description: 'Dials web inquiries within 60 seconds of form submission. Qualifies budget, intent, and location before routing to sales.',
      bestFor: '10x increase in lead connection rate vs manual callbacks.',
    },
    {
      id: 'bulk_caller' as const,
      name: 'Tara — Outbound Outreach Specialist',
      icon: Layers,
      color: 'text-purple-500 bg-purple-50 border-purple-200',
      description: 'Runs scheduled outbound notification calls for appointment reminders, event invitations, customer surveys, and payment follow-ups.',
      bestFor: 'Automate hundreds of customer updates concurrently.',
    },
  ];

  const handleFinish = () => {
    localStorage.setItem('voxmitra_onboarding_completed', 'true');
    onComplete();
    if (onNavigateToTesting) {
      onNavigateToTesting();
    } else {
      onClose();
    }
  };

  const toggleSampleAudio = () => {
    setIsPlayingAudio((prev) => !prev);
    // Auto stop after 3.5s simulation
    setTimeout(() => {
      setIsPlayingAudio(false);
    }, 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <VoxMitraLogo size="sm" showWordmark={true} />
            <span className="text-xs text-slate-400 font-medium pl-2 border-l border-slate-800">
              Workspace Setup Guide
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-mono">
              Step {step} of 4
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step Progress Bar */}
        <div className="h-1 bg-slate-100 w-full flex">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Body Content */}
        <div className="p-6 sm:p-8 flex-1 overflow-y-auto space-y-6">
          {/* STEP 1: Business Profile */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <span className="text-xs font-semibold text-blue-600 tracking-wider uppercase">
                  Step 1: Your Business Profile
                </span>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                  How should your AI Employee represent you?
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Your AI employee speaks as a trusted member of your team using this business context.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Business / Clinic Name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Apex Dental & Specialty Clinic"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Industry Domain
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {industries.map((item) => {
                      const Icon = item.icon;
                      const selected = industry === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setIndustry(item.id)}
                          className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                            selected
                              ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600 text-slate-900'
                              : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                          }`}
                        >
                          <div className={`p-2 rounded-lg ${selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{item.label}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Primary Operational City / Timezone
                  </label>
                  <input
                    type="text"
                    value={operatingCity}
                    onChange={(e) => setOperatingCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Choose AI Employee Archetype */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <span className="text-xs font-semibold text-blue-600 tracking-wider uppercase">
                  Step 2: Choose First Voice Employee
                </span>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                  Select your primary conversational archetype
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  You can deploy additional AI employees anytime from the dashboard.
                </p>
              </div>

              <div className="space-y-3">
                {archetypes.map((arch) => {
                  const Icon = arch.icon;
                  const isSelected = selectedArchetype === arch.id;
                  return (
                    <div
                      key={arch.id}
                      onClick={() => setSelectedArchetype(arch.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg border ${arch.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                              {arch.name}
                              {isSelected && (
                                <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-semibold">
                                  Selected
                                </span>
                              )}
                            </h3>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                              {arch.description}
                            </p>
                            <p className="text-[11px] text-blue-700 font-medium mt-2 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-blue-600" />
                              <span>{arch.bestFor}</span>
                            </p>
                          </div>
                        </div>

                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-1 ${
                          isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Voice & Language */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <span className="text-xs font-semibold text-blue-600 tracking-wider uppercase">
                  Step 3: Voice & Language Persona
                </span>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                  How should your voice employee sound?
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Powered by ElevenLabs ultra-low latency speech models tuned for Indian business communication.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Speech & Accent Persona
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedVoice('priya-indian-en')}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        selectedVoice === 'priya-indian-en'
                          ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">Priya — Empathetic & Warm</span>
                        <span className="text-[10px] text-blue-600 bg-blue-100/70 font-semibold px-1.5 py-0.5 rounded">
                          Recommended
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Professional Indian English with gentle cadence. Ideal for clinics, luxury real estate & customer care.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedVoice('rohan-executive')}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        selectedVoice === 'rohan-executive'
                          ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">Rohan — Crisp & Authoritative</span>
                        <span className="text-[10px] text-slate-600 bg-slate-100 font-semibold px-1.5 py-0.5 rounded">
                          Sales Focused
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Confident, articulate tone. Ideal for lead qualification, commercial sales & admissions.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Sample Audio Test Box */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={toggleSampleAudio}
                      className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors shadow-sm"
                    >
                      {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {isPlayingAudio ? 'Playing Greeting Sample...' : 'Listen to Voice Persona'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        &quot;Namaste, thank you for calling {businessName}. How may I assist you today?&quot;
                      </p>
                    </div>
                  </div>

                  {isPlayingAudio && (
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-3 bg-blue-600 animate-pulse" />
                      <div className="w-1 h-5 bg-blue-600 animate-pulse delay-75" />
                      <div className="w-1 h-4 bg-blue-600 animate-pulse delay-150" />
                      <div className="w-1 h-2 bg-blue-600 animate-pulse" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Primary Language Support
                  </label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-hidden"
                  >
                    <option value="en-in-hi">English (Indian Accent) + Hindi (Bilingual Automatic)</option>
                    <option value="hi-pure">Hindi (Formal & Conversational)</option>
                    <option value="en-in">English (Indian Accent Only)</option>
                    <option value="tamil-en">Tamil + English (Regional Dual-Model)</option>
                    <option value="telugu-en">Telugu + English (Regional Dual-Model)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Telephony & Verification */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <span className="text-xs font-semibold text-blue-600 tracking-wider uppercase">
                  Step 4: Telephony Connection
                </span>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                  Connect phone numbers or test right in your browser
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  VoxMitra supports interactive browser mic testing without paying carrier fees, as well as live Exotel Indian SIP trunks.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => setTelephonyMode('sandbox')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    telephonyMode === 'sandbox'
                      ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900">Interactive Browser Sandbox</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
                      Ready Instantly
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Test speaking to your AI employee through your computer microphone. Inspect live speech-to-text, entity extraction, and objection handling.
                  </p>
                </div>

                <div
                  onClick={() => setTelephonyMode('exotel')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    telephonyMode === 'exotel'
                      ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900">Exotel Indian Telecom (DID)</span>
                    <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-semibold">
                      Production Ready
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Connect your verified Indian virtual line (e.g. +91 80 4712...) to answer real phone calls from customers and execute outbound campaigns.
                  </p>
                </div>
              </div>

              {/* Ready Confirmation Card */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Your AI Employee is configured and ready!</p>
                  <p className="mt-0.5 text-emerald-800 leading-relaxed">
                    We have loaded {businessName} into memory. Click &quot;Launch to Dashboard&quot; to test your agent live or manage call records.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 py-2 px-3 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-500 hover:text-slate-700 font-medium"
            >
              Skip for now
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 py-2.5 px-5 rounded-xl shadow-xs transition-all"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 py-2.5 px-6 rounded-xl shadow-sm transition-all"
            >
              <span>Launch to Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
