import { GoogleGenAI } from '@google/genai';
import { Agent, AgentConfig, db, CallRecord } from '../db/database.ts';
import { testSpeechSynthesis } from './elevenlabs.ts';
import type { AgentPlan } from '../../src/agents/agentPlan.types.ts';

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

function buildAgentPlanContext(plan: AgentPlan | undefined): string {
  if (!plan) return '';

  const list = (items: string[]) => items.map((item) => `- ${item}`).join('\n');
  const fields = plan.informationFields
    .map(
      (field) =>
        `- ${field.description || field.name}${field.required ? ' [required when relevant]' : ' [optional]'}; ask when: ${field.askWhen}; guidance: ${field.validation}`
    )
    .join('\n');
  const workflow = plan.workflow.map((step, index) => `${index + 1}. ${step.title}: ${step.detail}`).join('\n');
  const faqs = plan.knowledge.faqs
    .filter((faq) => faq.question.trim() && faq.answer.trim())
    .map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`)
    .join('\n');
  const callbackRules = plan.callback.enabled
    ? [
        plan.callback.askPermission ? 'Obtain permission before scheduling.' : '',
        plan.callback.confirmDateTimeTimezone ? 'Confirm the callback date, time, and timezone.' : '',
        plan.callback.storeStatus ? 'Record callback status and outcome.' : '',
        plan.callback.checkAvailabilityBeforeTransfer ? 'At callback time, ask if the person is available before attempting a transfer.' : '',
        plan.callback.offerRescheduling ? 'Offer rescheduling if the destination remains unavailable.' : '',
        plan.callback.stopOnOptOut ? 'Stop immediately if the caller opts out.' : '',
        plan.callback.stopAtRetryLimit ? `Stop after ${plan.callback.maxRetries} configured retries.` : '',
      ]
        .filter(Boolean)
        .join('\n')
    : 'Do not schedule callbacks.';

  return [
    `BUSINESS CONTEXT:\n${plan.identity.businessContext}`,
    `COMMUNICATION STYLE:\n${plan.identity.tone}`,
    `WELCOME:\n${plan.identity.greeting}`,
    `CLOSING:\n${plan.identity.closing}`,
    `STRUCTURED OBJECTIVES:\n${list(plan.objectives)}`,
    `CONVERSATION WORKFLOW:\n${workflow}`,
    `INFORMATION TO COLLECT:\n${fields}`,
    `APPROVED SERVICES OR PRODUCTS:\n${list(plan.knowledge.services) || 'None supplied; do not guess.'}`,
    `APPROVED OPENING HOURS:\n${plan.knowledge.openingHours}`,
    `APPROVED CONTACT DETAILS:\n${plan.knowledge.contactDetails}`,
    `APPROVED POLICIES:\n${list(plan.knowledge.policies) || 'None supplied; do not guess.'}`,
    `APPROVED ANSWERS:\n${list(plan.knowledge.approvedAnswers) || 'None supplied; do not guess.'}`,
    `APPROVED FAQS:\n${faqs || 'No complete FAQs supplied.'}`,
    `UNKNOWN-ANSWER FALLBACK:\n${plan.knowledge.unknownAnswerFallback}`,
    `TRANSFER RULES:\n${plan.transfer.enabled ? `Destination: ${plan.transfer.destination || 'not configured'}\nTrigger: ${plan.transfer.conditions}\nOn success: ${plan.transfer.successBehavior}\nOn failure: ${plan.transfer.failureBehavior}\nAvailability fallback: ${plan.transfer.availabilityFallback}` : 'Transfers are disabled.'}`,
    `CALLBACK RULES:\n${callbackRules}`,
    `SAFETY RESTRICTIONS:\n${list([...plan.safety.prohibitedTopics, ...plan.safety.businessRestrictions])}`,
    `ESCALATE TO A PERSON WHEN:\n${list(plan.safety.escalateWhen)}`,
    `DATA MINIMIZATION:\n${plan.safety.dataMinimization}`,
  ].join('\n\n');
}

export function buildAgentSystemPrompt(
  agent: Agent,
  config: AgentConfig,
  allowSimulatedTransferClaims = true
): string {
  const faqsText = config.business_faqs
    .map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`)
    .join('\n\n');
  const fieldsText = config.contact_fields_to_collect
    .map((field) => `- ${field.label} (${field.name})${field.required ? ' [REQUIRED]' : ''}`)
    .join('\n');

  return `You are ${agent.name}, an AI voice employee on an active business phone call.
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

${buildAgentPlanContext(config.agent_plan)}

CRITICAL VOICE CONVERSATION GUIDELINES:
1. Speak in concise, natural, spoken English (or the selected language). 1 to 2 spoken sentences per turn.
2. Do not use markdown, emojis, asterisks, or numbered lists in your speech reply. This is spoken voice over a phone line.
3. Be respectful, articulate, and focus on moving the conversation forward.
4. ${allowSimulatedTransferClaims ? 'Honor configured transfer rules in the simulated conversation.' : 'Do not claim to transfer or schedule a callback; those actions are not connected.'}
5. Collect only information relevant to the configured objectives and fields.
6. Respect the configured safety restrictions and do not invent business facts.`;
}

export async function processConversationTurn(request: ConversationTurnRequest): Promise<ConversationTurnResponse> {
  const agent = await db.getAgentById(request.agentId, request.businessId);
  const config = await db.getAgentConfig(request.agentId, request.businessId);

  if (!agent || !config) {
    throw new Error('Agent or agent configuration was not found for this business.');
  }

  const systemPrompt = buildAgentSystemPrompt(agent, config);

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
