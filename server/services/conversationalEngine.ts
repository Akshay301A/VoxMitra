import { GoogleGenAI } from '@google/genai';
import { Agent, AgentConfig, db, CallRecord } from '../db/database.ts';
import { testSpeechSynthesis } from './elevenlabs.ts';

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI() : null;

export interface ConversationTurnRequest {
  agentId: string;
  businessId: string;
  conversationHistory: { speaker: 'agent' | 'caller' | 'system'; text: string; timestamp: number }[];
  callerMessage: string;
  voiceId?: string;
}

export interface ConversationTurnResponse {
  replyText: string;
  audioBase64?: string;
  isCompleted: boolean;
  shouldTransfer?: boolean;
  transferReason?: string;
  extractedFields: Record<string, string>;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export async function processConversationTurn(request: ConversationTurnRequest): Promise<ConversationTurnResponse> {
  const agent = db.getAgentById(request.agentId, request.businessId);
  const config = db.getAgentConfig(request.agentId, request.businessId);

  if (!agent || !config) {
    return {
      replyText: "I'm sorry, I am currently experiencing a connection error. Please hold while I connect you.",
      isCompleted: false,
      extractedFields: {},
      sentiment: 'neutral',
    };
  }

  // Build conversational context
  const faqsText = config.business_faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');
  const fieldsText = config.contact_fields_to_collect.map((f) => `- ${f.label} (${f.name})${f.required ? ' [REQUIRED]' : ''}`).join('\n');

  const systemPrompt = `You are ${agent.name}, an AI voice employee on an active business phone call.
Agent Type: ${agent.agent_type}
Language: ${config.supported_languages.join(', ')}

CORE INSTRUCTIONS:
${config.instructions}

BUSINESS OBJECTIVES:
${config.objectives}

BUSINESS KNOWLEDGE & FAQS:
${faqsText || 'Answer general customer questions warmly and helpfully.'}

INFORMATION TO COLLECT DURING THE CALL:
${fieldsText || 'Collect caller name and contact inquiry details.'}

TRANSFER RULES:
${config.transfer_enabled ? `Transfer permitted to ${config.transfer_phone} when: ${config.transfer_conditions}` : 'Transfers are currently disabled.'}

CRITICAL VOICE CONVERSATION GUIDELINES:
1. Speak in concise, natural, spoken English (or the selected language). 1 to 2 spoken sentences per turn.
2. Do not use markdown, emojis, asterisks, or numbered lists in your speech reply. This is spoken voice over a phone line.
3. Be respectful, articulate, and focus on moving the conversation forward.
4. If the caller asks to be transferred and transfer rule is met, politely say you are transferring them right now.
5. In your response JSON, include:
   - "reply": the spoken words to the caller
   - "shouldTransfer": boolean
   - "isCompleted": boolean (true if caller said goodbye, hung up, or call goals are finalized)
   - "extractedFields": object of any collected fields (e.g., {"full_name": "...", "phone": "..."})
   - "sentiment": "positive" | "neutral" | "negative"`;

  // Try Gemini AI if API key is present
  if (ai) {
    try {
      const historyFormatted = request.conversationHistory
        .map((h) => `${h.speaker.toUpperCase()}: ${h.text}`)
        .join('\n');

      const userPrompt = `CALL TRANSCRIPT SO FAR:
${historyFormatted}
CALLER JUST SAID: "${request.callerMessage}"

Respond with JSON only matching schema:
{
  "reply": string,
  "shouldTransfer": boolean,
  "isCompleted": boolean,
  "extractedFields": Record<string, string>,
  "sentiment": "positive" | "neutral" | "negative"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${systemPrompt}\n\n${userPrompt}`,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.4,
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      const reply = parsed.reply || "Thank you. Let me check that for you right away.";

      // Try voice synthesis if ElevenLabs voice is set
      let audioBase64: string | undefined;
      if (process.env.ELEVENLABS_API_KEY && config.voice_id) {
        const speechRes = await testSpeechSynthesis(config.voice_id, reply);
        if (speechRes.success) {
          audioBase64 = speechRes.audioBase64;
        }
      }

      return {
        replyText: reply,
        audioBase64,
        isCompleted: !!parsed.isCompleted,
        shouldTransfer: !!parsed.shouldTransfer,
        transferReason: parsed.shouldTransfer ? config.transfer_conditions : undefined,
        extractedFields: parsed.extractedFields || {},
        sentiment: parsed.sentiment || 'neutral',
      };
    } catch (err) {
      console.warn('Gemini generation fallback used:', err);
    }
  }

  // Rule-based fallback if Gemini API key not present
  const msgLower = request.callerMessage.toLowerCase();
  let reply = "Thank you for sharing that. I've noted your inquiry and our team will follow up promptly.";
  let isCompleted = false;
  let shouldTransfer = false;
  const extracted: Record<string, string> = {};

  if (msgLower.includes('bye') || msgLower.includes('goodbye') || msgLower.includes('thank you that is all')) {
    reply = "Thank you so much for your time. Have a wonderful rest of your day!";
    isCompleted = true;
  } else if (config.transfer_enabled && (msgLower.includes('transfer') || msgLower.includes('manager') || msgLower.includes('human') || msgLower.includes('representative'))) {
    reply = `Certainly. I am transferring you directly to our team at ${config.transfer_phone || 'headquarters'}. Please hold one moment.`;
    shouldTransfer = true;
  } else if (msgLower.includes('hour') || msgLower.includes('open') || msgLower.includes('time')) {
    reply = "We are open Monday through Friday from 9 AM to 6 PM EST. How else may I assist you today?";
  } else if (msgLower.includes('solar') || msgLower.includes('quote') || msgLower.includes('price') || msgLower.includes('cost')) {
    reply = "Our consultations and estimates are complimentary. May I get your name and phone number to arrange this?";
  } else if (msgLower.includes('my name is') || msgLower.includes('i am')) {
    const match = request.callerMessage.match(/(?:my name is|i am)\s+([a-zA-Z\s]+)/i);
    if (match) {
      extracted.name = match[1].trim();
      reply = `Thank you, ${extracted.name}. What is the best phone number or email to reach you?`;
    }
  }

  return {
    replyText: reply,
    isCompleted,
    shouldTransfer,
    extractedFields: extracted,
    sentiment: 'neutral',
  };
}
