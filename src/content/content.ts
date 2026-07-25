// Isolated-world content script — the panel↔page bridge (Step 7.2) and the DOM
// scanner's host. It has full DOM access but no page-JS access (the anti-spoof /
// prompt-injection boundary). It answers the panel's typed requests over
// chrome.runtime.onMessage and caches WebMCP presence handed to it by the MAIN-world
// island. Tool GENERATION stays in the panel/engine — this side only observes the DOM.

import { scanDom } from './scanner';
import { executeAction } from './execute';
import {
  isPanelToContent,
  isWireMessage,
  PA_WIRE,
  type ExecuteResponse,
  type PageInfoResponse,
  type ScanResponse,
} from './messages';
import type { ActionType } from '../engine/types';
import type { ElementFingerprint } from '../engine/scan-types';

// WebMCP presence, cached from the MAIN-world island's postMessage.
let modelContextPresent = false;
let declaredToolNames: string[] = [];

window.addEventListener('message', (ev: MessageEvent) => {
  const d: unknown = ev.data;
  if (!isWireMessage(d)) return;
  if (d.dir === 'to-isolated' && d.type === 'model-context') {
    modelContextPresent = d.present;
    declaredToolNames = d.toolNames;
  }
});

// Ask the MAIN world proactively, in case its load-time post preceded our listener.
window.postMessage({ channel: PA_WIRE, dir: 'to-main', type: 'model-context?' }, '*');

// Request ids the panel has asked us to abort. scanDom() polls this at its yield
// points; for the current synchronous scan it only takes effect if the abort arrived
// before the scan started (a chunked async scan would honour mid-scan aborts).
const abortedRequests = new Set<string>();

// Last scan's handle → fingerprint map, so EXECUTE can re-resolve the intended control
// against the LIVE DOM at act-time (not the scan-time node). Cleared on every re-scan.
const scanCache = new Map<string, { fingerprint: ElementFingerprint; actionType: ActionType }>();

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isPanelToContent(message)) return; // not ours — let other listeners handle it

  switch (message.type) {
    case 'abort': {
      abortedRequests.add(message.requestId);
      sendResponse({ ok: true });
      return;
    }
    case 'page-info': {
      const resp: PageInfoResponse = {
        ok: true,
        url: location.href,
        origin: location.origin,
        title: document.title,
        hasModelContext: modelContextPresent,
        declaredToolNames,
      };
      sendResponse(resp);
      return;
    }
    case 'scan': {
      const requestId = message.requestId;
      try {
        const result = scanDom(document, { shouldAbort: () => abortedRequests.has(requestId) });
        scanCache.clear();
        for (const el of result.elements) {
          scanCache.set(el.handleId, { fingerprint: el.fingerprint, actionType: el.actionType });
        }
        const resp: ScanResponse = { ok: true, result };
        sendResponse(resp);
      } catch (e) {
        const resp: ScanResponse = { ok: false, reason: (e as Error).message };
        sendResponse(resp);
      } finally {
        abortedRequests.delete(requestId);
      }
      return;
    }
    case 'execute': {
      const entry = scanCache.get(message.handleId);
      if (!entry) {
        const resp: ExecuteResponse = { ok: true, outcome: { kind: 'declined', reason: 'unknown-handle' } };
        sendResponse(resp);
        return;
      }
      try {
        const outcome = executeAction({
          fingerprint: entry.fingerprint,
          actionType: entry.actionType,
          value: message.value,
          dryRun: message.dryRun,
        });
        const resp: ExecuteResponse = { ok: true, outcome };
        sendResponse(resp);
      } catch (e) {
        const resp: ExecuteResponse = { ok: false, reason: (e as Error).message };
        sendResponse(resp);
      }
      return;
    }
    default: {
      // Exhaustiveness — a new PanelToContent type must be handled above.
      message satisfies never;
    }
  }
});

console.debug('[PageAgent] content bridge ready on', location.origin);

export {};
