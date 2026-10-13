import React, { useEffect, useState } from 'react';
import {
  Volume2,
  Play,
  Pause,
  Globe,
  Key,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { api } from '../api/client.ts';
import { ElevenLabsVoice } from '../types.ts';

export const VoiceSettingsPage: React.FC = () => {
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [languages, setLanguages] = useState<{ code: string; name: string; native: string }[]>([]);
  const [isConfigured, setIsConfigured] = useState(false);
  const [configMessage, setConfigMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Audio Testing State
  const [selectedVoiceId, setSelectedVoiceId] = useState('21m00Tcm4TlvDq8ikWAM');
  const [sampleText, setSampleText] = useState(
    'Hello and welcome to VoxMitra. I am your autonomous AI voice concierge, ready to assist your customers 24/7.'
  );
  const [synthesizing, setSynthesizing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [synthError, setSynthError] = useState<string | null>(null);

  useEffect(() => {
    async function loadVoices() {
      try {
        setLoading(true);
        const data = await api.getVoices();
        setVoices(data.voices || []);
        setLanguages(data.supported_languages || []);
        setIsConfigured(data.configured);
        setConfigMessage(data.message || null);
        if (data.voices?.length > 0) {
          setSelectedVoiceId(data.voices[0].voice_id);
        }
      } catch (err: any) {
        console.error('Failed to load voice catalog:', err);
      } finally {
        setLoading(false);
      }
    }
    loadVoices();
  }, []);

  const handleSynthesize = async () => {
    setSynthError(null);
    setSynthesizing(true);
    setAudioUrl(null);
    try {
      const res = await api.synthesizeSpeech(selectedVoiceId, sampleText);
      if (res.success && res.audioBase64) {
        setAudioUrl(res.audioBase64);
      } else {
        setSynthError(
          res.error ||
            'ElevenLabs API key is required on the server to synthesize live voice audio. Add your key in Integrations.'
        );
      }
    } catch (err: any) {
      setSynthError(err.message || 'Speech synthesis error');
    } finally {
      setSynthesizing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Voice Models & Language Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Server-side ElevenLabs conversational voice synthesis, acoustic presets, and multi-language matrix.
        </p>
      </div>

      {/* Provider Status Callout */}
      <div
        className={`p-4 rounded-xl border flex items-start gap-3.5 ${
          isConfigured
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}
      >
        {isConfigured ? (
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        )}
        <div className="text-xs">
          <p className="font-semibold text-sm">
            {isConfigured
              ? 'ElevenLabs Live Voice API Connected'
              : 'ElevenLabs Integration: Pre-configured Standard Voice Catalog'}
          </p>
          <p className="mt-1 leading-relaxed opacity-90">
            {configMessage ||
              (isConfigured
                ? 'Your custom voices and voice library are actively fetched from your ElevenLabs enterprise account.'
                : 'To synthesize live custom voice clips and connect cloned enterprise voices, configure ELEVENLABS_API_KEY in Integrations or server environment.')}
          </p>
        </div>
      </div>

      {/* Interactive Speech Synthesis Lab */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
        <div>
          <h2 className="text-base font-bold text-slate-900">Voice Synthesis Testing Lab</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Test spoken greeting articulation directly before deploying to phone trunks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Select Voice Model</label>
            <select
              value={selectedVoiceId}
              onChange={(e) => setSelectedVoiceId(e.target.value)}
              className="mt-1 block w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900"
            >
              {voices.map((v) => (
                <option key={v.voice_id} value={v.voice_id}>
                  {v.name} ({v.category})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700">Sample Text to Synthesize</label>
            <input
              type="text"
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              className="mt-1 block w-full text-xs border border-slate-300 rounded-lg p-2.5"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleSynthesize}
            disabled={synthesizing}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm disabled:opacity-70"
          >
            {synthesizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            <span>Synthesize Voice Sample</span>
          </button>

          {audioUrl && (
            <div className="flex items-center gap-2">
              <audio controls src={audioUrl} autoPlay className="h-8 max-w-xs" />
            </div>
          )}
        </div>

        {synthError && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
            {synthError}
          </div>
        )}
      </div>

      {/* Available Voices Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900">Available Voice Catalog ({voices.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {voices.map((voice) => (
            <div
              key={voice.voice_id}
              className={`p-4 rounded-xl border bg-white shadow-xs flex flex-col justify-between ${
                selectedVoiceId === voice.voice_id ? 'border-indigo-600 ring-1 ring-indigo-600' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-900">{voice.name}</span>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    {voice.category}
                  </span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {voice.description || 'Human-grade natural voice persona.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {voice.labels &&
                    Object.entries(voice.labels).map(([k, v]) => (
                      <span key={k} className="text-[10px] text-slate-500 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
                        {v}
                      </span>
                    ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]">
                  {voice.voice_id}
                </span>
                <button
                  onClick={() => setSelectedVoiceId(voice.voice_id)}
                  className={`text-xs font-semibold ${
                    selectedVoiceId === voice.voice_id ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {selectedVoiceId === voice.voice_id ? 'Selected' : 'Use in Agent'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Supported Languages Matrix */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">Supported Language Matrix</h2>
        </div>
        <p className="text-xs text-slate-500">
          ElevenLabs multilingual voice engine supports accurate pronunciation and regional cadence across these locales:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
          {languages.map((lang) => (
            <div key={lang.code} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
              <span className="text-xs font-semibold text-slate-900 block">{lang.name}</span>
              <span className="text-[11px] text-slate-500 font-mono">{lang.native}</span>
              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{lang.code}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
