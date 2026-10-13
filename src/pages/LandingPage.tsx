import React, { useState } from 'react';
import {
  PhoneCall,
  Zap,
  Volume2,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Play,
  Pause,
  Layers,
  Sparkles,
  ChevronDown,
  Building2,
  Stethoscope,
  GraduationCap,
  ShoppingBag,
  UtensilsCrossed,
  Briefcase,
  TrendingUp,
  Clock,
  Database,
  Calendar,
  Lock,
  Headphones,
  Sliders,
  Filter,
  BarChart2,
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar.tsx';
import { VoxMitraLogo } from '../components/common/VoxMitraLogo.tsx';
import { BookDemoModal } from '../components/modals/BookDemoModal.tsx';
import { HeroVoiceMockup } from '../components/home/HeroVoiceMockup.tsx';
import { InteractiveProductTabs } from '../components/home/InteractiveProductTabs.tsx';

interface LandingPageProps {
  onNavigate: (page: string) => void;
  isAuthenticated: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, isAuthenticated }) => {
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // Voice Preview Interactive State
  const [voiceTone, setVoiceTone] = useState('Professional & Calm');
  const [voiceLang, setVoiceLang] = useState('English (Indian Accent)');
  const [voiceStability, setVoiceStability] = useState(0.65);
  const [isVoiceTesting, setIsVoiceTesting] = useState(false);

  // Analytics Filter State
  const [analyticsRange, setAnalyticsRange] = useState('Last 30 Days');

  const faqs = [
    {
      q: 'How does VoxMitra connect to Indian telephone lines and Exotel?',
      a: 'VoxMitra integrates natively through a modular telephony adapter layer supporting Exotel REST APIs and SIP trunks. You connect your verified Indian virtual numbers (e.g. +91 80...) directly on the server. Inbound calls are routed to our low-latency voice pipeline, and outbound leads are dialed with carrier caller-ID verification.',
    },
    {
      q: 'How are Hindi, Hinglish, and regional Indian languages supported?',
      a: 'Language capabilities depend on the underlying speech-to-text (STT) and text-to-speech (TTS) engines configured. VoxMitra supports Indian-accented English, standard Hindi, and common Hinglish phrasing through ElevenLabs and Google speech models. Regional languages like Telugu, Tamil, and Kannada are supported on specific models and must always be tested against your specific vocabulary before production rollout.',
    },
    {
      q: 'What happens when a caller asks for a human manager or doctor?',
      a: 'You can configure programmable live transfer rules. When an inquiry matches critical criteria (e.g., patient emergency, complex dispute, high-value commercial lead), VoxMitra executes an immediate warm SIP transfer to your executive phone number with a summary of the conversation.',
    },
    {
      q: 'Can we test our agent without connecting real telephony numbers?',
      a: 'Yes, absolutely. The built-in Interactive Voice Testing Lab allows you to have voice conversations directly in your browser using your microphone. You can evaluate speech cadence, objection handling, and CRM field extraction before incurring any carrier fees.',
    },
    {
      q: 'How is customer data and call recording privacy protected?',
      a: 'VoxMitra employs multi-tenant isolation with PostgreSQL Row-Level Security (RLS). All telephony credentials, API secrets, and call recordings are kept server-side and never exposed to the client. Audio streams are encrypted in transit and at rest.',
    },
    {
      q: 'Are the pricing plans final or provisional?',
      a: 'The plans listed below are provisional estimates based on expected cloud compute and carrier telephony tariffs. Actual invoice costs reflect your exact PSTN minute consumption from telecom providers (e.g. Exotel) and speech model usage.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* 1. STICKY NAVIGATION */}
      <Navbar
        onNavigate={onNavigate}
        currentPage="landing"
        isAuthenticated={isAuthenticated}
        onOpenBookDemo={() => setDemoModalOpen(true)}
      />

      {/* 2. HERO SECTION */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden border-b border-slate-900 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-indigo-600/15 via-violet-600/10 to-sky-500/10 blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-4xl mx-auto space-y-6">
            {/* Tagline / Eyebrow */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-medium text-slate-300 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span>Next-Gen Enterprise Voice Automation</span>
              <span className="text-slate-600">/</span>
              <span className="text-indigo-400 font-semibold">From Every Call to a Business Opportunity</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.08] text-balance">
              Every call answered.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-400 to-violet-400">
                Every opportunity captured.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              VoxMitra empowers Indian clinics, real estate firms, educational institutes, and sales teams
              with autonomous AI voice employees. Handle 24/7 reception, sub-minute lead qualification,
              and bulk outreach with human fluency.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <button
                onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'register')}
                className="px-6 py-3.5 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2"
              >
                <span>Deploy Your First Voice Employee</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDemoModalOpen(true)}
                className="px-6 py-3.5 text-xs sm:text-sm font-semibold text-slate-200 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl transition-colors flex items-center gap-2"
              >
                <PhoneCall className="w-4 h-4 text-indigo-400" />
                <span>Book a Guided Walkthrough</span>
              </button>
            </div>

            {/* Trust and Key Operational Proof */}
            <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto text-left border-t border-slate-900/80">
              <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/80">
                <p className="text-2xl font-bold font-mono text-white tabular-nums">&lt;60s</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Speed-to-lead outbound dial</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/80">
                <p className="text-2xl font-bold font-mono text-white tabular-nums">0s</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Customer hold time</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/80">
                <p className="text-2xl font-bold font-mono text-white tabular-nums">12+</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Multilingual speech models</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/80">
                <p className="text-2xl font-bold font-mono text-white tabular-nums">100%</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Automated CRM field extraction</p>
              </div>
            </div>
          </div>

          {/* 3. INTERACTIVE VOICE-AGENT PRODUCT MOCKUP */}
          <div className="mt-14 max-w-5xl mx-auto">
            <HeroVoiceMockup />
          </div>
        </div>
      </section>

      {/* 4. FOUR PRODUCT CAPABILITIES */}
      <section id="capabilities" className="py-24 bg-slate-950 border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mb-16">
            <span className="text-xs font-mono uppercase tracking-wider text-indigo-400">
              Core Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-2">
              Four Specialized Voice Workforce Archetypes
            </h2>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              Every workflow has unique conversation mechanics. Configure purpose-built AI agents tailored
              for incoming calls, outbound conversions, high-volume broadcasting, and continuous follow-up.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Capability 1 */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-700/50 flex items-center justify-center text-indigo-400 mb-5">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">AI Receptionist</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  24/7 business triage with zero hold times. Answers operational inquiries, addresses FAQs,
                  schedules branch appointments, and forwards priority calls.
                </p>
                <ul className="mt-6 space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Clinic & salon booking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Custom business FAQ sync</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Warm SIP transfer support</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => onNavigate('create-agent')}
                className="mt-8 text-xs font-semibold text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1.5"
              >
                Configure Receptionist <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Capability 2 */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors">
              <div>
                <div className="w-10 h-10 rounded-xl bg-sky-950 border border-sky-700/50 flex items-center justify-center text-sky-400 mb-5">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Instant Lead Caller</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Contacts prospective leads within 60 seconds of web form submission. Validates buying
                  budget, answers early questions, and locks in sales demos.
                </p>
                <ul className="mt-6 space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Sub-60s webhook dispatch</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Budget & timeline scoring</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Google Calendar sync</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => onNavigate('create-agent')}
                className="mt-8 text-xs font-semibold text-sky-400 hover:text-sky-300 inline-flex items-center gap-1.5"
              >
                Configure Lead Caller <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Capability 3 */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors">
              <div>
                <div className="w-10 h-10 rounded-xl bg-violet-950 border border-violet-700/50 flex items-center justify-center text-violet-400 mb-5">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Bulk Calling Campaigns</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Executes high-throughput outbound lists for insurance renewals, fee payment alerts,
                  event attendance checks, and customer feedback.
                </p>
                <ul className="mt-6 space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>CSV contact spreadsheet upload</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Concurrent telecom dialing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>TRAI calling window limits</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => onNavigate('create-agent')}
                className="mt-8 text-xs font-semibold text-violet-400 hover:text-violet-300 inline-flex items-center gap-1.5"
              >
                Configure Bulk Agent <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Capability 4 */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-700/50 flex items-center justify-center text-emerald-400 mb-5">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Smart Follow-ups</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Recovers missed calls, conducts post-visit wellness check-ins, and contacts abandoned
                  leads with structured multi-attempt retry schedules.
                </p>
                <ul className="mt-6 space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Instant missed-call recovery</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Automated SMS follow-up links</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Intelligent callback queue</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => onNavigate('create-agent')}
                className="mt-8 text-xs font-semibold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1.5"
              >
                Configure Follow-ups <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. INTERACTIVE PRODUCT PREVIEW */}
      <section id="preview" className="py-24 bg-slate-900/60 border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-mono uppercase tracking-wider text-sky-400">
              Interactive Product Console
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-2">
              Experience the Operator Environment
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              Toggle between actual product views to see how VoxMitra manages receptionists, lead dialers,
              bulk campaigns, and outcome analytics.
            </p>
          </div>

          <InteractiveProductTabs />
        </div>
      </section>

      {/* 6. FOUR-STEP SETUP WORKFLOW */}
      <section className="py-24 bg-slate-950 border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mb-16">
            <span className="text-xs font-mono uppercase tracking-wider text-indigo-400">
              Deployment Lifecycle
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-2">
              From Configuration to Live Dialing in 4 Steps
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              No machine learning engineering required. Set up an enterprise voice employee using intuitive
              forms, test in your browser, and link to your carrier.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
              <span className="text-2xl font-bold font-mono text-indigo-400">01</span>
              <h3 className="text-base font-bold text-white">Select Archetype & Role</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Choose between Inbound Receptionist, Speed-to-Lead, or Bulk Campaign. Define objectives and
                tone in natural plain English.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
              <span className="text-2xl font-bold font-mono text-sky-400">02</span>
              <h3 className="text-base font-bold text-white">Train FAQs & Data Fields</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Input your clinic hours, pricing, and branch details. Specify what contact fields the agent
                must capture during speech.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
              <span className="text-2xl font-bold font-mono text-violet-400">03</span>
              <h3 className="text-base font-bold text-white">Tune Voice & Test Sandbox</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Select from ElevenLabs voice models and test speech live in your web browser with zero phone
                costs or setup friction.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
              <span className="text-2xl font-bold font-mono text-emerald-400">04</span>
              <h3 className="text-base font-bold text-white">Connect Telecom Trunk</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Wire Exotel SIP credentials to connect your verified Indian virtual numbers and start
                receiving and making live customer phone calls.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. VOICE AND LANGUAGE CONFIGURATION SECTION */}
      <section id="voices" className="py-24 bg-slate-900/60 border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs font-mono uppercase tracking-wider text-indigo-400">
                Acoustic & Multilingual Engine
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
                Natural Cadence Tailored for Indian Businesses
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Conversational phone calls require natural pacing, micro-pauses, and clear pronunciation.
                VoxMitra bridges high-quality ElevenLabs voice synthesis with low-latency conversational reasoning.
              </p>

              {/* Honest Language Evaluation Callout */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 space-y-2">
                <p className="font-semibold text-slate-200">
                  Multilingual Evaluation & Testing Disclosure:
                </p>
                <p className="leading-relaxed">
                  Speech recognition and synthesis fidelity vary by language and domain terminology.
                  Indian English and standard Hindi deliver strong conversational performance.
                  Hinglish phrasing and regional languages (Tamil, Telugu, Kannada, Bengali) depend on the
                  selected model backend and must be tested using your specific terminology before live deployment.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 text-xs font-mono">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block">Supported Accents:</span>
                  <span className="text-white font-medium">Indian English, UK, US</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block">Speech Pipeline:</span>
                  <span className="text-indigo-400 font-medium">ElevenLabs + Gemini 2.5</span>
                </div>
              </div>
            </div>

            {/* Interactive Voice Tuning Card */}
            <div className="lg:col-span-6 bg-slate-950 p-6 md:p-8 rounded-2xl border border-slate-800 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-base font-bold text-white">Voice Model Controls</h3>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                  ElevenLabs Engine
                </span>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Voice Personality</label>
                  <select
                    value={voiceTone}
                    onChange={(e) => setVoiceTone(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="Professional & Calm">Priya — Professional & Calm (Clinic Reception)</option>
                    <option value="Direct & Persuasive">Rohan — Energetic & Direct (Real Estate Lead Dial)</option>
                    <option value="Warm & Empathetic">Tara — Empathetic & Polite (Customer Care / Renewal)</option>
                    <option value="Clear & Authoritative">Vikram — Crisp & Authoritative (Corporate Dispatch)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Target Language / Locale</label>
                  <select
                    value={voiceLang}
                    onChange={(e) => setVoiceLang(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="English (Indian Accent)">English (Indian Accent - en-IN)</option>
                    <option value="Hindi (Conversational)">Hindi (हिन्दी - hi-IN)</option>
                    <option value="English (US)">English (US - en-US)</option>
                    <option value="Spanish">Spanish (Español - es-ES)</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-300 font-medium">Stability & Consistency</span>
                    <span className="font-mono text-indigo-400">{voiceStability}</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="0.9"
                    step="0.05"
                    value={voiceStability}
                    onChange={(e) => setVoiceStability(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                  <span className="text-[11px] text-slate-500">
                    Balances predictable tone with expressive vocal modulation.
                  </span>
                </div>

                {/* Test Speech Sample Player */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                  <button
                    onClick={() => {
                      setIsVoiceTesting(!isVoiceTesting);
                      if (!isVoiceTesting && 'speechSynthesis' in window) {
                        const u = new SpeechSynthesisUtterance('Namaste! This is Priya from VoxMitra. How can I help your business today?');
                        window.speechSynthesis.speak(u);
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    {isVoiceTesting ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>Preview Voice</span>
                  </button>
                  <span className="text-[11px] text-slate-400 font-mono truncate">
                    &quot;Namaste! This is Priya from VoxMitra...&quot;
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. INDUSTRY SOLUTIONS */}
      <section id="industries" className="py-24 bg-slate-950 border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mb-16">
            <span className="text-xs font-mono uppercase tracking-wider text-indigo-400">
              Tailored Industry Solutions
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-2">
              Built for High-Call-Volume Indian Sectors
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              Every vertical requires specific compliance, terminology, and CRM integration workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Industry 1: Clinics & Healthcare */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-700/50 flex items-center justify-center text-emerald-400">
                <Stethoscope className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Clinics & Healthcare</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Handles patient appointment bookings, doctor consultation timings, test result inquiry
                triage, and pre-visit fasting instructions with zero reception hold time.
              </p>
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300 font-mono">
                Key Integration: Practo, Google Calendar, SMS Reminders
              </div>
            </div>

            {/* Industry 2: Real Estate */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-700/50 flex items-center justify-center text-indigo-400">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Real Estate & Developers</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Instant outbound dials for 99acres and MagicBricks leads. Qualifies 2BHK/3BHK budget,
                possession urgency, and schedules on-site model apartment visits.
              </p>
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300 font-mono">
                Key Integration: LeadSquared, Sell.Do, WhatsApp Catalog
              </div>
            </div>

            {/* Industry 3: Education & Coaching */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-sky-950 border border-sky-700/50 flex items-center justify-center text-sky-400">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Education & EdTech</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Qualifies course admissions, explains curriculum batches and fee structures, and confirms
                student attendance for weekend counseling webinars.
              </p>
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300 font-mono">
                Key Integration: Zoho CRM, Zoom, Razorpay Link
              </div>
            </div>

            {/* Industry 4: Retail & D2C */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-violet-950 border border-violet-700/50 flex items-center justify-center text-violet-400">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Retail & D2C E-commerce</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automated Cash-on-Delivery (COD) address verification calls, shipment tracking inquiries,
                and return policy explanations.
              </p>
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300 font-mono">
                Key Integration: Shopify, Shiprocket, Delhivery Webhook
              </div>
            </div>

            {/* Industry 5: Hospitality & Travel */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-700/50 flex items-center justify-center text-amber-400">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Hospitality & Dining</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Takes table reservations, confirms guest banquet headcounts, and answers dietary or parking
                inquiries during busy dinner rush hours.
              </p>
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300 font-mono">
                Key Integration: Dineout, POS Systems, WhatsApp Bot
              </div>
            </div>

            {/* Industry 6: Financial Services & Agencies */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-700/50 flex items-center justify-center text-rose-400">
                <Briefcase className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Financial & Agencies</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Follows up on loan documentation, policy renewals, payment schedules, and schedules
                executive wealth-consultation calls.
              </p>
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300 font-mono">
                Key Integration: Salesforce, Exotel Secure Trunk, Webhooks
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. ANALYTICS DASHBOARD PREVIEW */}
      <section className="py-24 bg-slate-900/50 border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">
                Operational Telemetry
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-white mt-1">
                Executive Analytics & Outcome Distribution
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                Monitor call volumes, resolution speed, and extracted business opportunities across your fleet.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono">
                {['Today', 'Last 7 Days', 'Last 30 Days'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setAnalyticsRange(range)}
                    className={`px-3 py-1 rounded transition-colors ${
                      analyticsRange === range
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
              <span className="text-[11px] font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                Sample Operational Data
              </span>
            </div>
          </div>

          <div className="bg-slate-950 p-6 md:p-8 rounded-2xl border border-slate-800 shadow-2xl space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-xs">Total Conversations</span>
                <p className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">4,812</p>
                <span className="text-[11px] text-emerald-400 font-mono mt-1 block">
                  ↑ 18.4% vs previous period
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-xs">Average Resolution Time</span>
                <p className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">1m 18s</p>
                <span className="text-[11px] text-sky-400 font-mono mt-1 block">
                  Sub-90s concise dialogues
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-xs">Goal Conversion Rate</span>
                <p className="text-2xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">74.2%</p>
                <span className="text-[11px] text-slate-400 font-mono mt-1 block">
                  Appointments & leads locked
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-xs">Live Escalation Rate</span>
                <p className="text-2xl font-bold font-mono text-indigo-400 mt-1 tabular-nums">6.8%</p>
                <span className="text-[11px] text-slate-400 font-mono mt-1 block">
                  Transferred to human desk
                </span>
              </div>
            </div>

            {/* Outcome Breakdown Bar */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-white">Call Outcome Distribution</span>
                <span className="text-slate-400 font-mono">Sample Population: 4,812 Calls</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 rounded-full bg-slate-950 flex overflow-hidden">
                <div style={{ width: '58%' }} className="bg-emerald-500" title="Completed Appointment" />
                <div style={{ width: '22%' }} className="bg-sky-500" title="FAQ Answered" />
                <div style={{ width: '13%' }} className="bg-amber-500" title="Callback Queued" />
                <div style={{ width: '7%' }} className="bg-rose-500" title="Transferred to Human" />
              </div>

              <div className="flex flex-wrap gap-4 text-[11px] font-mono text-slate-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Appointment Booked (58%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  FAQ Answered (22%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Callback Scheduled (13%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Transferred to Staff (7%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. INTEGRATION CATEGORIES */}
      <section id="integrations" className="py-24 bg-slate-950 border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mb-16">
            <span className="text-xs font-mono uppercase tracking-wider text-indigo-400">
              Ecosystem & Connectivity
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-2">
              Fits Seamlessly into Your Telecom & CRM Stack
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              VoxMitra acts as an intelligent orchestration layer connecting carrier trunks, speech models,
              CRMs, and scheduling calendars.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {/* Category 1 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <span className="text-[11px] font-mono uppercase text-indigo-400">01. Telephony</span>
              <h3 className="text-sm font-bold text-white">Carriers & Trunks</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect Exotel, Tata Tele, Twilio, or standard SIP Trunks with virtual number verification.
              </p>
            </div>

            {/* Category 2 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <span className="text-[11px] font-mono uppercase text-sky-400">02. Speech AI</span>
              <h3 className="text-sm font-bold text-white">Synthesis & Models</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                ElevenLabs Conversational AI, Deepgram Nova, and Google Gemini 2.5 for reasoning.
              </p>
            </div>

            {/* Category 3 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <span className="text-[11px] font-mono uppercase text-emerald-400">03. CRMs</span>
              <h3 className="text-sm font-bold text-white">Lead Databases</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Zoho CRM, LeadSquared, HubSpot, Salesforce, and direct PostgreSQL database sync.
              </p>
            </div>

            {/* Category 4 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <span className="text-[11px] font-mono uppercase text-violet-400">04. Calendars</span>
              <h3 className="text-sm font-bold text-white">Booking Engines</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Google Calendar, Calendly, Microsoft Outlook, and custom clinic reservation APIs.
              </p>
            </div>

            {/* Category 5 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <span className="text-[11px] font-mono uppercase text-amber-400">05. Automation</span>
              <h3 className="text-sm font-bold text-white">Webhooks & Alerts</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Zapier, Make, custom JSON Webhooks, and instant WhatsApp / SMS confirmations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 11. PRICING COMPARISON */}
      <section id="pricing" className="py-24 bg-slate-900/60 border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono uppercase tracking-wider text-indigo-400">
              Transparent Investment
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-2">
              Simple Usage-Aligned Pricing Plans
            </h2>
            <p className="text-slate-400 text-xs mt-2">
              Provisional pricing — actual tariffs depend on telephony carrier minute costs and speech models.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Tier 1 */}
            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono text-slate-400 uppercase">Starter</span>
                <h3 className="text-xl font-bold text-white mt-1">Single Location</h3>
                <p className="text-xs text-slate-400 mt-2">
                  Ideal for solo clinics, boutique studios, and individual agents.
                </p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold font-mono text-white tabular-nums">₹3,999</span>
                  <span className="text-xs text-slate-400">/month (provisional)</span>
                </div>
                <ul className="mt-8 space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>250 Included calling minutes / month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>1 Active AI Voice Employee</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Interactive Browser Testing Sandbox</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Full call transcripts & CRM export</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => onNavigate('register')}
                className="mt-8 w-full py-2.5 px-4 text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors"
              >
                Start Starter Plan
              </button>
            </div>

            {/* Tier 2 (Highlighted) */}
            <div className="p-8 rounded-2xl bg-slate-950 border-2 border-indigo-500 relative flex flex-col justify-between shadow-2xl shadow-indigo-500/10">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-[10px] font-mono uppercase tracking-wider font-bold text-indigo-200 bg-indigo-600 rounded-full">
                Most Popular for Indian SMBs
              </span>

              <div>
                <span className="text-xs font-mono text-indigo-400 uppercase">Growth</span>
                <h3 className="text-xl font-bold text-white mt-1">Scaling Teams</h3>
                <p className="text-xs text-slate-400 mt-2">
                  For active multi-doctor clinics, real estate sales, and coaching firms.
                </p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold font-mono text-white tabular-nums">₹14,999</span>
                  <span className="text-xs text-slate-400">/month (provisional)</span>
                </div>
                <ul className="mt-8 space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>1,200 Included calling minutes / month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Up to 5 AI Voice Employees</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Exotel SIP Trunk & Caller ID connect</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Live warm call transfer to staff</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Zoho, LeadSquared, Webhook sync</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => onNavigate('register')}
                className="mt-8 w-full py-2.5 px-4 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl transition-all shadow-md"
              >
                Start Growth Plan
              </button>
            </div>

            {/* Tier 3 */}
            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono text-slate-400 uppercase">Scale / Enterprise</span>
                <h3 className="text-xl font-bold text-white mt-1">High Volume Centers</h3>
                <p className="text-xs text-slate-400 mt-2">
                  For large developers, hospital chains, and high-concurrency BPOs.
                </p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold font-mono text-white tabular-nums">Custom</span>
                  <span className="text-xs text-slate-400">/ tailored SLA</span>
                </div>
                <ul className="mt-8 space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Custom minute pool & enterprise trunk</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Unlimited AI Voice Employees</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Private carrier SIP trunk & dedicated IP</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Custom voice cloning & dedicated trainer</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => setDemoModalOpen(true)}
                className="mt-8 w-full py-2.5 px-4 text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors"
              >
                Contact Enterprise
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 12. DETAILED FAQ ACCORDION */}
      <section id="faqs" className="py-24 bg-slate-950 border-b border-slate-900">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-mono uppercase tracking-wider text-indigo-400">
              Clear Answers
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-white mt-1">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Everything you need to know about implementation, telecom carriers, and compliance.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 text-sm font-semibold text-slate-200 hover:text-white"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                      expandedFaq === idx ? 'rotate-180 text-indigo-400' : ''
                    }`}
                  />
                </button>
                {expandedFaq === idx && (
                  <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-slate-800/80 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 13. STRONG FINAL CTA */}
      <section className="py-20 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-b border-slate-900 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-6 relative z-10">
          <VoxMitraLogo size="lg" className="justify-center mb-2" />
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white max-w-2xl mx-auto text-balance">
            Stop losing qualified business leads to missed telephone calls.
          </h2>
          <p className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            Deploy an autonomous AI employee that answers within one ring, books calendar slots, and
            keeps your sales pipeline full around the clock.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'register')}
              className="px-6 py-3.5 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl shadow-xl shadow-indigo-600/30 transition-all flex items-center gap-2"
            >
              <span>Get Started with VoxMitra</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDemoModalOpen(true)}
              className="px-6 py-3.5 text-xs sm:text-sm font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors"
            >
              Request a Custom Demo Call
            </button>
          </div>
        </div>
      </section>

      {/* 14. FULL FOOTER */}
      <footer className="py-14 bg-slate-950 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-slate-900">
          <div className="md:col-span-5 space-y-4">
            <VoxMitraLogo size="md" />
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              VoxMitra is a self-service AI voice employee platform for businesses. From every call to a
              business opportunity. Serving clinics, real estate developers, educational institutes, and
              revenue operations across India.
            </p>
            <div className="text-[11px] font-mono text-slate-500">
              Platform Architecture: Exotel Adapter · ElevenLabs · Multi-Tenant PostgreSQL RLS
            </div>
          </div>

          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div>
              <p className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Product</p>
              <ul className="space-y-2 text-xs">
                <li><a href="#capabilities" className="hover:text-white transition-colors">AI Receptionist</a></li>
                <li><a href="#capabilities" className="hover:text-white transition-colors">Speed-to-Lead Caller</a></li>
                <li><a href="#capabilities" className="hover:text-white transition-colors">Bulk Campaigns</a></li>
                <li><a href="#preview" className="hover:text-white transition-colors">Testing Sandbox</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing Matrix</a></li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Industries</p>
              <ul className="space-y-2 text-xs">
                <li><a href="#industries" className="hover:text-white transition-colors">Healthcare & Clinics</a></li>
                <li><a href="#industries" className="hover:text-white transition-colors">Real Estate & Developers</a></li>
                <li><a href="#industries" className="hover:text-white transition-colors">Education & EdTech</a></li>
                <li><a href="#industries" className="hover:text-white transition-colors">Retail & D2C</a></li>
                <li><a href="#industries" className="hover:text-white transition-colors">Hospitality & Dining</a></li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Company & Legal</p>
              <ul className="space-y-2 text-xs">
                <li><button onClick={() => setDemoModalOpen(true)} className="hover:text-white transition-colors text-left">Book Consultation</button></li>
                <li><a href="#faqs" className="hover:text-white transition-colors">Telecom FAQ</a></li>
                <li><span className="text-slate-500">Privacy Policy (Placeholder)</span></li>
                <li><span className="text-slate-500">Terms of Service (Placeholder)</span></li>
                <li><span className="text-slate-500">TRAI Telephony Policy</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© 2026 VoxMitra Technologies Pvt. Ltd. All rights reserved.</p>
          <p className="font-mono">Engineered for Sovereign Business Telephony in India & Global Markets.</p>
        </div>
      </footer>

      {/* Book a Demo Modal */}
      <BookDemoModal isOpen={demoModalOpen} onClose={() => setDemoModalOpen(false)} />
    </div>
  );
};
