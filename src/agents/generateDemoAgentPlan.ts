import type { AgentPlan, BusinessIntake } from './agentPlan.types.ts';
import type { AgentType } from '../types.ts';

function makeId(prefix: string, index: number): string {
  return `${prefix}-${index + 1}`;
}

function getCategoryName(business: BusinessIntake): string {
  const names: Record<string, string> = {
    healthcare: 'healthcare and clinics',
    'real-estate': 'real estate',
    education: 'education',
    automotive: 'automotive services',
    'e-commerce': 'e-commerce',
    hospitality: 'hospitality and restaurants',
    'professional-services': 'financial and professional services',
    'local-services': 'home and local services',
    other: business.customCategory || 'business',
  };
  return names[business.category] || 'business';
}

function getAgentName(objective: AgentType, businessName: string): string {
  const suffix =
    objective === 'instant_lead'
      ? 'Lead Assistant'
      : objective === 'bulk_caller'
        ? 'Outreach Assistant'
        : 'Reception Assistant';
  return `${businessName} ${suffix}`;
}

function getSafetyRules(business: BusinessIntake): AgentPlan['safety'] {
  const isHealthcare = business.category === 'healthcare';
  return {
    prohibitedTopics: isHealthcare
      ? [
          'Do not diagnose, interpret symptoms, or recommend treatment or medication.',
          'Do not promise a clinical outcome or give emergency medical advice.',
        ]
      : [
          'Do not invent prices, availability, policies, or guarantees.',
          'Do not provide regulated or professional advice outside approved business information.',
        ],
    escalateWhen: [
      'The caller asks for a human.',
      'The request is urgent, sensitive, or outside the approved information.',
      'The agent cannot confidently answer from the supplied business details.',
    ],
    dataMinimization:
      'Ask only for information needed to handle the caller’s request. Explain why a detail is needed and do not request sensitive data.',
    businessRestrictions: business.operatingRules.length
      ? business.operatingRules
      : ['Use only business facts supplied and approved by the business.'],
  };
}

export function generateDemoAgentPlan(
  business: BusinessIntake,
  voice: AgentPlan['voice']
): AgentPlan {
  const isHealthcare = business.category === 'healthcare';
  const objectives = [
    'Answer enquiries using only the approved business information.',
    'Understand the caller’s reason for contacting the business.',
    'Collect only information relevant to the caller’s request.',
    'Offer an appointment request or callback when supported by the business.',
    'Offer a human transfer when requested and a destination is configured.',
    'Confirm the outcome and record the call disposition.',
  ];

  const fieldDefinitions = isHealthcare
    ? [
        ['caller_name', 'Caller name', 'Name the caller would like the clinic to use.', true, 'Ask after greeting and before follow-up.', 'Caller’s name'],
        ['phone', 'Contact number', 'A number for a requested follow-up.', true, 'Ask only when a callback or contact is requested.', 'Valid phone number'],
        ['general_concern', 'General reason for calling', 'A brief, non-clinical description of the enquiry.', false, 'Ask after confirming how the clinic can help.', 'Do not collect detailed medical history'],
        ['preferred_appointment', 'Preferred appointment time', 'The caller’s preferred day and time for an appointment request.', false, 'Ask only if the caller wants an appointment.', 'Confirm date, time, and timezone'],
      ]
    : [
        ['caller_name', 'Caller name', 'Name the caller would like the business to use.', true, 'Ask naturally after understanding the request.', 'Caller’s name'],
        ['phone', 'Contact number', 'A number for a requested follow-up.', true, 'Ask only when a callback or contact is requested.', 'Valid phone number'],
        ['inquiry_topic', 'Enquiry', 'The caller’s main question or service interest.', false, 'Ask after the caller describes why they called.', 'Short plain-language summary'],
        ['preferred_follow_up', 'Preferred follow-up time', 'When the caller would like the business to get back to them.', false, 'Ask when a callback or appointment request is made.', 'Confirm date, time, and timezone'],
      ];

  const workflowTitles = [
    ['Welcome', 'Greet the caller politely and identify the business.'],
    ['Understand intent', 'Ask an open question and listen for the caller’s goal.'],
    ['Ask relevant questions', 'Collect only the details required for this request.'],
    ['Handle the request', 'Answer from approved knowledge, or arrange a supported next step.'],
    ['Resolve or follow up', 'Transfer, request an appointment, capture a lead, or schedule a permitted callback.'],
    ['Confirm and close', 'Repeat the agreed outcome, invite any final question, and close courteously.'],
  ];

  return {
    generationMode: 'demo',
    business,
    identity: {
      name: getAgentName(business.primaryObjective, business.businessName),
      businessContext: `${business.businessName} is a ${getCategoryName(business)} business. ${business.description}`.trim(),
      tone: 'Warm, concise, calm, and professional. Use plain language and ask one question at a time.',
      greeting: `Hello, thank you for calling ${business.businessName}. How can I help you today?`,
      closing: 'Thank you for calling. I’ve noted the next step we discussed. Have a good day.',
    },
    objectives,
    informationFields: fieldDefinitions.map(
      ([name, description, detail, required, askWhen, validation], index) => ({
        id: makeId('field', index),
        name: String(name),
        description: String(detail),
        required: Boolean(required),
        validation: String(validation),
        askWhen: String(askWhen),
      })
    ),
    knowledge: {
      services: business.services,
      openingHours: business.openingHours || 'Not provided. Do not guess business hours.',
      contactDetails: business.contactDetails || 'Not provided. Do not guess contact details.',
      faqs: business.faqs,
      policies: business.operatingRules,
      approvedAnswers: [
        business.services.length
          ? `Describe only these listed services: ${business.services.join(', ')}.`
          : 'No services have been supplied yet. Ask a human to confirm service-specific questions.',
        business.openingHours
          ? `Share these supplied opening hours: ${business.openingHours}.`
          : 'Opening hours were not provided. Do not guess; offer a human follow-up.',
      ],
      unknownAnswerFallback:
        'I want to make sure you get accurate information. May I arrange for a team member to follow up?',
    },
    workflow: workflowTitles.map(([title, detail], index) => ({
      id: makeId('step', index),
      title,
      detail,
    })),
    transfer: {
      enabled: Boolean(business.transferDestination),
      destination: business.transferDestination,
      conditions: 'Transfer when the caller asks for a person or the request needs human attention.',
      successBehavior: 'Explain that the caller is being connected, then transfer only through a supported telephony integration.',
      failureBehavior: 'Apologize briefly, explain the transfer did not complete, and offer a callback with the caller’s permission.',
      availabilityFallback:
        'Do not assume a person is available. If availability cannot be verified, explain that clearly and offer a callback.',
    },
    callback: {
      enabled: true,
      askPermission: true,
      confirmDateTimeTimezone: true,
      storeStatus: true,
      maxRetries: 2,
      checkAvailabilityBeforeTransfer: true,
      offerRescheduling: true,
      stopOnOptOut: true,
      stopAtRetryLimit: true,
    },
    safety: getSafetyRules(business),
    voice,
  };
}
