// Raw scan output — the shape the content-script scanner (Step 7.3) produces and
// tool-gen (Step 7.4) consumes. Deliberately separate from the user-facing domain
// types in `types.ts`: a ScannedElement is a live-DOM observation carrying a
// re-resolvable fingerprint (Spike B), whereas a Tool is the generated, browsable
// artefact. The engine maps RawScanResult + tool-gen → the public ScanResult.

import type { ActionType, Coverage } from './types';

/**
 * Multi-signal fingerprint captured at scan time so the element can be re-resolved
 * and VERIFIED before an action (Spike B / Steps 8.2/8.4/8.5). No single signal is
 * trusted: `role`+`name` generate candidates, `stableId` confirms, `nearbyText` +
 * `ordinal` break ties, and a mandatory verification gate returns the four-outcome
 * union — never a positional fallback that acts. Positional data (`ordinal`) is a
 * tiebreak only, never a locator that acts on its own.
 */
export interface ElementFingerprint {
  /** Computed or explicit ARIA role (e.g. `button`, `link`, `textbox`). */
  role: string;
  /** Normalized accessible name; `''` when none could be read. */
  name: string;
  /** Lowercased tagName, e.g. `button`, `a`, `input`, `select`. */
  tag: string;
  /** `input[type]` when tag === 'input'. */
  inputType?: string;
  /** `id`, ONLY when it looks author-stable (not a framework-generated hash). */
  stableId?: string;
  /** Short disambiguating nearby/label text. */
  nearbyText?: string;
  /** Ordinal within the same {role+name} group at scan time (tiebreak only). */
  ordinal: number;
}

/** One actionable element detected by the scanner. */
export interface ScannedElement {
  /** Scan-local id assigned by the scanner (e.g. `el-3`); maps 1:1 to a Tool. */
  handleId: string;
  actionType: ActionType;
  role: string;
  /** Best accessible name; `''` when none found (see `unlabeled`). */
  name: string;
  /** True when NO accessible name could be read (REQ-SCAN-3 — never invent one). */
  unlabeled: boolean;
  tag: string;
  inputType?: string;
  visible: boolean;
  enabled: boolean;
  /** Short nearby/label text used for naming + disambiguation. */
  nearbyText?: string;
  fingerprint: ElementFingerprint;
}

/**
 * Scanner output before tool-gen. A TOTAL failure is not represented here — it is
 * signalled at the message layer (SCAN_FAILED) and mapped to ScanResult 'failed'.
 * `partial` carries an honest `note` naming what could not be covered.
 */
export interface RawScanResult {
  status: 'ok' | 'partial';
  elements: ScannedElement[];
  coverage: Coverage;
  note?: string;
}

/**
 * What the executor OBSERVED about the page after acting (Step 9.1). `verified` is
 * true only when a concrete, checkable change was seen (toggle flipped, field now
 * holds the value, URL changed, a confirmation appeared) → the ONLY thing that earns
 * a "Done". Otherwise the action was dispatched but its effect is unconfirmed.
 */
export interface ObservedChange {
  /** Plain sentence describing the observed post-state, e.g. 'the field now shows "failed".' */
  summary: string;
  /** True only when a concrete page-state change was observed (→ certainty 'done'). */
  verified: boolean;
  /** True when the action navigated / changed the URL. */
  urlChanged?: boolean;
}

/**
 * The outcome the content-script executor reports for one action (Steps 8.4/8.5/9.1).
 * `declined` is the locate-or-decline fail-safe: the element could not be re-resolved
 * and verified, or was not live/visible/enabled — we did NOTHING rather than act on the
 * wrong node (Spike B). `reason` in `declined` reuses the re-resolution + liveness words.
 */
/**
 * A WebMCP tool the page itself declared via `document.modelContext` (Step 8.1),
 * serialized for the wire (the live RegisteredTool object stays in the MAIN world for
 * invocation by identity). `origin` is the frame origin that declared it (provenance).
 */
export interface DeclaredToolDef {
  name: string;
  title?: string;
  description?: string;
  /** JSON Schema for the tool's arguments. */
  inputSchema?: unknown;
  origin?: string;
}

export type ExecOutcome =
  // Dry-run success: the element re-resolved + verified uniquely and is actionable.
  // `label` is its FRESH on-page name/text for a truthful gate preview (locate-or-decline).
  | { kind: 'located'; label: string }
  | { kind: 'executed'; observed: ObservedChange }
  | {
      kind: 'declined';
      reason: 'not-found' | 'ambiguous' | 'stale' | 'hidden' | 'disabled' | 'unknown-handle';
      detail?: string;
    };
