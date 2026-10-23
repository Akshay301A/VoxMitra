import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { api } from '../../api/client.ts';

interface TourStep {
  target: string;
  page: string;
  title: string;
  description: string;
}

interface ProductTourProps {
  isOpen: boolean;
  currentPage: string;
  startAtStep: number;
  onNavigate: (page: string) => void;
  onShowNavigation: (show: boolean) => void;
  onFinish: () => void;
}

const steps: TourStep[] = [
  { target: 'nav-dashboard', page: 'dashboard', title: 'Your dashboard', description: 'This is your workspace for call activity, agent performance, and business outcomes. Metrics may be empty until there is activity.' },
  { target: 'nav-agents', page: 'agents', title: 'AI agents', description: 'Manage configured assistants here. Saving a draft stores a configuration; testing previews supported behavior. Live deployment is not available unless the product confirms it.' },
  { target: 'nav-calls', page: 'calls', title: 'Call records', description: 'Review supported call records, statuses, transcripts, summaries, and outcomes. Real phone-call data requires the relevant integrations and completed calls.' },
  { target: 'nav-testing', page: 'testing', title: 'Test your setup', description: 'Use the Interactive Voice Lab for supported agent testing. It does not place an outbound campaign call.' },
  { target: 'nav-wallet', page: 'wallet', title: 'Usage wallet', description: 'Subscription minutes and prepaid wallet credits are separate. Add Credits is manual; automatic recharge remains unavailable until authorization is connected.' },
  { target: 'nav-billing', page: 'billing', title: 'Plans and rates', description: 'Review subscription allowances and configured usage rates. The wallet explains the current consumption order where the billing engine defines it.' },
  { target: 'nav-integrations', page: 'integrations', title: 'Integrations', description: 'Configure available connections here. Features that depend on a provider will not work until that integration is connected.' },
  { target: 'nav-settings', page: 'settings', title: 'Workspace settings', description: 'Manage your business profile and workspace details. There are no separate contacts or campaign pages in this workspace yet.' },
];

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const ProductTour: React.FC<ProductTourProps> = ({
  isOpen,
  currentPage,
  startAtStep,
  onNavigate,
  onShowNavigation,
  onFinish,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [highlight, setHighlight] = useState<HighlightRect | null>(null);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const step = steps[stepIndex];

  useEffect(() => {
    if (!isOpen) return;
    setStepIndex(Math.max(0, Math.min(startAtStep, steps.length - 1)));
    setSaveError('');
  }, [isOpen, startAtStep]);

  useEffect(() => {
    if (!isOpen || !step) return;
    onShowNavigation(true);
    if (currentPage !== step.page) onNavigate(step.page);

    let missingTargetTimeout = 0;
    const update = () => {
      const element = document.querySelector<HTMLElement>(`[data-tour-target="${step.target}"]`);
      if (!element) {
        setHighlight(null);
        missingTargetTimeout = window.setTimeout(() => {
          setStepIndex((index) => Math.min(index + 1, steps.length - 1));
        }, 500);
        return;
      }
      element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      const rect = element.getBoundingClientRect();
      setHighlight({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    };
    const delay = window.setTimeout(update, 120);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.clearTimeout(delay);
      window.clearTimeout(missingTargetTimeout);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [currentPage, isOpen, onNavigate, onShowNavigation, step]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) void finishTour();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, saving]);

  const finishTour = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await api.saveOnboarding({ tourCompleted: true, pendingAgentStart: false, tourStep: steps.length });
      onFinish();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save tour progress. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const move = async (direction: -1 | 1) => {
    const nextIndex = stepIndex + direction;
    if (nextIndex < 0) return;
    if (nextIndex >= steps.length) {
      void finishTour();
      return;
    }
    const targetStep = steps[nextIndex];
    setSaving(true);
    setSaveError('');
    try {
      await api.saveOnboarding({ tourStep: nextIndex });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save tour progress. Please try again.');
      setSaving(false);
      return;
    }
    if (currentPage !== targetStep.page) onNavigate(targetStep.page);
    setStepIndex(nextIndex);
    setHighlight(null);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[60]" aria-label="Product tour">
      {highlight ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed rounded-xl border-2 border-blue-400 shadow-[0_0_0_9999px_rgba(2,6,23,0.72)] transition-all duration-200"
          style={{ top: highlight.top - 4, left: highlight.left - 4, width: highlight.width + 8, height: highlight.height + 8 }}
        />
      ) : <div aria-hidden="true" className="fixed inset-0 bg-slate-950/70" />}
      <section role="dialog" aria-modal="true" aria-labelledby="product-tour-title" className="fixed inset-x-3 bottom-3 z-[61] mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[min(26rem,calc(100vw-3rem))]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Step {stepIndex + 1} of {steps.length}</p>
            <h2 id="product-tour-title" className="mt-1 text-lg font-bold text-slate-950">{step.title}</h2>
          </div>
          <button type="button" onClick={() => void finishTour()} disabled={saving} aria-label="Skip tour" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.description}</p>
        {saveError && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-800">{saveError}</p>}
        <div className="mt-5 flex items-center justify-between gap-3">
          <button type="button" onClick={() => void move(-1)} disabled={stepIndex === 0 || saving} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"><ArrowLeft className="h-4 w-4" />Back</button>
          <button type="button" onClick={() => void finishTour()} disabled={saving} className="mr-auto rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-50">Skip Tour</button>
          <button type="button" onClick={() => void move(1)} disabled={saving} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{stepIndex === steps.length - 1 ? <><Check className="h-4 w-4" />Finish Tour</> : <>Next<ArrowRight className="h-4 w-4" /></>}</button>
        </div>
      </section>
    </div>
  );
};
