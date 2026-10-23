import type { AgentType, FAQItem } from '../types.ts';

export type BusinessCategory =
  | 'healthcare'
  | 'real-estate'
  | 'education'
  | 'automotive'
  | 'e-commerce'
  | 'hospitality'
  | 'professional-services'
  | 'local-services'
  | 'other';

export interface BusinessIntake {
  businessName: string;
  category: BusinessCategory;
  customCategory: string;
  description: string;
  website: string;
  location: string;
  timezone: string;
  services: string[];
  openingHours: string;
  contactDetails: string;
  faqs: FAQItem[];
  primaryObjective: AgentType;
  supportedLanguages: string[];
  transferDestination: string;
  operatingRules: string[];
}

export interface AgentPlanField {
  id: string;
  name: string;
  description: string;
  required: boolean;
  validation: string;
  askWhen: string;
}

export interface AgentPlanWorkflowStep {
  id: string;
  title: string;
  detail: string;
}

export interface AgentPlan {
  generationMode: 'demo';
  business: BusinessIntake;
  identity: {
    name: string;
    businessContext: string;
    tone: string;
    greeting: string;
    closing: string;
  };
  objectives: string[];
  informationFields: AgentPlanField[];
  knowledge: {
    services: string[];
    openingHours: string;
    contactDetails: string;
    faqs: FAQItem[];
    policies: string[];
    approvedAnswers: string[];
    unknownAnswerFallback: string;
  };
  workflow: AgentPlanWorkflowStep[];
  transfer: {
    enabled: boolean;
    destination: string;
    conditions: string;
    successBehavior: string;
    failureBehavior: string;
    availabilityFallback: string;
  };
  callback: {
    enabled: boolean;
    askPermission: boolean;
    confirmDateTimeTimezone: boolean;
    storeStatus: boolean;
    maxRetries: number;
    checkAvailabilityBeforeTransfer: boolean;
    offerRescheduling: boolean;
    stopOnOptOut: boolean;
    stopAtRetryLimit: boolean;
  };
  safety: {
    prohibitedTopics: string[];
    escalateWhen: string[];
    dataMinimization: string;
    businessRestrictions: string[];
  };
  voice: {
    provider: 'elevenlabs';
    voiceId: string;
    voiceName: string;
    language: string;
    speakingRate: number;
  };
}

export interface AgentWizardDraft {
  business: BusinessIntake;
  plan: AgentPlan | null;
  voiceId: string;
  voiceName: string;
  primaryLanguage: string;
  speakingRate: number;
}
