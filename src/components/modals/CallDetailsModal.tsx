import React, { useState } from 'react';
import {
  X,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  Play,
  Pause,
  Download,
  Share2,
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  FileText,
  Volume2,
  ExternalLink,
} from 'lucide-react';
import { CallRecord } from '../../types.ts';

interface CallDetailsModalProps {
  call: CallRecord | null;
  onClose: () => void;
  onNavigateToTesting?: (agentId?: string) => void;
}

export const CallDetailsModal: React.FC<CallDetailsModalProps> = ({
  call,
  onClose,
  onNavigateToTesting,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  if (!call) return null;

  const toggleAudio = () => {
    setIsPlayingAudio((prev) => !prev);
    setTimeout(() => {
      setIsPlayingAudio(false);
    }, 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              {call.direction === 'inbound' ? (
                <PhoneIncoming className="w-4 h-4" />
              ) : (
                <PhoneOutgoing className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white font-mono tabular-nums">
                  {call.caller_number}
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                  call.status === 'completed'
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                    : call.status === 'transferred'
                    ? 'bg-blue-950/80 text-blue-400 border border-blue-800'
                    : 'bg-rose-950/80 text-rose-400 border border-rose-800'
                }`}>
                  {call.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Handled by <span className="text-white font-medium">{call.agent_name || 'AI Employee'}</span> · {new Date(call.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* Audio Player Banner */}
          <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleAudio}
                className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-colors shadow-md"
              >
                {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <div>
                <p className="text-xs font-bold text-white">
                  {isPlayingAudio ? 'Streaming Stereo Audio Recording...' : 'Listen to Full Call Audio'}
                </p>
                <p className="text-[11px] text-slate-400 font-mono">
                  Duration: {call.duration_seconds}s · Exotel SIP Recording · 16kHz WAV
                </p>
              </div>
            </div>

            {isPlayingAudio && (
              <div className="flex items-center gap-1 pr-2">
                <div className="w-1 h-3 bg-blue-400 animate-pulse" />
                <div className="w-1 h-6 bg-blue-400 animate-pulse delay-75" />
                <div className="w-1 h-4 bg-blue-400 animate-pulse delay-150" />
                <div className="w-1 h-7 bg-blue-400 animate-pulse delay-100" />
                <div className="w-1 h-3 bg-blue-400 animate-pulse" />
              </div>
            )}
          </div>

          {/* AI Executive Summary & Sentiment */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                AI Call Summary & Analysis
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                call.sentiment === 'positive'
                  ? 'bg-emerald-100 text-emerald-800'
                  : call.sentiment === 'negative'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                Sentiment: {call.sentiment || 'Positive'}
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              {call.summary || 'Caller reached out regarding services and was assisted by the autonomous voice agent.'}
            </p>
          </div>

          {/* Extracted Structured Data (CRM fields) */}
          {call.extracted_data && Object.keys(call.extracted_data).length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
                Extracted CRM Entities & Contact Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {Object.entries(call.extracted_data).map(([key, val]) => (
                  <div
                    key={key}
                    className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between"
                  >
                    <span className="text-xs text-slate-500 capitalize">
                      {key.replace(/_/g, ' ')}:
                    </span>
                    <span className="text-xs font-bold text-slate-900 font-mono">
                      {val}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dialogue Transcript Turns */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Verbatim Conversational Transcript
            </h4>
            <div className="space-y-3 max-h-72 overflow-y-auto p-1">
              {call.transcript && call.transcript.length > 0 ? (
                call.transcript.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-xs leading-relaxed ${
                      item.speaker === 'agent'
                        ? 'bg-blue-50/70 border-blue-200/80 text-slate-900 mr-8'
                        : 'bg-slate-50 border-slate-200 text-slate-800 ml-8'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 text-[11px] font-semibold">
                      <span className={item.speaker === 'agent' ? 'text-blue-700' : 'text-slate-700'}>
                        {item.speaker === 'agent' ? (call.agent_name || 'VoxMitra Agent') : 'Customer'}
                      </span>
                      {item.timestamp !== undefined && (
                        <span className="text-[10px] text-slate-600 font-mono">
                          +{Math.round(item.timestamp)}s
                        </span>
                      )}
                    </div>
                    <p>{item.text}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-slate-600">
                  No transcript messages recorded for this session.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-mono">
            SID: {call.telephony_call_sid || `vm-${call.id.slice(0, 8)}`}
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToTesting && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToTesting(call.agent_id);
                }}
                className="py-2 px-3 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors"
              >
                Test This Agent
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
            >
              Close Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
