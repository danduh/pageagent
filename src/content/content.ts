// Isolated-world content script — the panel↔page bridge (Step 7.2) and the DOM
// scanner's host. It has full DOM access but no page-JS access (the anti-spoof /
// prompt-injection boundary). It answers the panel's typed requests over
// chrome.runtime.onMessage and caches WebMCP presence handed to it by the MAIN-world
// island. Tool GENERATION stays in the panel/engine — this side only observes the DOM.

import { scanDom } from './scanner';
import {
  isPanelToContent,
  isWireMessage,
  PA_WIRE,
  type PageInfoResponse,
  type ScanResponse,
} from './messages';

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
    default: {
      // Exhaustiveness — a new PanelToContent type must be handled above.
      message satisfies never;
    }
  }
});

console.debug('[PageAgent] content bridge ready on', location.origin);

export {};
