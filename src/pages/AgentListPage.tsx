import React, { useEffect, useState } from 'react';
import {
  Users,
  PlusCircle,
  Play,
  Sliders,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  PauseCircle,
  AlertCircle,
  MoreVertical,
} from 'lucide-react';
import { api } from '../api/client.ts';
import { Agent, AgentType, AgentStatus } from '../types.ts';

interface AgentListPageProps {
  onNavigate: (page: string, params?: any) => void;
}

export const AgentListPage: React.FC<AgentListPageProps> = ({ onNavigate }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const data = await api.getAgents();
      setAgents(data);
    } catch (err) {
      console.error('Failed to load agents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const handleToggleStatus = async (agent: Agent) => {
    const nextStatus: AgentStatus = agent.status === 'active' ? 'paused' : 'active';
    try {
      await api.updateAgent(agent.id, { status: nextStatus });
      setAgents((prev) =>
        prev.map((a) => (a.id === agent.id ? { ...a, status: nextStatus } : a))
      );
    } catch (err) {
      console.error('Failed updating agent status:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this AI employee? All call records will be preserved.')) {
      return;
    }
    try {
      setDeletingId(id);
      await api.deleteAgent(id);
      setAgents((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Failed deleting agent:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredAgents = agents.filter((a) => {
    if (typeFilter !== 'all' && a.agent_type !== typeFilter) return false;
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">AI Employees</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your autonomous voice workforce, inbound receptionists, and outbound lead qualifiers.
          </p>
        </div>
        <button
          onClick={() => onNavigate('create-agent')}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors whitespace-nowrap"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Deploy New Employee</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search agents by name or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="all">All Agent Archetypes</option>
            <option value="inbound_receptionist">Inbound Receptionist</option>
            <option value="instant_lead">Speed-to-Lead</option>
            <option value="bulk_caller">Bulk Outreach</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Agents Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading AI workforce...</div>
      ) : filteredAgents.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">No agents match your criteria</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search filters, or deploy a new AI employee using our guided setup wizard.
          </p>
          <button
            onClick={() => onNavigate('create-agent')}
            className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Launch Create Wizard</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <div
              key={agent.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
                    {agent.agent_type === 'inbound_receptionist'
                      ? 'Inbound Receptionist'
                      : agent.agent_type === 'instant_lead'
                      ? 'Instant Lead Qualifier'
                      : 'Bulk Calling Agent'}
                  </span>
                  <button
                    onClick={() => handleToggleStatus(agent)}
                    title="Click to toggle status"
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
                      agent.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                    }`}
                  >
                    {agent.status === 'active' ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <PauseCircle className="w-3 h-3" />
                    )}
                    <span>{agent.status}</span>
                  </button>
                </div>

                <h3 className="text-lg font-bold text-slate-900">{agent.name}</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-3">
                  {agent.description}
                </p>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Processed Calls</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    {agent.total_calls} calls
                  </span>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onNavigate('testing', { agentId: agent.id })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
                  >
                    <Play className="w-3 h-3" />
                    <span>Test Voice</span>
                  </button>
                  <button
                    onClick={() => onNavigate('agent-editor', { agentId: agent.id })}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Configure</span>
                  </button>
                </div>

                <button
                  onClick={() => handleDelete(agent.id)}
                  disabled={deletingId === agent.id}
                  title="Delete Agent"
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
