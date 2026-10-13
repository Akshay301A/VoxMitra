/**
 * ElevenLabs Conversational Voice Integration Layer
 * Secure server-side interface for voice fetching and speech synthesis
 */

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  preview_url?: string;
  labels?: Record<string, string>;
  description?: string;
}

export interface VoiceCatalogResponse {
  configured: boolean;
  provider: 'elevenlabs';
  voices: ElevenLabsVoice[];
  supported_languages: { code: string; name: string; native: string }[];
  message?: string;
}

// Official standard ElevenLabs multilingual supported languages
export const SUPPORTED_LANGUAGES = [
  { code: 'en-US', name: 'English (US)', native: 'English' },
  { code: 'en-GB', name: 'English (UK)', native: 'British English' },
  { code: 'en-IN', name: 'English (India)', native: 'Indian English' },
  { code: 'hi-IN', name: 'Hindi', native: 'हिन्दी' },
  { code: 'es-ES', name: 'Spanish (Spain)', native: 'Español' },
  { code: 'es-MX', name: 'Spanish (Mexico)', native: 'Español Latino' },
  { code: 'fr-FR', name: 'French', native: 'Français' },
  { code: 'de-DE', name: 'German', native: 'Deutsch' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', native: 'Português' },
  { code: 'it-IT', name: 'Italian', native: 'Italiano' },
  { code: 'ja-JP', name: 'Japanese', native: '日本語' },
  { code: 'ar-SA', name: 'Arabic', native: 'العربية' },
  { code: 'zh-CN', name: 'Mandarin Chinese', native: '中文' },
];

// Official ElevenLabs standard voice templates for initial configuration preview
const STANDARD_VOICES: ElevenLabsVoice[] = [
  {
    voice_id: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel',
    category: 'premade',
    description: 'Calm, confident, professional young female voice. Ideal for receptionists and corporate inquiries.',
    labels: { gender: 'female', accent: 'american', age: 'young', use_case: 'conversational' },
  },
  {
    voice_id: 'pNInz6obpgDQGcFmaJgB',
    name: 'Adam',
    category: 'premade',
    description: 'Deep, energetic, persuasive American male voice. Excellent for outbound sales and speed-to-lead qualification.',
    labels: { gender: 'male', accent: 'american', age: 'middle_aged', use_case: 'sales' },
  },
  {
    voice_id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella',
    category: 'premade',
    description: 'Warm, empathetic, expressive female voice. Best for customer care, callbacks, and relationship nurturing.',
    labels: { gender: 'female', accent: 'american', age: 'young', use_case: 'customer_support' },
  },
  {
    voice_id: 'VR6AewLTigWG4xSOukaG',
    name: 'Arnold',
    category: 'premade',
    description: 'Crisp, articulate, authoritative male voice. Best for dispatch, scheduling confirmation, and executive reception.',
    labels: { gender: 'male', accent: 'american', age: 'middle_aged', use_case: 'narrative' },
  },
  {
    voice_id: 'ErXwobaYiN019PkySvjV',
    name: 'Antoni',
    category: 'premade',
    description: 'Friendly, modern European/neutral accent with upbeat cadence.',
    labels: { gender: 'male', accent: 'neutral', age: 'young', use_case: 'casual' },
  },
  {
    voice_id: 'AZnzlk1XvdvUeBnXmlld',
    name: 'Domi',
    category: 'premade',
    description: 'Energetic, direct, strong female tone for fast customer outreach.',
    labels: { gender: 'female', accent: 'american', age: 'young', use_case: 'direct' },
  },
];

export async function getVoiceCatalog(customApiKey?: string): Promise<VoiceCatalogResponse> {
  const apiKey = customApiKey || process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return {
      configured: false,
      provider: 'elevenlabs',
      voices: STANDARD_VOICES,
      supported_languages: SUPPORTED_LANGUAGES,
      message: 'ELEVENLABS_API_KEY is not configured in server environment. Showing official standard voice presets. Add your key in Integrations to enable real-time speech synthesis and cloned voices.',
    };
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('ElevenLabs API error response:', response.status, errBody);
      return {
        configured: false,
        provider: 'elevenlabs',
        voices: STANDARD_VOICES,
        supported_languages: SUPPORTED_LANGUAGES,
        message: `ElevenLabs API request failed with status ${response.status}. Please check your API key validity.`,
      };
    }

    const data: any = await response.json();
    const fetchedVoices: ElevenLabsVoice[] = (data.voices || []).map((v: any) => ({
      voice_id: v.voice_id,
      name: v.name,
      category: v.category || 'custom',
      preview_url: v.preview_url,
      description: v.description || (v.labels ? Object.values(v.labels).join(', ') : ''),
      labels: v.labels || {},
    }));

    return {
      configured: true,
      provider: 'elevenlabs',
      voices: fetchedVoices.length > 0 ? fetchedVoices : STANDARD_VOICES,
      supported_languages: SUPPORTED_LANGUAGES,
    };
  } catch (err: any) {
    console.error('Failed to connect to ElevenLabs API:', err);
    return {
      configured: false,
      provider: 'elevenlabs',
      voices: STANDARD_VOICES,
      supported_languages: SUPPORTED_LANGUAGES,
      message: `Error contacting ElevenLabs: ${err.message}`,
    };
  }
}

export async function testSpeechSynthesis(voiceId: string, text: string, customApiKey?: string): Promise<{ success: boolean; audioBase64?: string; error?: string }> {
  const apiKey = customApiKey || process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: 'ELEVENLABS_API_KEY is required for live audio synthesis. Configure your key in Integrations.',
    };
  }

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: `Synthesis error ${response.status}: ${errText}` };
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    return { success: true, audioBase64: `data:audio/mpeg;base64,${base64}` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
