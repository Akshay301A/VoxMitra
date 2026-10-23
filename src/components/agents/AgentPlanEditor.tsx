import React, { useId } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Plus,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { getPlanWarnings } from '../../agents/agentWizardValidation.ts';
import type {
  AgentPlan,
  AgentPlanField,
  AgentPlanWorkflowStep,
} from '../../agents/agentPlan.types.ts';

interface AgentPlanEditorProps {
  plan: AgentPlan;
  onChange: (plan: AgentPlan) => void;
  mode?: 'edit' | 'overview';
}

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';
const labelClass = 'block text-xs font-semibold text-slate-700';

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <label className={labelClass}>
      {label}
      <input
        id={id}
        className={inputClass}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <label className={labelClass}>
      {label}
      <textarea
        id={id}
        className={`${inputClass} resize-y`}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="mb-5">
        <h3 className="text-base font-semibold text-slate-950">{title}</h3>
        {description && <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function ArrayEditor({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className={labelClass}>{label}</span>
        <button
          type="button"
          onClick={() => onChange([...values, ''])}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Plus className="h-3.5 w-3.5" /> Add item
        </button>
      </div>
      {values.length === 0 && <p className="text-sm text-slate-500">No items added yet.</p>}
      <div className="space-y-2">
        {values.map((value, index) => (
          <div className="flex items-start gap-2" key={`${label}-${index}`}>
            <textarea
              aria-label={`${label} item ${index + 1}`}
              className={`${inputClass} mt-0 min-h-10`}
              rows={2}
              value={value}
              placeholder={placeholder}
              onChange={(event) =>
                onChange(values.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))
              }
            />
            <button
              type="button"
              aria-label={`Remove ${label} item ${index + 1}`}
              onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))}
              className="mt-2 rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function MoveButtons({
  index,
  length,
  move,
  label,
}: {
  index: number;
  length: number;
  move: (from: number, to: number) => void;
  label: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        aria-label={`Move ${label} up`}
        disabled={index === 0}
        onClick={() => move(index, index - 1)}
        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label={`Move ${label} down`}
        disabled={index === length - 1}
        onClick={() => move(index, index + 1)}
        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <ArrowDown className="h-4 w-4" />
      </button>
    </div>
  );
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  const reordered = [...items];
  const [item] = reordered.splice(from, 1);
  reordered.splice(to, 0, item);
  return reordered;
}

