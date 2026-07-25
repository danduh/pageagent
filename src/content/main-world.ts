// MAIN-world island (Steps 7.2 + 8.1) — the only surface that can touch the page's own
// `document.modelContext` (WebMCP). It runs in the page's JS world (sees page globals) but
// has NO chrome.* access. It:
//   • reads the site's DECLARED tools via getTools() and hands their serialized defs to the
//     isolated content script (which relays them to the panel for fusion), and
//   • INVOKES a declared tool on request via executeTool — which requires the live
//     RegisteredTool OBJECT from getTools() (passing a name string throws), so we keep the
//     live objects here and invoke by identity.
// Everything is inert data across the wall: declared tool text is never executed as code.

import { isWireMessage, PA_WIRE } from './messages';
import type { WireInvokeReply, WireModelContextReply } from './messages';
import type { DeclaredToolDef } from '../engine/scan-types';

interface RegisteredTool {
  name?: unknown;
  title?: unknown;
  description?: unknown;
  inputSchema?: unknown;
  origin?: unknown;
}
interface ModelContextLike {
  getTools?: () => Promise<RegisteredTool[]> | RegisteredTool[];
  executeTool?: (tool: RegisteredTool, args: unknown) => Promise<unknown> | unknown;
  addEventListener?: (type: string, cb: () => void) => void;
}

function getModelContext(): ModelContextLike | undefined {
  const d = document as unknown as { modelContext?: ModelContextLike };
  const n = navigator as unknown as { modelContext?: ModelContextLike };
  return d.modelContext ?? n.modelContext;
}

/** Only the live RegisteredTool objects can be passed to executeTool — keep them here. */
let liveTools: RegisteredTool[] = [];

async function readTools(): Promise<DeclaredToolDef[]> {
  const mc = getModelContext();
  if (!mc?.getTools) return [];
  try {
    const tools = await mc.getTools();
    liveTools = Array.isArray(tools) ? tools : [];
    return liveTools
      .map((t) => ({
        name: typeof t.name === 'string' ? t.name : '',
        title: typeof t.title === 'string' ? t.title : undefined,
        description: typeof t.description === 'string' ? t.description : undefined,
        inputSchema: t.inputSchema,
        origin: typeof t.origin === 'string' ? t.origin : undefined,
      }))
      .filter((t) => t.name !== '');
  } catch {
    liveTools = [];
    return [];
  }
}

function post(message: WireModelContextReply | WireInvokeReply): void {
  window.postMessage(message, '*');
}

/** Make a handler return safe to structured-clone across postMessage. */
function cloneable(value: unknown): unknown {
  if (value === undefined) return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

async function announce(): Promise<void> {
  const declaredTools = await readTools();
  post({
    channel: PA_WIRE,
    dir: 'to-isolated',
    type: 'model-context',
    present: Boolean(getModelContext()),
    declaredTools,
  });
}

async function invoke(invokeId: string, name: string, args: Record<string, unknown>): Promise<void> {
  const mc = getModelContext();
  const fail = (error: string): void =>
    post({ channel: PA_WIRE, dir: 'to-isolated', type: 'invoke-result', invokeId, ok: false, error });
  if (!mc?.executeTool) return fail('executeTool unavailable');
  // Refresh identities if we don't currently hold the named tool.
  if (!liveTools.some((t) => t.name === name)) await readTools();
  const tool = liveTools.find((t) => t.name === name);
  if (!tool) return fail('declared tool not found');
  try {
    const result = await mc.executeTool(tool, args);
    post({ channel: PA_WIRE, dir: 'to-isolated', type: 'invoke-result', invokeId, ok: true, result: cloneable(result) });
  } catch (e) {
    fail((e as Error).message);
  }
}

window.addEventListener('message', (ev: MessageEvent) => {
  // SECURITY: only our own same-window isolated content script may drive this island; a
  // cross-origin subframe posting to window.top must not be able to invoke site tools.
  if (ev.source !== window) return;
  const d: unknown = ev.data;
  if (!isWireMessage(d) || d.dir !== 'to-main') return;
  if (d.type === 'model-context?') void announce();
  else if (d.type === 'invoke') void invoke(d.invokeId, d.name, d.args);
});

// Re-announce whenever the page changes its declared tools.
getModelContext()?.addEventListener?.('toolchange', () => void announce());
void announce();

export {};
