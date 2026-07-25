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

import type { RawScanResult } from '../engine/scan-types';

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
export type PanelToContent = ScanRequest | PageInfoRequest | AbortRequest;

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
  /** Names of site-declared tools, when present (Phase-8 fusion; [] otherwise). */
  declaredToolNames: string[];
}

export type ContentResponse = ScanResponse | PageInfoResponse;

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
/** MAIN → isolated: modelContext presence + declared tool names. */
export interface WireModelContextReply {
  channel: typeof PA_WIRE;
  dir: 'to-isolated';
  type: 'model-context';
  present: boolean;
  toolNames: string[];
}
export type WireMessage = WireModelContextQuery | WireModelContextReply;

export function isWireMessage(v: unknown): v is WireMessage {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as { channel?: unknown }).channel === PA_WIRE
  );
}
