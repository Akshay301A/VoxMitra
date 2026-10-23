import type { AgentPlan } from './agentPlan.types.ts';

export function validateBusinessSelection(category: string, customCategory: string): string[] {
  if (!category) return ['Choose a business category to continue.'];
  if (category === 'other' && !customCategory.trim()) {
    return ['Describe your business category to continue.'];
  }
  return [];
}

export function validateBusinessDetails(business: {
  businessName: string;
  description: string;
  category: string;
  customCategory: string;
  primaryObjective: string;
}): string[] {
  const errors: string[] = [];
  if (!business.businessName.trim()) errors.push('Enter your business name.');
  if (business.description.trim().length < 20) {
    errors.push('Add at least 20 characters about what your business does.');
  }
  if (!business.category || (business.category === 'other' && !business.customCategory.trim())) {
    errors.push('Choose and describe your business category.');
  }
  if (!business.primaryObjective) errors.push('Choose the main outcome for this agent.');
  return errors;
}

export function getPlanWarnings(plan: AgentPlan): string[] {
  const warnings: string[] = [];
  if (plan.transfer.enabled && !plan.transfer.destination.trim()) {
    warnings.push('Transfer is enabled but no destination number is set.');
  }
  if (
    plan.callback.enabled &&
    (!plan.callback.askPermission ||
      !plan.callback.confirmDateTimeTimezone ||
      !plan.callback.storeStatus ||
      plan.callback.maxRetries < 0 ||
      !plan.callback.stopOnOptOut ||
      !plan.callback.stopAtRetryLimit)
  ) {
    warnings.push('Review callback consent, confirmation, status, retry, and opt-out rules.');
  }
  if (plan.knowledge.faqs.some((faq) => !faq.question.trim() || !faq.answer.trim())) {
    warnings.push('Complete or remove FAQs that are missing a question or approved answer.');
  }
  if (plan.knowledge.services.length === 0 && plan.knowledge.faqs.length === 0) {
    warnings.push('Add services or FAQs so the agent has approved business knowledge.');
  }
  if (!plan.knowledge.unknownAnswerFallback.trim()) {
    warnings.push('Add a safe fallback for questions the agent cannot answer.');
  }
  return warnings;
}
