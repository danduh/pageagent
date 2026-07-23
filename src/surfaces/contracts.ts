// Frozen prop contracts for the Phase-3 surfaces. App owns state + the EnginePort
// stub and passes these down; the Header and Chat components are presentational and
// depend ONLY on these interfaces (the stub↔engine seam stays behind App).

import type { RefObject } from 'react';
import type { Turn } from '../engine/port';
import type {
  FreshnessState,
  GatePreview,
  LocusState,
  PageInfo,
  ScanResult,
  Tool,
} from '../engine/types';

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

export interface ToolsProps {
  tools: Tool[];
  /** Run one tool by hand (Execute). value is the verbatim input for type/choose tools;
   *  App classifies risk and routes destructive runs through the Confirm-gate. */
  onRun: (tool: Tool, value?: string) => void;
}

export interface ScanProps {
  freshness: FreshnessState;
  /** The most recent scan result (coverage-honesty + element→Tool mapping); null before first scan. */
  result: ScanResult | null;
  onRescan: () => void;
}

export interface AvailabilityProps {
  /** Honest capability reason, e.g. "On-device model unavailable". */
  reason: string;
  /** Whether the labeled cloud-fallback opt-in is offered. */
  cloudOffered: boolean;
  /** Explicit, per-use opt-in (shown only after the trade is stated). */
  onUseCloudOnce: () => void;
}
