import React, { useState } from 'react';
import {
  PhoneCall,
  Zap,
  Layers,
  BarChart3,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Sliders,
  Play,
  Volume2,
  Calendar,
} from 'lucide-react';

export const InteractiveProductTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'receptionist' | 'lead' | 'campaigns' | 'analytics'>('receptionist');

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden text-slate-200">
      {/* Tab Segmented Switcher */}
      <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between overflow-x-auto gap-2">
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('receptionist')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'receptionist'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>AI Receptionist</span>
          </button>
          <button
            onClick={() => setActiveTab('lead')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'lead'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Instant Lead Caller</span>
          </button>
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'campaigns'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Bulk Calling Campaigns</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Operational Analytics</span>
          </button>
        </div>

        <span className="text-[11px] font-mono text-slate-500 hidden sm:inline px-3">
          Interactive Live Architecture Preview
        </span>
      </div>

      {/* TAB CONTENT: Receptionist */}
      {activeTab === 'receptionist' && (
        <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-4">
            <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 bg-indigo-950/60 border border-indigo-800/40 px-2 py-0.5 rounded">
              24/7 Zero Hold Time
            </span>
            <h3 className="text-2xl font-bold text-white tracking-tight">
              Front Desk Inbound Receptionist
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Answers every incoming customer telephone call within 1 ring. Accurately addresses branch
              hours, appointment availability, pricing tiers, and smoothly transfers critical calls to
              on-duty staff.
            </p>

            <div className="space-y-2 pt-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Custom business knowledge base & FAQ integration</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Multi-branch calendar scheduling (Indiranagar, Koramangala, etc.)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Warm SIP transfer to executive mobile numbers</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-[11px]">
              <span className="text-slate-400">INBOUND_CALL_SESSION #RC-8021</span>
              <span className="text-emerald-400 font-semibold">STATUS: LIVE CONVERSATION</span>
            </div>

            <div className="space-y-2 text-[11px]">
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                <span className="text-indigo-400 font-semibold">AI RECEPTIONIST: </span>
                &quot;Welcome to Apex Dental Bengaluru. We have consultations available today at 4:30 PM with Dr. Ananya. Would that time work for your dental checkup?&quot;
              </div>
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                <span className="text-slate-400 font-semibold">PATIENT CALLER: </span>
                &quot;Yes, 4:30 PM is great. Do you accept Bajaj Finserv health cards?&quot;
              </div>
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                <span className="text-indigo-400 font-semibold">AI RECEPTIONIST: </span>
                &quot;Yes, we accept Bajaj Finserv and all major insurance policies at our reception desk. Your 4:30 PM slot is locked. See you soon!&quot;
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Captured Intent:</span>
              <span className="text-white font-medium">Dental Checkup (Today 4:30 PM) · Bajaj Card Accepted</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Lead Caller */}
      {activeTab === 'lead' && (
        <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-4">
            <span className="text-[11px] font-mono uppercase tracking-wider text-sky-400 bg-sky-950/60 border border-sky-800/40 px-2 py-0.5 rounded">
              Sub-60s Webhook Dialing
            </span>
            <h3 className="text-2xl font-bold text-white tracking-tight">
              Speed-to-Lead Outbound Caller
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              When a prospective homebuyer, student, or client submits a web form on your landing page,
              VoxMitra dials them instantly. Validates buying intent, answers initial queries, and books a
              guided sales walkthrough.
            </p>

            <div className="space-y-2 pt-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Instant dispatch via Zoho, LeadSquared, or Webhook</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Qualification scoring (Budget, Timeline, Location)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Immediate SMS calendar confirmation</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-[11px]">
              <span className="text-slate-400">TRIGGER: 99ACRES_LEAD_SUBMISSION</span>
              <span className="text-sky-400 font-semibold">LATENCY: 42 SECONDS</span>
            </div>

            <div className="space-y-2 text-[11px]">
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                <span className="text-sky-400 font-semibold">VOICE AGENT: </span>
                &quot;Hello Vikram! This is Rohan from Godrej Properties following up on your inquiry for the 3BHK Whitefield project. Did I catch you at an okay time?&quot;
              </div>
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                <span className="text-slate-400 font-semibold">LEAD CALLER: </span>
                &quot;Hey, yes! I wanted to know if possession is ready before Diwali?&quot;
              </div>
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                <span className="text-sky-400 font-semibold">VOICE AGENT: </span>
                &quot;Yes, Phase 1 towers have OC received and handover begins September. Can our senior property consultant host you for an on-site model flat tour this Saturday at 11 AM?&quot;
              </div>
            </div>

            <div className="p-3 bg-emerald-950/40 rounded-lg border border-emerald-800/40 flex items-center justify-between text-[11px]">
              <span className="text-emerald-300">Lead Outcome:</span>
              <span className="text-white font-medium">Qualified: Site Visit Booked (Saturday 11 AM)</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Campaigns */}
      {activeTab === 'campaigns' && (
        <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-4">
            <span className="text-[11px] font-mono uppercase tracking-wider text-violet-400 bg-violet-950/60 border border-violet-800/40 px-2 py-0.5 rounded">
              High-Concurrency Engine
            </span>
            <h3 className="text-2xl font-bold text-white tracking-tight">
              Bulk Outbound Outreach Campaigns
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload customer contact sheets to dispatch concurrent calling batches. Conduct payment
              reminders, insurance renewal calls, event attendance confirmations, and churn surveys with
              strict regulatory time windows.
            </p>

            <div className="space-y-2 pt-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Simultaneous dialing across scalable telecom channels</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Automated voicemail and busy signal retry logic</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Custom calling hours compliance (10 AM – 7 PM IST)</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4 text-xs font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-[11px]">
              <span className="text-slate-400">BATCH: MOTOR_RENEWAL_OCT_2026</span>
              <span className="text-violet-400 font-semibold">PROGRESS: 842 / 1,000 CALLS</span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                <p className="text-lg font-bold text-emerald-400 font-mono">68.4%</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Answer Rate</p>
              </div>
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                <p className="text-lg font-bold text-white font-mono">412</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Renewals Confirmed</p>
              </div>
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                <p className="text-lg font-bold text-amber-400 font-mono">94</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Callbacks Slotted</p>
              </div>
            </div>

            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-[11px] text-slate-300">
              <span className="text-slate-400">Active Rule: </span>
              If customer requests time to consult family, automatically queue callback for tomorrow after 6 PM.
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Analytics */}
      {activeTab === 'analytics' && (
        <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-4">
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
              Granular Business Telemetry
            </span>
            <h3 className="text-2xl font-bold text-white tracking-tight">
              Call Performance & Outcome Insights
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Measure real conversational ROI. Track resolution rates, average duration, common caller
              objections, and sentiment across every customer interaction.
            </p>

            <div className="space-y-2 pt-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Full dialogue recording and text transcript search</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Per-minute cost computation and budget alerts</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Structured JSON export to your CRM data warehouse</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-[11px]">
              <span className="text-slate-400">TELEMETRY_DASHBOARD_OCT_2026</span>
              <span className="text-emerald-400 font-semibold">HEALTH: NOMINAL</span>
            </div>

            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between items-center p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400">Appointment Booking Conversion:</span>
                <span className="text-emerald-400 font-bold">41.8%</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400">Average Call Duration:</span>
                <span className="text-white font-bold">1m 24s</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400">Live Human Escalation Rate:</span>
                <span className="text-indigo-300 font-bold">7.2%</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400">Customer Sentiment Score:</span>
                <span className="text-emerald-400 font-bold">92% Positive / Neutral</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
