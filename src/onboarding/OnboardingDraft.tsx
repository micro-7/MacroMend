import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { DietType } from '@/core/diet';
import { DEFAULT_SLOTS, type Slot } from '@/core/slots';
import type { Goal } from '@/core/targets';
import { EMPTY_TARGETS_DRAFT, type TargetsDraft } from '@/core/targetsDraft';
import type { StapleDraft } from './buildProfile';

/** Everything the user has chosen so far. Kept in memory only; saved in one go on the last step. */
export interface OnboardingDraft {
  goal: Goal | null;
  targets: TargetsDraft;
  dietType: DietType | null;
  slots: Slot[];
  staples: StapleDraft[];
}

const INITIAL: OnboardingDraft = {
  goal: null,
  targets: EMPTY_TARGETS_DRAFT,
  dietType: null,
  slots: DEFAULT_SLOTS,
  staples: [],
};

interface Value {
  draft: OnboardingDraft;
  update: (patch: Partial<OnboardingDraft>) => void;
}

const Ctx = createContext<Value | null>(null);

export function OnboardingDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<OnboardingDraft>(INITIAL);
  const update = useCallback((patch: Partial<OnboardingDraft>) => setDraft((d) => ({ ...d, ...patch })), []);
  const value = useMemo(() => ({ draft, update }), [draft, update]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOnboardingDraft(): Value {
  const v = useContext(Ctx);
  if (!v) throw new Error('useOnboardingDraft must be used inside <OnboardingDraftProvider>');
  return v;
}
