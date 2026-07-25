// MAIN-world island (Step 7.2) — the only surface that can read the page's own
// `document.modelContext` (the WebMCP tool declaration). It runs in the page's JS
// world (so it can see page globals) but has NO chrome.* access; it hands the
// modelContext presence + declared tool names to the ISOLATED content script over
// window.postMessage, which relays them to the panel. Presence-only for the thin
// slice; Phase 8.1 fuses the declared tools with the DOM-manufactured set.

import { isWireMessage, PA_WIRE } from './messages';

interface ModelContextLike {
  tools?: Array<{ name?: unknown }>;
  getTools?: () => Array<{ name?: unknown }>;
}

function readModelContext(): { present: boolean; toolNames: string[] } {
  const present = 'modelContext' in document;
  if (!present) return { present: false, toolNames: [] };
  const mc = (document as unknown as { modelContext?: ModelContextLike }).modelContext;
  let raw: Array<{ name?: unknown }> = [];
  try {
    raw = mc?.tools ?? mc?.getTools?.() ?? [];
  } catch {
    raw = [];
  }
  const toolNames = Array.isArray(raw)
    ? raw.map((t) => t?.name).filter((n): n is string => typeof n === 'string')
    : [];
  return { present: true, toolNames };
}

function announce(): void {
  const { present, toolNames } = readModelContext();
  window.postMessage(
    { channel: PA_WIRE, dir: 'to-isolated', type: 'model-context', present, toolNames },
    '*'
  );
}

window.addEventListener('message', (ev: MessageEvent) => {
  const d: unknown = ev.data;
  if (isWireMessage(d) && d.dir === 'to-main' && d.type === 'model-context?') announce();
});

announce();

export {};
