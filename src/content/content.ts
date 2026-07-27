// Isolated-world content script — the panel↔page bridge (Step 7.2) and the DOM scanner's
// host. Full DOM access, no page-JS access (the anti-spoof / prompt-injection boundary). It
// answers the panel's typed requests over chrome.runtime.onMessage, caches WebMCP presence +
// the site's declared tools handed to it by the MAIN-world island, and relays declared-tool
// invocations to the MAIN world (Step 8.1). Tool GENERATION + fusion stay in the panel/engine.

import { scanDom } from './scanner';
import { executeAction } from './execute';
import {
  isPanelToContent,
  isWireMessage,
  PA_MSG,
  PA_WIRE,
  type ExecuteDeclaredResponse,
  type ExecuteResponse,
  type PageInfoResponse,
  type ScanResponse,
} from './messages';
import type { ActionType } from '../engine/types';
import type { DeclaredToolDef, ElementFingerprint } from '../engine/scan-types';

// WebMCP presence + declared tools, cached from the MAIN-world island's postMessage.
let modelContextPresent = false;
let declaredTools: DeclaredToolDef[] = [];

// Pending declared-tool invocations (isolated → MAIN → back), keyed by invokeId.
const pendingInvokes = new Map<string, (r: ExecuteDeclaredResponse) => void>();

/** Unguessable invoke id (defence-in-depth alongside the ev.source guard). */
function newInvokeId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return `inv-${c.randomUUID()}`;
  if (c?.getRandomValues) {
    const a = new Uint32Array(2);
    c.getRandomValues(a);
    return `inv-${a[0].toString(36)}${a[1].toString(36)}`;
  }
  return `inv-${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

window.addEventListener('message', (ev: MessageEvent) => {
  // SECURITY: only accept messages this same window posted (our MAIN-world island). A
  // co-resident cross-origin subframe (ad/widget) can call window.top.postMessage and would
  // otherwise be able to forge a declared-tool result or poison the tool list.
  if (ev.source !== window) return;
  const d: unknown = ev.data;
  if (!isWireMessage(d) || d.dir !== 'to-isolated') return;
  if (d.type === 'model-context') {
    modelContextPresent = d.present;
    declaredTools = d.declaredTools;
  } else if (d.type === 'invoke-result') {
    const cb = pendingInvokes.get(d.invokeId);
    if (cb) {
      pendingInvokes.delete(d.invokeId);
      cb(d.ok ? { ok: true, result: d.result } : { ok: false, reason: d.error ?? 'invoke failed' });
    }
  }
});

// Ask the MAIN world proactively, in case its load-time post preceded our listener.
window.postMessage({ channel: PA_WIRE, dir: 'to-main', type: 'model-context?' }, '*');

/** Invoke a site-declared tool via the MAIN world, resolving on its reply (or a timeout). */
function invokeDeclared(name: string, args: Record<string, unknown>): Promise<ExecuteDeclaredResponse> {
  return new Promise((resolve) => {
    const invokeId = newInvokeId();
    const timer = setTimeout(() => {
      if (pendingInvokes.delete(invokeId)) resolve({ ok: false, reason: 'the site tool did not respond' });
    }, 15000);
    pendingInvokes.set(invokeId, (r) => {
      clearTimeout(timer);
      resolve(r);
    });
    window.postMessage({ channel: PA_WIRE, dir: 'to-main', type: 'invoke', invokeId, name, args }, '*');
  });
}

// Request ids the panel has asked us to abort (see Phase 7 notes on synchronous scan).
const abortedRequests = new Set<string>();

// Last scan's handle → fingerprint map, so EXECUTE can re-resolve against the LIVE DOM.
const scanCache = new Map<string, { fingerprint: ElementFingerprint; actionType: ActionType }>();

// --- Freshness watch (Step 8.2): notice when the page drifts from the last scan -----------
// A cheap MutationObserver COUNTS DOM changes (it never processes them) and a short poll
// watches location.href for SPA route changes. Past a threshold, or on navigation, we push a
// one-shot `page-changed` notice to the panel — one per stale episode, reset when the next
// scan starts, so we never spam. All state resets at scan time (mutations counted SINCE scan).
const MUTATION_THRESHOLD = 30;
let mutationCount = 0;
let scannedUrl = location.href;
let noticeSent = false; // one notice per stale episode until the next scan resets it

function pushPageChanged(reason: 'mutation' | 'navigation'): void {
  if (noticeSent) return;
  noticeSent = true;
  try {
    void chrome.runtime.sendMessage({ tag: PA_MSG, type: 'page-changed', reason, url: location.href }).catch(() => {});
  } catch {
    /* the panel/runtime may be gone — ignore */
  }
}

function resetFreshnessWatch(): void {
  mutationCount = 0;
  scannedUrl = location.href;
  noticeSent = false;
}

new MutationObserver((records) => {
  for (const r of records) mutationCount += r.addedNodes.length + r.removedNodes.length + 1;
  if (mutationCount >= MUTATION_THRESHOLD) pushPageChanged('mutation');
}).observe(document.documentElement, { childList: true, subtree: true, attributes: false });

function checkUrl(): void {
  if (location.href !== scannedUrl) pushPageChanged('navigation');
}
window.addEventListener('popstate', checkUrl);
window.addEventListener('hashchange', checkUrl);
// SPA pushState/replaceState fire no event and the MAIN-world History is out of our reach, so
// poll location.href here (cheap string compare) to catch client-side route changes too.
setInterval(checkUrl, 1000);

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
        declaredTools,
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
        // The tool-set is now current for THIS DOM/URL — restart the freshness watch so drift
        // is counted from here and the next stale episode can push a fresh notice (Step 8.2).
        resetFreshnessWatch();
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
      // A pinned fingerprint (one-tap reverse) re-resolves the ORIGINAL element directly,
      // bypassing the positional scanCache — otherwise falls back to the handle's cached one.
      const entry = message.pinned ?? scanCache.get(message.handleId);
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
    case 'execute-declared': {
      // Async: relay to the MAIN world and respond when it replies (keep the channel open).
      void invokeDeclared(message.name, message.args).then((r) => sendResponse(r));
      return true;
    }
    default: {
      // Exhaustiveness — a new PanelToContent type must be handled above.
      message satisfies never;
    }
  }
});

console.debug('[PageAgent] content bridge ready on', location.origin);

export {};
