import React, { useEffect, useState, useRef } from 'react';
import {
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Send,
  Volume2,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { api } from '../api/client.ts';
import { Agent, AgentConfig, TranscriptItem } from '../types.ts';

interface AgentTestingPageProps {
  initialAgentId?: string;
  onNavigate: (page: string, params?: any) => void;
}

export const AgentTestingPage: React.FC<AgentTestingPageProps> = ({ initialAgentId, onNavigate }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(initialAgentId || '');
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [currentConfig, setCurrentConfig] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Call Session State
  const [callState, setCallState] = useState<'idle' | 'ringing' | 'connected' | 'completed'>('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [extractedFields, setExtractedFields] = useState<Record<string, string>>({});
  const [transferTriggered, setTransferTriggered] = useState<string | null>(null);
  const [callSummary, setCallSummary] = useState<string | null>(null);

  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  // Load agents list
  useEffect(() => {
    async function loadAgents() {
      try {
        setLoading(true);
        const list = await api.getAgents();
        setAgents(list);
        if (list.length > 0) {
          const targetId = initialAgentId && list.some((a) => a.id === initialAgentId) ? initialAgentId : list[0].id;
          setSelectedAgentId(targetId);
        }
      } catch (err) {
        console.error('Failed loading agents for testing:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAgents();
  }, [initialAgentId]);

  // Load selected agent details
  useEffect(() => {
    if (!selectedAgentId) return;
    async function loadAgentDetails() {
      try {
        const data = await api.getAgent(selectedAgentId);
        setCurrentAgent(data.agent);
        setCurrentConfig(data.config);
      } catch (err) {
        console.error('Failed loading agent details:', err);
      }
    }
    loadAgentDetails();
  }, [selectedAgentId]);

  // Call duration counter
  useEffect(() => {
    if (callState === 'connected') {
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [callState]);

  // Web Speech API Voice synthesis helper
  const speakText = (text: string) => {
    setIsAgentSpeaking(true);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsAgentSpeaking(false);
      utterance.onerror = () => setIsAgentSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setIsAgentSpeaking(false), 2500);
    }
  };

  // Start Call
  const handleStartCall = () => {
    if (!currentAgent || !currentConfig) return;
    setCallState('ringing');
    setCallDuration(0);
    setTranscript([]);
    setExtractedFields({});
    setTransferTriggered(null);
    setCallSummary(null);

    // Simulate 1.5 second ring before connecting
    setTimeout(() => {
      setCallState('connected');
      const initialGreeting =
        currentConfig.greeting ||
        `Hello, thank you for calling ${currentAgent.name}. How may I help you today?`;

      setTranscript([
        {
          speaker: 'system',
          text: `Call connected to ${currentAgent.name} via VoxMitra Voice Engine.`,
          timestamp: 0,
        },
        {
          speaker: 'agent',
          text: initialGreeting,
          timestamp: 1,
        },
      ]);

      speakText(initialGreeting);
    }, 1500);
  };

  // End Call & Persist Record
  const handleEndCall = async () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsAgentSpeaking(false);
    if (isListeningMic && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListeningMic(false);
    }

    setCallState('completed');

    // Build brief summary
    const summary =
      transcript.length > 2
        ? `Interactive testing session with ${currentAgent?.name}. Handled ${Math.floor(transcript.length / 2)} conversational turns with extracted data: ${Object.keys(extractedFields).join(', ') || 'General inquiry'}.`
        : 'Brief test call completed.';
    setCallSummary(summary);

    // Save test call into persistent database
    if (currentAgent) {
      try {
        await api.saveTestCall(currentAgent.id, {
          durationSeconds: Math.max(callDuration, 12),
          transcript,
          summary,
          extractedData: extractedFields,
          status: transferTriggered ? 'transferred' : 'completed',
          callerNumber: '+1 (555) 782-9011 (Interactive Test)',
          direction: currentAgent.agent_type === 'inbound_receptionist' ? 'inbound' : 'outbound',
        });
      } catch (err) {
        console.error('Failed saving call record to DB:', err);
      }
    }
  };

  // Submit caller response
  const handleSendTurn = async (messageToSend?: string) => {
    const text = messageToSend || userInput;
    if (!text.trim() || !selectedAgentId || isAgentSpeaking) return;

    const callerTimestamp = callDuration;
    const newTranscript: TranscriptItem[] = [
      ...transcript,
      { speaker: 'caller', text: text.trim(), timestamp: callerTimestamp },
    ];
    setTranscript(newTranscript);
    setUserInput('');
    setIsAgentSpeaking(true);

    try {
      const res = await api.processTestTurn(selectedAgentId, {
        conversationHistory: newTranscript,
        callerMessage: text.trim(),
        voiceId: currentConfig?.voice_id,
      });

      const updatedTranscript: TranscriptItem[] = [
        ...newTranscript,
        { speaker: 'agent', text: res.replyText, timestamp: callerTimestamp + 2 },
      ];

      setTranscript(updatedTranscript);

      if (res.extractedFields && Object.keys(res.extractedFields).length > 0) {
        setExtractedFields((prev) => ({ ...prev, ...res.extractedFields }));
      }

      if (res.shouldTransfer) {
        setTransferTriggered(
          res.transferReason || currentConfig?.transfer_phone || 'Customer requested live human representative'
        );
      }

      if (res.audioBase64) {
        const audio = new Audio(res.audioBase64);
        audio.onended = () => setIsAgentSpeaking(false);
        audio.play().catch(() => speakText(res.replyText));
      } else {
        speakText(res.replyText);
      }

      if (res.isCompleted) {
        setTimeout(() => handleEndCall(), 3500);
      }
    } catch (err) {
      console.error('Turn processing error:', err);
      setIsAgentSpeaking(false);
    }
  };

  // Toggle Speech Recognition
  const toggleMic = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Please type responses.');
      return;
    }

    if (isListeningMic) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListeningMic(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = currentConfig?.supported_languages[0] || 'en-US';

    recognition.onresult = (event: any) => {
      const speech = event.results[0][0].transcript;
      setUserInput(speech);
      handleSendTurn(speech);
      setIsListeningMic(false);
    };

    recognition.onerror = () => setIsListeningMic(false);
    recognition.onend = () => setIsListeningMic(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListeningMic(true);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Agent Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Interactive Voice Testing Lab
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Simulate live phone conversations with full speech reasoning, field extraction, and transfer rules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">Testing Agent:</label>
          <select
            value={selectedAgentId}
            onChange={(e) => {
              if (callState === 'connected') handleEndCall();
              setSelectedAgentId(e.target.value);
            }}
            className="text-xs font-medium border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-900 shadow-xs"
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.agent_type})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Testing Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Phone Console & Live Transcript */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-[580px] overflow-hidden">
          {/* Top Call State Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  callState === 'connected'
                    ? 'bg-emerald-500 animate-pulse'
                    : callState === 'ringing'
                    ? 'bg-amber-500 animate-ping'
                    : 'bg-slate-400'
                }`}
              />
              <div>
                <p className="text-xs font-bold text-slate-900">
                  {callState === 'connected'
                    ? `Live Call Active — ${currentAgent?.name}`
                    : callState === 'ringing'
                    ? 'Ringing... Establishing SIP audio stream'
                    : callState === 'completed'
                    ? 'Call Ended'
                    : 'Ready to Dial'}
                </p>
                <p className="text-[11px] font-mono tabular-nums text-slate-500">
                  Duration: {Math.floor(callDuration / 60)}:
                  {String(callDuration % 60).padStart(2, '0')}
                </p>
              </div>
            </div>

            {/* Call Controls */}
            <div>
              {callState === 'idle' || callState === 'completed' ? (
                <button
                  onClick={handleStartCall}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Start Test Call</span>
                </button>
              ) : (
                <button
                  onClick={handleEndCall}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors shadow-sm"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                  <span>End Call</span>
                </button>
              )}
            </div>
          </div>

          {/* Transfer Banner */}
          {transferTriggered && (
            <div className="p-3 bg-blue-50 border-b border-blue-200 text-xs text-blue-900 flex items-center justify-between">
              <span className="font-semibold">
                🔄 Live Call Transfer Triggered: {transferTriggered}
              </span>
              <span className="text-[11px] text-blue-700">Simulating warm handoff</span>
            </div>
          )}

          {/* Transcript Scroll Area */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/30">
            {transcript.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                <Volume2 className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">Sandbox Ready for Testing</p>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Click &quot;Start Test Call&quot; to begin. The AI agent will greet you using configured
                  instructions, business FAQs, and ElevenLabs voice settings.
                </p>
              </div>
            ) : (
              transcript.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    item.speaker === 'agent'
                      ? 'justify-start'
                      : item.speaker === 'caller'
                      ? 'justify-end'
                      : 'justify-center'
                  }`}
                >
                  {item.speaker === 'system' ? (
                    <div className="text-[11px] text-slate-500 bg-slate-100 px-3 py-1 rounded-full font-mono">
                      {item.text}
                    </div>
                  ) : (
                    <div
                      className={`max-w-[80%] rounded-xl p-3.5 text-xs leading-relaxed ${
                        item.speaker === 'agent'
                          ? 'bg-white border border-slate-200 text-slate-900 shadow-xs'
                          : 'bg-indigo-600 text-white shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 mb-1 text-[10px] opacity-75">
                        <span className="font-semibold uppercase tracking-wider">
                          {item.speaker === 'agent' ? currentAgent?.name : 'You (Caller)'}
                        </span>
                        <span className="font-mono tabular-nums">{item.timestamp}s</span>
                      </div>
                      <p>{item.text}</p>
                    </div>
                  )}
                </div>
              ))
            )}

            {isAgentSpeaking && (
              <div className="flex items-center gap-2 text-xs text-indigo-600 font-medium pl-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
                <span>{currentAgent?.name} is speaking...</span>
              </div>
            )}
          </div>

          {/* Caller Input Bar */}
          <div className="p-3 bg-white border-t border-slate-200">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMic}
                disabled={callState !== 'connected' || isAgentSpeaking}
                title={isListeningMic ? 'Stop Mic' : 'Speak via Microphone'}
                className={`p-2 rounded-lg border transition-colors ${
                  isListeningMic
                    ? 'bg-rose-100 text-rose-700 border-rose-300 animate-pulse'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
              >
                {isListeningMic ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>

              <input
                type="text"
                disabled={callState !== 'connected' || isAgentSpeaking}
                placeholder={
                  callState === 'connected'
                    ? 'Type your response as the caller (e.g. "Can I book a consultation Thursday at 2 PM?")...'
                    : 'Start call to begin speaking with agent'
                }
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendTurn();
                }}
                className="flex-1 text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 disabled:bg-slate-50"
              />

              <button
                onClick={() => handleSendTurn()}
                disabled={callState !== 'connected' || !userInput.trim() || isAgentSpeaking}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Extracted Data & Agent Metadata */}
        <div className="lg:col-span-4 space-y-5">
          {/* Live Extracted Fields Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Extracted Lead Data Fields
            </h3>
            {Object.keys(extractedFields).length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                Data captured during conversation will appear here in real-time.
              </p>
            ) : (
              <div className="space-y-2">
                {Object.entries(extractedFields).map(([key, val]) => (
                  <div key={key} className="p-2 rounded bg-slate-50 border border-slate-200 text-xs">
                    <span className="text-slate-500 block uppercase text-[10px] font-semibold">{key}</span>
                    <span className="font-semibold text-slate-900">{val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick FAQ / Knowledge Reference */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Active Knowledge Base ({currentConfig?.business_faqs.length || 0})
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto text-xs">
              {currentConfig?.business_faqs.map((f, i) => (
                <div key={i} className="p-2 rounded bg-slate-50 border border-slate-100">
                  <p className="font-semibold text-slate-800">{f.question}</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">{f.answer}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Post-Call Summary Banner */}
          {callSummary && (
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-xs text-emerald-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4" />
                <span>Call Saved to History</span>
              </div>
              <p className="text-[11px] leading-relaxed">{callSummary}</p>
              <button
                onClick={() => onNavigate('calls')}
                className="mt-2 text-xs font-semibold text-emerald-800 hover:text-emerald-950 inline-flex items-center gap-1"
              >
                <span>View in Call History</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