export const AgentPlanEditor: React.FC<AgentPlanEditorProps> = ({
  plan,
  onChange,
  mode = 'edit',
}) => {
  const readOnly = mode === 'overview';
  const warnings = getPlanWarnings(plan);
  const updateIdentity = (key: keyof AgentPlan['identity'], value: string) =>
    onChange({ ...plan, identity: { ...plan.identity, [key]: value } });
  const updateKnowledge = (key: keyof AgentPlan['knowledge'], value: string | string[] | AgentPlan['knowledge']['faqs']) =>
    onChange({ ...plan, knowledge: { ...plan.knowledge, [key]: value } });

  const updateField = (index: number, updates: Partial<AgentPlanField>) => {
    onChange({
      ...plan,
      informationFields: plan.informationFields.map((field, i) =>
        i === index ? { ...field, ...updates } : field
      ),
    });
  };
  const updateWorkflow = (index: number, updates: Partial<AgentPlanWorkflowStep>) => {
    onChange({
      ...plan,
      workflow: plan.workflow.map((step, i) => (i === index ? { ...step, ...updates } : step)),
    });
  };
  const updateObjectives = (objectives: string[]) => onChange({ ...plan, objectives });

  return (
    <div className="space-y-5">
      <fieldset disabled={readOnly} className="m-0 min-w-0 space-y-5 border-0 p-0 disabled:opacity-100">
      {!readOnly && warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4" role="status">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-950">
            <TriangleAlert className="h-4 w-4" /> Review before deployment
          </div>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-900">
            {warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </div>
      )}

      <Section title="Agent identity" description="Set the agent’s name, business context, and spoken persona.">
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput label="Suggested agent name" value={plan.identity.name} onChange={(value) => updateIdentity('name', value)} />
          <TextInput label="Communication style" value={plan.identity.tone} onChange={(value) => updateIdentity('tone', value)} />
        </div>
        <TextArea label="Business context" value={plan.identity.businessContext} onChange={(value) => updateIdentity('businessContext', value)} />
        <div className="grid gap-4 md:grid-cols-2">
          <TextArea label="Welcome greeting" value={plan.identity.greeting} onChange={(value) => updateIdentity('greeting', value)} />
          <TextArea label="Closing message" value={plan.identity.closing} onChange={(value) => updateIdentity('closing', value)} />
        </div>
      </Section>

      <Section title="Primary objectives" description="The agent keeps these outcomes in view without inventing business capabilities.">
        <ArrayEditor
          label="Objectives"
          values={plan.objectives}
          onChange={updateObjectives}
          placeholder="Describe one customer outcome"
        />
      </Section>

      <Section title="Information fields" description="Questions are asked only when relevant to the caller’s request.">
        {!readOnly && (
          <button
            type="button"
            onClick={() =>
              onChange({
                ...plan,
                informationFields: [
                  ...plan.informationFields,
                  {
                    id: `field-${Date.now()}`,
                    name: 'new_field',
                    description: '',
                    required: false,
                    validation: 'Plain-language answer',
                    askWhen: 'Ask only when relevant to the request.',
                  },
                ],
              })
            }
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Plus className="h-4 w-4" /> Add question
          </button>
        )}
        {plan.informationFields.map((field, index) => (
          <div className="rounded-xl border border-slate-200 p-4" key={field.id}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Question {index + 1}</span>
              {!readOnly && (
                <div className="flex items-center">
                  <MoveButtons
                    index={index}
                    length={plan.informationFields.length}
                    move={(from, to) => onChange({ ...plan, informationFields: moveItem(plan.informationFields, from, to) })}
                    label={`question ${index + 1}`}
                  />
                  <button
                    type="button"
                    aria-label={`Remove question ${index + 1}`}
                    onClick={() => onChange({ ...plan, informationFields: plan.informationFields.filter((_, i) => i !== index) })}
                    className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <TextInput label="Field name" value={field.name} onChange={(value) => updateField(index, { name: value })} />
              <TextInput label="Validation guidance" value={field.validation} onChange={(value) => updateField(index, { validation: value })} />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <TextArea label="What to collect" value={field.description} onChange={(value) => updateField(index, { description: value })} rows={2} />
              <TextArea label="When to ask" value={field.askWhen} onChange={(value) => updateField(index, { askWhen: value })} rows={2} />
            </div>
            {!readOnly && (
              <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(event) => updateField(index, { required: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Required when this question is relevant
              </label>
            )}
            {readOnly && <p className="mt-2 text-xs text-slate-500">{field.required ? 'Required when relevant' : 'Optional'}</p>}
          </div>
        ))}
      </Section>

      <Section title="Business knowledge" description="Only approved facts and answers should be shared with callers.">
        <div className="grid gap-4 md:grid-cols-2">
          <ArrayEditor
            label="Services and products"
            values={plan.knowledge.services}
            onChange={(value) => updateKnowledge('services', value)}
            placeholder="Service or product"
          />
          <TextArea
            label="Opening hours"
            value={plan.knowledge.openingHours}
            onChange={(value) => updateKnowledge('openingHours', value)}
            rows={4}
          />
        </div>
        <TextArea
          label="Approved contact details"
          value={plan.knowledge.contactDetails}
          onChange={(value) => updateKnowledge('contactDetails', value)}
          rows={2}
        />
        <ArrayEditor
          label="Policies"
          values={plan.knowledge.policies}
          onChange={(value) => updateKnowledge('policies', value)}
          placeholder="A confirmed business policy"
        />
        <ArrayEditor
          label="Approved answers"
          values={plan.knowledge.approvedAnswers}
          onChange={(value) => updateKnowledge('approvedAnswers', value)}
          placeholder="A fact the agent may share"
        />
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className={labelClass}>Frequently asked questions</span>
            {!readOnly && (
              <button
                type="button"
                onClick={() => updateKnowledge('faqs', [...plan.knowledge.faqs, { question: '', answer: '' }])}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Plus className="h-3.5 w-3.5" /> Add FAQ
              </button>
            )}
          </div>
          {plan.knowledge.faqs.length === 0 && <p className="text-sm text-slate-500">No approved FAQs yet.</p>}
          {plan.knowledge.faqs.map((faq, index) => (
            <div className="rounded-xl border border-slate-200 p-3" key={`faq-${index}`}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">FAQ {index + 1}</span>
                {!readOnly && (
                  <MoveButtons
                    index={index}
                    length={plan.knowledge.faqs.length}
                    move={(from, to) =>
                      updateKnowledge('faqs', moveItem(plan.knowledge.faqs, from, to))
                    }
                    label={`FAQ ${index + 1}`}
                  />
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <TextArea label="Question" value={faq.question} onChange={(value) => updateKnowledge('faqs', plan.knowledge.faqs.map((item, i) => i === index ? { ...item, question: value } : item))} rows={2} />
                <TextArea label="Approved answer" value={faq.answer} onChange={(value) => updateKnowledge('faqs', plan.knowledge.faqs.map((item, i) => i === index ? { ...item, answer: value } : item))} rows={2} />
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => updateKnowledge('faqs', plan.knowledge.faqs.filter((_, i) => i !== index))}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-rose-700 hover:text-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove FAQ
                </button>
              )}
            </div>
          ))}
        </div>
        <TextArea
          label="When the agent does not know"
          value={plan.knowledge.unknownAnswerFallback}
          onChange={(value) => updateKnowledge('unknownAnswerFallback', value)}
        />
      </Section>

      <Section title="Conversation workflow" description="Reorder the steps to match how your team handles a call.">
        {!readOnly && (
          <button
            type="button"
            onClick={() =>
              onChange({
                ...plan,
                workflow: [
                  ...plan.workflow,
                  { id: `step-${Date.now()}`, title: 'New step', detail: '' },
                ],
              })
            }
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Plus className="h-4 w-4" /> Add workflow step
          </button>
        )}
        {plan.workflow.map((step, index) => (
          <div className="flex gap-2 rounded-xl border border-slate-200 p-3" key={step.id}>
            <div className="min-w-0 flex-1 space-y-3">
              <TextInput label={`Step ${index + 1}`} value={step.title} onChange={(value) => updateWorkflow(index, { title: value })} />
              <TextArea label="What happens" value={step.detail} onChange={(value) => updateWorkflow(index, { detail: value })} rows={2} />
            </div>
            {!readOnly && (
              <div className="flex shrink-0 flex-col items-center">
                <MoveButtons
                  index={index}
                  length={plan.workflow.length}
                  move={(from, to) => onChange({ ...plan, workflow: moveItem(plan.workflow, from, to) })}
                  label={`workflow step ${index + 1}`}
                />
                <button
                  type="button"
                  aria-label={`Remove workflow step ${index + 1}`}
                  onClick={() => onChange({ ...plan, workflow: plan.workflow.filter((_, i) => i !== index) })}
                  className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </Section>

      <Section title="Transfer rules" description="Availability is never assumed unless a connected service can verify it.">
        {!readOnly && (
          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
            <input
              type="checkbox"
              checked={plan.transfer.enabled}
              onChange={(event) => onChange({ ...plan, transfer: { ...plan.transfer, enabled: event.target.checked } })}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Allow calls to be transferred
          </label>
        )}
        {readOnly && <p className="text-sm text-slate-600">{plan.transfer.enabled ? 'Transfers enabled' : 'Transfers disabled'}</p>}
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput label="Destination number" value={plan.transfer.destination} onChange={(value) => onChange({ ...plan, transfer: { ...plan.transfer, destination: value } })} />
          <TextArea label="When to transfer" value={plan.transfer.conditions} onChange={(value) => onChange({ ...plan, transfer: { ...plan.transfer, conditions: value } })} />
          <TextArea label="When transfer succeeds" value={plan.transfer.successBehavior} onChange={(value) => onChange({ ...plan, transfer: { ...plan.transfer, successBehavior: value } })} />
          <TextArea label="When transfer fails" value={plan.transfer.failureBehavior} onChange={(value) => onChange({ ...plan, transfer: { ...plan.transfer, failureBehavior: value } })} />
        </div>
        <TextArea label="If availability cannot be verified" value={plan.transfer.availabilityFallback} onChange={(value) => onChange({ ...plan, transfer: { ...plan.transfer, availabilityFallback: value } })} />
      </Section>

      <Section title="Callback rules" description="Ask permission before scheduling. At callback time, check whether the caller is available before attempting a transfer. Changes here do not silently modify callbacks that are already scheduled.">
        {!readOnly && (
          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
            <input
              type="checkbox"
              checked={plan.callback.enabled}
              onChange={(event) => onChange({ ...plan, callback: { ...plan.callback, enabled: event.target.checked } })}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Allow callback scheduling
          </label>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            ['askPermission', 'Obtain permission before scheduling'],
            ['confirmDateTimeTimezone', 'Confirm date, time, and timezone'],
            ['storeStatus', 'Store callback status and outcome'],
            ['checkAvailabilityBeforeTransfer', 'Ask if the person is available before transfer'],
            ['offerRescheduling', 'Offer rescheduling if the destination is unavailable'],
            ['stopOnOptOut', 'Stop when the caller opts out'],
            ['stopAtRetryLimit', 'Stop when the retry limit is reached'],
          ] as const).map(([key, text]) => (
            <label className="flex items-start gap-2 text-sm text-slate-700" key={key}>
              <input
                type="checkbox"
                checked={plan.callback[key]}
                onChange={(event) => onChange({ ...plan, callback: { ...plan.callback, [key]: event.target.checked } })}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>{text}</span>
            </label>
          ))}
        </div>
        <TextInput
          label="Maximum callback retries"
          value={String(plan.callback.maxRetries)}
          onChange={(value) => onChange({ ...plan, callback: { ...plan.callback, maxRetries: Math.max(0, Number(value) || 0) } })}
        />
      </Section>

      <Section title="Safety and restrictions" description="Use clear boundaries and escalate rather than guess.">
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-950">
          <ShieldCheck className="h-4 w-4 shrink-0" /> Keep sensitive data collection to the minimum required to help the caller.
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ArrayEditor label="Topics the agent must not answer" values={plan.safety.prohibitedTopics} onChange={(value) => onChange({ ...plan, safety: { ...plan.safety, prohibitedTopics: value } })} placeholder="A topic the agent must decline" />
          <ArrayEditor label="Escalate to a person when" values={plan.safety.escalateWhen} onChange={(value) => onChange({ ...plan, safety: { ...plan.safety, escalateWhen: value } })} placeholder="An escalation trigger" />
        </div>
        <TextArea label="Data minimization rule" value={plan.safety.dataMinimization} onChange={(value) => onChange({ ...plan, safety: { ...plan.safety, dataMinimization: value } })} />
        <ArrayEditor label="Business-specific restrictions" values={plan.safety.businessRestrictions} onChange={(value) => onChange({ ...plan, safety: { ...plan.safety, businessRestrictions: value } })} placeholder="A business-specific restriction" />
      </Section>
      </fieldset>
    </div>
  );
};
