// The typed panel↔page message protocol (Step 7.2). Two channels:
//
//  1. Panel ↔ isolated content script — over chrome.tabs.sendMessage / onMessage.
//     Request/response keyed by `requestId`; a separate ABORT message cancels an
//     in-flight scan (the panel owns the AbortController — see ADR 0001 §4).
//  2. Isolated ↔ MAIN-world island — over window.postMessage on the same tab.
//     The MAIN world is the only surface that can read `document.modelContext`;
//     it hands presence (+ declared tool names, for Phase-8 fusion) to the isolated
//     world, which relays it to the panel.
//
// All messages carry a namespaced tag so we never confuse them with unrelated
// page or extension messages sharing the same channels.

import type { ActionType } from '../engine/types';
import type {
  DeclaredToolDef,
  ElementFingerprint,
  ExecOutcome,
  RawScanResult,
} from '../engine/scan-types';

export const PA_MSG = 'pageagent/v1';

// --- Panel → content script -------------------------------------------------
export interface ScanRequest {
  tag: typeof PA_MSG;
  type: 'scan';
  requestId: string;
}
export interface PageInfoRequest {
  tag: typeof PA_MSG;
  type: 'page-info';
  requestId: string;
}
export interface AbortRequest {
  tag: typeof PA_MSG;
  type: 'abort';
  requestId: string;
}
/** Dispatch ONE action against a previously-scanned handle. */
export interface ExecuteRequest {
  tag: typeof PA_MSG;
  type: 'execute';
  requestId: string;
  /** Scan-local handle id from the last scan (maps to a stored fingerprint). */
  handleId: string;
  /** For type/choose actions: the verbatim value the user supplied. */
  value?: string;
  /** When true the content script re-resolves + verifies but does NOT act (gate preview). */
  dryRun?: boolean;
  /**
   * An explicit fingerprint to re-resolve INSTEAD of the (positional, reused) handleId's
   * cached one. The one-tap reverse pins the exact element the toggle acted on, so a between-
   * step re-scan that remapped the handle can't make the undo flip a different control — it
   * re-resolves the pinned fingerprint via the same locate-or-decline path (review finding).
   */
  pinned?: { fingerprint: ElementFingerprint; actionType: ActionType };
}
/** Invoke a site-declared WebMCP tool by name (Step 8.1), via document.modelContext. */
export interface ExecuteDeclaredRequest {
  tag: typeof PA_MSG;
  type: 'execute-declared';
  requestId: string;
  name: string;
  args: Record<string, unknown>;
}
export type PanelToContent =
  | ScanRequest
  | PageInfoRequest
  | AbortRequest
  | ExecuteRequest
  | ExecuteDeclaredRequest;

/**
 * Content → panel PUSH (fire-and-forget via chrome.runtime.sendMessage, NOT a response): the
 * live page drifted since the last scan — the DOM mutated past a threshold or the URL changed
 * — so the tool-set may be stale (Step 8.2). The panel filters these to the tab its tools
 * belong to and flips the header to Stale.
 */
export interface PageChangedNotice {
  tag: typeof PA_MSG;
  type: 'page-changed';
  reason: 'mutation' | 'navigation';
  url: string;
}
export function isPageChangedNotice(v: unknown): v is PageChangedNotice {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as { tag?: unknown }).tag === PA_MSG &&
    (v as { type?: unknown }).type === 'page-changed'
  );
}

// --- Content script → panel (sendResponse payloads) -------------------------
export type ScanResponse =
  | { ok: true; result: RawScanResult }
  | { ok: false; reason: string };

export interface PageInfoResponse {
  ok: true;
  url: string;
  origin: string;
  title: string;
  /** Whether the page declares `document.modelContext` (WebMCP surface). */
  hasModelContext: boolean;
  /** Site-declared WebMCP tools, when present (Phase-8 fusion; [] otherwise). */
  declaredTools: DeclaredToolDef[];
}

export type ExecuteResponse = { ok: true; outcome: ExecOutcome } | { ok: false; reason: string };

/** Result of invoking a site-declared tool (the page's handler return, or an error). */
export type ExecuteDeclaredResponse =
  | { ok: true; result: unknown }
  | { ok: false; reason: string };

export type ContentResponse =
  | ScanResponse
  | PageInfoResponse
  | ExecuteResponse
  | ExecuteDeclaredResponse;

export function isPanelToContent(v: unknown): v is PanelToContent {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as { tag?: unknown }).tag === PA_MSG &&
    typeof (v as { type?: unknown }).type === 'string'
  );
}

// --- Isolated ↔ MAIN world (window.postMessage) -----------------------------
export const PA_WIRE = 'pageagent-wire/v1';

/** Isolated → MAIN: "tell me about document.modelContext". */
export interface WireModelContextQuery {
  channel: typeof PA_WIRE;
  dir: 'to-main';
  type: 'model-context?';
}
/** MAIN → isolated: modelContext presence + the site's declared tools (Step 8.1). */
export interface WireModelContextReply {
  channel: typeof PA_WIRE;
  dir: 'to-isolated';
  type: 'model-context';
  present: boolean;
  declaredTools: DeclaredToolDef[];
}
/** Isolated → MAIN: invoke a declared tool by name (executeTool by object identity). */
export interface WireInvokeQuery {
  channel: typeof PA_WIRE;
  dir: 'to-main';
  type: 'invoke';
  invokeId: string;
  name: string;
  args: Record<string, unknown>;
}
/** MAIN → isolated: the declared tool's result (or an error). */
export interface WireInvokeReply {
  channel: typeof PA_WIRE;
  dir: 'to-isolated';
  type: 'invoke-result';
  invokeId: string;
  ok: boolean;
  result?: unknown;
  error?: string;
}
export type WireMessage =
  | WireModelContextQuery
  | WireModelContextReply
  | WireInvokeQuery
  | WireInvokeReply;

export function isWireMessage(v: unknown): v is WireMessage {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as { channel?: unknown }).channel === PA_WIRE
  );
}
