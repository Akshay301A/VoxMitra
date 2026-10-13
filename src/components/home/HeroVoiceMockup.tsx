import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, PhoneCall, Volume2, Mic, CheckCircle2, ArrowRight, ShieldCheck, User } from 'lucide-react';

export const HeroVoiceMockup: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTurn, setActiveTurn] = useState(2);
  const [playbackSeconds, setPlaybackSeconds] = useState(48);

  const dialogue = [
    {
      speaker: 'agent',
      name: 'Priya (VoxMitra Receptionist)',
      text: 'Namaste! Thank you for calling Apollo Care Clinic. My name is Priya, your AI receptionist. Are you calling to book an appointment or check doctor timings?',
      timestamp: '00:04',
    },
    {
      speaker: 'caller',
      name: 'Rajesh Mehra (Caller)',
      text: 'Hi Priya, I need an urgent consultation with Dr. Sengupta for my father tomorrow morning. Is 11 AM available?',
      timestamp: '00:15',
    },
    {
      speaker: 'agent',
      name: 'Priya (VoxMitra Receptionist)',
      text: 'Certainly! Dr. Sengupta has an open slot tomorrow at 11:15 AM at the Indiranagar branch. Shall I lock that slot and send the confirmation SMS to this number?',
      timestamp: '00:27',
    },
    {
      speaker: 'caller',
      name: 'Rajesh Mehra (Caller)',
      text: 'Yes please, that works perfectly. His name is Mohan Mehra.',
      timestamp: '00:36',
    },
    {
      speaker: 'agent',
      name: 'Priya (VoxMitra Receptionist)',
      text: 'Confirmed! I have booked Mohan Mehra for tomorrow at 11:15 AM with Dr. Sengupta. The SMS details have been dispatched. Wishing him a quick recovery!',
      timestamp: '00:46',
    },
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setPlaybackSeconds((prev) => {
          if (prev >= 60) {
            setIsPlaying(false);
            return 60;
          }
          return prev + 1;
        });
        setActiveTurn((prev) => (prev < dialogue.length - 1 ? prev + 1 : prev));
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleReset = () => {
    setIsPlaying(false);
    setActiveTurn(1);
    setPlaybackSeconds(18);
  };

  return (
    <div className="relative rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 shadow-2xl overflow-hidden text-slate-200">
      {/* Top Console Bar */}
      <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-400 font-mono">
              INBOUND CALL IN PROGRESS
            </span>
          </div>
          <span className="text-slate-600">·</span>
          <span className="text-xs font-mono text-slate-400 tabular-nums">
            00:{playbackSeconds < 10 ? `0${playbackSeconds}` : playbackSeconds}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            Exotel SIP Trunk
          </span>
          <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
            Sample Data
          </span>
        </div>
      </div>

      <div className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left: Caller Info & Real-Time Extracted Fields */}
        <div className="md:col-span-5 space-y-4">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-950 border border-indigo-700/50 flex items-center justify-center text-indigo-300 font-bold text-xs">
                RM
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">Rajesh Mehra</p>
                <p className="text-[11px] font-mono text-slate-400">+91 98450 •••••</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Campaign / Line:</span>
                <span className="text-slate-200 font-medium">Apollo Clinic Triage</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Caller Sentiment:</span>
                <span className="text-emerald-400 font-medium">Positive / High Intent</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Agent Voice:</span>
                <span className="text-slate-200">Priya (Indian English / Calm)</span>
              </div>
            </div>
          </div>

          {/* Captured Field Cards */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Live Extracted Data</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/50">
                Auto-Synced
              </span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="p-2 rounded bg-slate-900 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Patient Name:</span>
                <span className="text-white font-medium">Mohan Mehra</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Specialist:</span>
                <span className="text-indigo-300 font-medium">Dr. Sengupta</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Slot Confirmed:</span>
                <span className="text-white font-mono">Tomorrow 11:15 AM</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live Transcript Stream & Waveform */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-4">
          {/* Scrollable Dialogue */}
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {dialogue.slice(0, activeTurn + 1).map((turn, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl text-xs leading-relaxed transition-all ${
                  turn.speaker === 'agent'
                    ? 'bg-indigo-950/40 border border-indigo-800/40 text-slate-200'
                    : 'bg-slate-950 border border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1 text-[10px] font-mono">
                  <span className={`font-semibold ${turn.speaker === 'agent' ? 'text-indigo-400' : 'text-slate-400'}`}>
                    {turn.name}
                  </span>
                  <span className="text-slate-500 tabular-nums">{turn.timestamp}</span>
                </div>
                <p>{turn.text}</p>
              </div>
            ))}
          </div>

          {/* Acoustic Waveform & Interactive Audio Bar */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-colors shadow-md shrink-0"
                title={isPlaying ? 'Pause dialogue simulation' : 'Play dialogue simulation'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <button
                onClick={handleReset}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors"
                title="Restart dialogue"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Dynamic CSS Waveform Bars */}
            <div className="flex-1 flex items-center justify-center gap-1 h-7">
              {[40, 65, 85, 30, 95, 70, 50, 100, 45, 80, 60, 90, 35, 75, 55, 85, 40].map((h, i) => (
                <span
                  key={i}
                  style={{
                    height: isPlaying ? `${Math.max(20, (h * Math.sin((i + playbackSeconds) * 0.8) + 100) / 2)}%` : `${h * 0.35}%`,
                  }}
                  className={`w-1 rounded-full transition-all duration-150 ${
                    isPlaying ? 'bg-gradient-to-t from-indigo-500 to-sky-400' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>

            <div className="text-[11px] font-mono text-slate-400 shrink-0">
              {isPlaying ? 'Synthesizing voice...' : 'Preview audio simulation'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
