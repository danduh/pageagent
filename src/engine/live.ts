// The REAL engine (Scope B) implementing the SAME EnginePort the stub does, so
// swapping it in requires no surface change. This thin-slice version wires the
// panel↔content-script bridge for real capability / identity / scan / tool-gen. The
// on-device Chat loop (runIntent) lands in Phase 9 — until then it hands back honestly
// rather than pretending. See ADR 0001 for the topology.

import { detectLanguageModel, type CapabilityState } from '../lib/capabilities';
import type { EnginePort, Turn } from './port';
import type { PageInfo, ScanResult, Tool } from './types';
import { generateTools } from './toolgen';
import { PA_MSG, type PageInfoResponse, type PanelToContent, type ScanResponse } from '../content/messages';

/** True only inside the loaded extension (real tabs). Tests/gallery → stub. */
export function isExtensionRuntime(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    Boolean(chrome.tabs?.query) &&
    Boolean(chrome.runtime?.id)
  );
}

const RESTRICTED_HINT =
  "I can't reach this page's content. Either it's a restricted page (a chrome:// page, the Web Store, a PDF viewer, or the extension gallery) where extensions can't read the DOM — or the page was already open before PageAgent loaded, so try reloading the page and then Scan again.";

function describeScanError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  // The classic "no content script on this tab" rejection.
  if (/Receiving end does not exist|Could not establish connection|No active tab/i.test(msg)) {
    return RESTRICTED_HINT;
  }
  return `I couldn't scan this page: ${msg}`;
}

export function createLiveEngine(): EnginePort {
  let cachedPage: PageInfo = { origin: '', title: 'Reading this page…' };
  let cachedTools: Tool[] = [];
  let requestSeq = 0;
  const nextRequestId = (): string => `req-${(requestSeq += 1)}`;

  async function activeTabId(): Promise<number> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id == null) throw new Error('No active tab');
    return tab.id;
  }

  async function send<T>(message: PanelToContent): Promise<T> {
    const tabId = await activeTabId();
    return (await chrome.tabs.sendMessage(tabId, message)) as T;
  }

  async function loadPageInfo(): Promise<void> {
    try {
      const r = await send<PageInfoResponse>({ tag: PA_MSG, type: 'page-info', requestId: nextRequestId() });
      if (r?.ok) cachedPage = { origin: r.origin, title: r.title };
    } catch {
      // Restricted/blank page — keep the placeholder identity, honest by omission.
    }
  }

  // Load identity eagerly so the header settles as soon as the panel renders.
  void loadPageInfo();

  return {
    capability(): Promise<CapabilityState> {
      return detectLanguageModel();
    },
    page(): PageInfo {
      return cachedPage;
    },
    tools(): Tool[] {
      return cachedTools;
    },
    async scan(signal?: AbortSignal): Promise<ScanResult> {
      const requestId = nextRequestId();
      const onAbort = (): void => {
        void send({ tag: PA_MSG, type: 'abort', requestId }).catch(() => {});
      };
      if (signal?.aborted) return { status: 'failed', reason: 'Scan stopped.' };
      signal?.addEventListener('abort', onAbort, { once: true });
      try {
        await loadPageInfo();
        const resp = await send<ScanResponse>({ tag: PA_MSG, type: 'scan', requestId });
        if (!resp.ok) return { status: 'failed', reason: resp.reason };
        if (signal?.aborted) return { status: 'failed', reason: 'Scan stopped.' };
        const raw = resp.result;
        cachedTools = generateTools(raw.elements);
        if (raw.status === 'partial') {
          return { status: 'partial', tools: cachedTools, coverage: raw.coverage, note: raw.note ?? '' };
        }
        return { status: 'ok', tools: cachedTools, coverage: raw.coverage };
      } catch (e) {
        return { status: 'failed', reason: describeScanError(e) };
      } finally {
        signal?.removeEventListener('abort', onAbort);
      }
    },
    async *runIntent(_text: string, signal: AbortSignal): AsyncIterable<Turn> {
      if (signal.aborted) return;
      yield {
        id: `live-chat-notyet-${nextRequestId()}`,
        kind: 'agent',
        text: "Chat runs the on-device model, which I'm wiring up next. For now, open the Tools tab to browse what I actually found on this page — and run one from there.",
      };
    },
  };
}
