// Frozen prop contracts for the Phase-3 surfaces. App owns state + the EnginePort
// stub and passes these down; the Header and Chat components are presentational and
// depend ONLY on these interfaces (the stub↔engine seam stays behind App).

import type { RefObject } from 'react';
import type { Turn } from '../engine/port';
import type { FreshnessState, GatePreview, LocusState, PageInfo, Tool } from '../engine/types';

export interface HeaderProps {
  page: PageInfo;
  freshness: FreshnessState;
  locus: LocusState;
  /** True while the intent-loop is acting — Stop must be visible + reachable. */
  acting: boolean;
  onRescan: () => void;
  onStop: () => void;
}

export interface ChatProps {
  page: PageInfo;
  /** Current tool-set — used to derive page-grounded example prompts. */
  tools: Tool[];
  turns: Turn[];
  acting: boolean;
  /** Live working-state text announced via role=status while acting. */
  status: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onSend: (text: string) => void;
  onStop: () => void;
  /** Fire the one-tap inverse for a Tier-0 report turn (trust ledger). */
  onReverse: (turnId: string) => void;
  /** Pick a clarification choice chip. */
  onChoice: (choice: string) => void;
}

export interface ConfirmGateProps {
  preview: GatePreview;
  /** Fired only after the deliberate approve act (Tier-2: after value re-acknowledgment). */
  onApprove: () => void;
  onCancel: () => void;
}

export interface LocusProps {
  locus: LocusState;
  /** Later (voice): audio is leaving the device for cloud STT — suppresses the resting
   *  affordance and lights an always-on audio-egress marker naming what left. */
  audioEgress?: boolean;
}
