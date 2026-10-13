import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  Play,
  Pause,
  X,
  FileText,
  DollarSign,
  Activity,
  Calendar,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { api } from '../api/client.ts';
import { CallRecord, Agent } from '../types.ts';

interface CallHistoryPageProps {
  initialCallId?: string;
  onNavigate: (page: string, params?: any) => void;
}

export const CallHistoryPage: React.FC<CallHistoryPageProps> = ({ initialCallId }) => {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState('all');

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [callsData, agentsData] = await Promise.all([
        api.getCalls({
          agentId: agentFilter !== 'all' ? agentFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          direction: directionFilter !== 'all' ? directionFilter : undefined,
          search: search.trim() || undefined,
        }),
        api.getAgents(),
      ]);

      setCalls(callsData);
      setAgents(agentsData);

      if (initialCallId) {
        const found = callsData.find((c) => c.id === initialCallId);
        if (found) setSelectedCall(found);
      }
    } catch (err) {
      console.error('Failed loading call history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [agentFilter, statusFilter, directionFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Call History & Transcripts
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Searchable log of all autonomous and inbound conversations, transcripts, and CRM extractions.
          </p>
        </div>

        <button
          onClick={loadData}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* Filter and Search Strip */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search phone number, agent, or summary..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="all">All Agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="transferred">Transferred</option>
            <option value="no_answer">No Answer</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="all">All Directions</option>
            <option value="inbound">Inbound</option>
            <option value="outbound">Outbound</option>
          </select>
        </div>
      </div>

      {/* Calls Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Caller / Recipient</th>
                <th className="py-3.5 px-4">Assigned Agent</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Summary</th>
                <th className="py-3.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading call records...
                  </td>
                </tr>
              ) : calls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No call records match your current filters.
                  </td>
                </tr>
              ) : (
                calls.map((call) => (
                  <tr
                    key={call.id}
                    onClick={() => setSelectedCall(call)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                      {new Date(call.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        {call.direction === 'inbound' ? (
                          <PhoneIncoming className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        ) : (
                          <PhoneOutgoing className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        )}
                        <span className="font-semibold text-slate-900 font-mono tabular-nums">
                          {call.caller_number}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 truncate max-w-[140px]">
                      {call.agent_name || 'Agent'}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-slate-600">
                      {call.duration_seconds}s
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          call.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : call.status === 'transferred'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {call.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 truncate max-w-[240px]" title={call.summary}>
                      {call.summary || 'No summary'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCall(call);
                        }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Call Details Drawer Modal */}
      {selectedCall && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-white shadow-2xl h-full flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-slate-900">
                    Call Record Details
                  </span>
                  <span
                    className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded ${
                      selectedCall.is_demo
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {selectedCall.is_demo ? 'Demo Seed Data' : 'Real Test Call'}
                  </span>
                </div>
                <p className="text-[11px] font-mono tabular-nums text-slate-500 mt-0.5">
                  SID: {selectedCall.telephony_call_sid || selectedCall.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedCall(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body Scroll */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block">Assigned Agent</span>
                  <span className="font-semibold text-slate-900">{selectedCall.agent_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Call Duration</span>
                  <span className="font-semibold text-slate-900 font-mono tabular-nums">
                    {selectedCall.duration_seconds} seconds
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Caller Phone</span>
                  <span className="font-semibold text-slate-900 font-mono tabular-nums">
                    {selectedCall.caller_number}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Sentiment & Status</span>
                  <span className="font-semibold text-slate-900 capitalize">
                    {selectedCall.status} · {selectedCall.sentiment || 'neutral'}
                  </span>
                </div>
              </div>

              {/* Summary Block */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Conversational Summary
                </h4>
                <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-lg border border-slate-200 leading-relaxed">
                  {selectedCall.summary || 'No summary available.'}
                </p>
              </div>

              {/* Extracted Data Fields */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Captured Contact Fields
                </h4>
                {selectedCall.extracted_data && Object.keys(selectedCall.extracted_data).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(selectedCall.extracted_data).map(([k, v]) => (
                      <div key={k} className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs">
                        <span className="text-[10px] text-slate-500 block uppercase font-semibold">{k}</span>
                        <span className="font-semibold text-slate-900">{v}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No structured fields extracted during call.</p>
                )}
              </div>

              {/* Complete Turn-by-Turn Transcript */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Full Dialogue Transcript
                </h4>
                <div className="space-y-3">
                  {selectedCall.transcript && selectedCall.transcript.length > 0 ? (
                    selectedCall.transcript.map((t, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg text-xs leading-relaxed ${
                          t.speaker === 'agent'
                            ? 'bg-slate-50 border border-slate-200 text-slate-900'
                            : t.speaker === 'caller'
                            ? 'bg-indigo-50 border border-indigo-100 text-indigo-950'
                            : 'bg-slate-100 text-slate-500 text-center font-mono text-[10px]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-semibold mb-1 opacity-75">
                          <span className="uppercase">{t.speaker}</span>
                          <span className="font-mono tabular-nums">{t.timestamp}s</span>
                        </div>
                        <p>{t.text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">No transcript recorded.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
