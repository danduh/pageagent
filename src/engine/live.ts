// The REAL engine (Scope B) implementing the SAME EnginePort the stub does, so swapping
// it in requires no surface change. Phases 7–9: real capability / identity / scan /
// tool-gen, and — Phase 9 — the on-device capped intent-loop (the side panel is the
// Prompt-API host, confirmed by Spike A2). The loop picks ONE tool, gates a destructive
// action (locate-or-decline first), executes against the re-resolved live element, and
// reports on the certainty ladder. See ADR 0001 for the topology.

import { detectLanguageModel, type CapabilityState } from '../lib/capabilities';
import type { EnginePort, PageChangeKind, RunHost, Turn } from './port';
import type { ActionType, GatePreview, PageInfo, ScanResult, Tool } from './types';
import type { DeclaredToolDef, ElementFingerprint, ExecOutcome } from './scan-types';
import { generateTools } from './toolgen';
import { interpretDeclaredResult, mergeTools } from './fusion';
import {
  buildSystemPrompt,
  INTENT_SCHEMA,
  looksMultiStep,
  outcomeToReport,
  runAgentLoop,
  runSelectedTool,
  type GateOutcome,
  type LoopDeps,
  type RescanResult,
  type ToolRunDeps,
} from './agentLoop';
import {
  isPageChangedNotice,
  PA_MSG,
  type ExecuteDeclaredResponse,
  type ExecuteResponse,
  type PageInfoResponse,
  type PanelToContent,
  type ScanResponse,
} from '../content/messages';

/** A minimal view of the on-device model session we depend on. */
interface LanguageSession {
  prompt(input: string, opts?: { responseConstraint?: unknown }): Promise<string>;
  destroy?(): void;
}
interface LanguageModelGlobal {
  create(opts: {
    initialPrompts?: Array<{ role: string; content: string }>;
    expectedInputs?: Array<{ type: string; languages: string[] }>;
    expectedOutputs?: Array<{ type: string; languages: string[] }>;
  }): Promise<LanguageSession>;
}
function getLanguageModel(): LanguageModelGlobal | null {
  const g = self as unknown as {
    LanguageModel?: LanguageModelGlobal;
    ai?: { languageModel?: LanguageModelGlobal };
  };
  return g.LanguageModel ?? g.ai?.languageModel ?? null;
}

/** Beyond EnginePort: the trust-ledger undo + a direct Execute-tab tool run. */
export type LiveEngine = EnginePort & {
  reverseAction(turnId: string, signal: AbortSignal): AsyncIterable<Turn>;
  runTool(
    tool: Tool,
    value: string | undefined,
    host: RunHost,
    signal: AbortSignal
  ): AsyncIterable<Turn>;
};

/** True only inside the loaded extension (real tabs). Tests/gallery → stub. */
export function isExtensionRuntime(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.tabs?.query) && Boolean(chrome.runtime?.id);
}

const RESTRICTED_HINT =
  "I can't reach this page's content. Either it's a restricted page (a chrome:// page, the Web Store, a PDF viewer, or the extension gallery) where extensions can't read the DOM — or the page was already open before PageAgent loaded, so try reloading the page and then Scan again.";

function describeScanError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/Receiving end does not exist|Could not establish connection|No active tab/i.test(msg)) {
    return RESTRICTED_HINT;
  }
  return `I couldn't scan this page: ${msg}`;
}

export function createLiveEngine(): LiveEngine {
  let cachedPage: PageInfo = { origin: '', title: 'Reading this page…' };
  let cachedTools: Tool[] = [];
  // The page's own declared WebMCP tools (Step 8.1), refreshed from page-info.
  let cachedDeclared: DeclaredToolDef[] = [];
  // tool.id → scan handle id, so the loop can dispatch a MANUFACTURED Tool to its live element.
  const idToHandle = new Map<string, string>();
  // tool.id → the element's fingerprint + action, captured at scan time. A one-tap reverse pins
  // this so the undo re-resolves the EXACT element it toggled, immune to a later re-scan that
  // remapped the (positional) handle to a different control (review finding).
  const idToFingerprint = new Map<string, { fingerprint: ElementFingerprint; actionType: ActionType }>();
  let requestSeq = 0;
  const nextRequestId = (): string => `req-${(requestSeq += 1)}`;
  // The tab (and its window) the current tool-set was scanned from. EVERY message for this
  // tool-set targets boundTabId — never "whatever tab is active now" — so an execute can't
  // land on a different tab the user switched to (Step 8.2 review finding). Also used to filter
  // freshness signals to this tab, and to this window (so a tab switch in another window is
  // not mistaken for switching away from our page).
  let boundTabId: number | null = null;
  let boundWindowId: number | null = null;
  let turnSeq = 0;
  const nextTurnId = (): string => `live-${(turnSeq += 1)}`;

  // The on-device session, recreated when the tool-set (system prompt) changes.
  let session: LanguageSession | null = null;
  let sessionForTools: Tool[] | null = null;
  // The signal of the run (runIntent / runTool / reverseAction) that currently owns the shared
  // scan state. A public scan() is refused while an owner is set AND live, so a user re-Scan
  // can't race the run's execute/re-scan and corrupt idToHandle / destroy the session mid-use
  // (review finding). Tracked by OWNER identity (not a bare flag) so a stale run's delayed
  // unwind after Stop can't clear a freshly-restarted run's guard, and a post-Stop re-Scan
  // (owner aborted) is honoured rather than wrongly refused (second-review finding).
  let inFlightOwner: AbortSignal | null = null;
  // report turn id → the reversible Tier-0 toggle it executed, for a per-turn one-tap undo.
  // Keyed by turn so each undo re-runs ITS OWN action, never a newer (possibly gated) one. The
  // `pinned` fingerprint re-resolves the exact element the toggle acted on at undo time.
  const reverseActions = new Map<
    string,
    {
      tool: Tool;
      value?: string;
      pinned?: { fingerprint: ElementFingerprint; actionType: ActionType };
      // The tab this undo belongs to. If a later re-scan re-binds the tools to a DIFFERENT tab,
      // the undo declines rather than flip an identical control on the now-bound tab (review finding).
      tabId: number | null;
    }
  >();

  async function activeTab(): Promise<{ id: number; windowId: number }> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id == null) throw new Error('No active tab');
    return { id: tab.id, windowId: tab.windowId ?? -1 };
  }
  // Route to the tab this tool-set was scanned from; before the first scan, the active tab.
  async function send<T>(message: PanelToContent): Promise<T> {
    const tabId = boundTabId ?? (await activeTab()).id;
    return (await chrome.tabs.sendMessage(tabId, message)) as T;
  }

  async function loadPageInfo(): Promise<void> {
    try {
      const r = await send<PageInfoResponse>({ tag: PA_MSG, type: 'page-info', requestId: nextRequestId() });
      if (r?.ok) {
        cachedPage = { origin: r.origin, title: r.title };
        cachedDeclared = r.declaredTools ?? [];
      }
    } catch {
      /* restricted/blank page — keep the placeholder identity */
    }
  }
  void loadPageInfo();

  /** Invoke a site-declared WebMCP tool via the MAIN world (document.modelContext). */
  async function invokeDeclaredTool(name: string, args: Record<string, unknown>): Promise<ExecOutcome> {
    try {
      const resp = await send<ExecuteDeclaredResponse>({
        tag: PA_MSG,
        type: 'execute-declared',
        requestId: nextRequestId(),
        name,
        args,
      });
      // The wire round-trip failed (the MAIN-world island didn't answer) — a connection
      // problem, not DOM staleness.
      if (!resp.ok) return { kind: 'declined', reason: 'disconnected', detail: resp.reason };
      // A site tool runs its OWN handler; we can't diff the DOM for it. interpretDeclaredResult
      // reads the return honestly — a failure signal is NEVER reported as Done (review finding).
      return { kind: 'executed', observed: interpretDeclaredResult(resp.result) };
    } catch (e) {
      return { kind: 'declined', reason: 'disconnected', detail: (e as Error).message };
    }
  }

  async function bridgeExecute(
    tool: Tool,
    value: string | undefined,
    dryRun: boolean,
    // A one-tap reverse pins the exact element it toggled, so the undo re-resolves THAT
    // fingerprint rather than whatever the (positional) handle now maps to after a re-scan.
    pinned?: { fingerprint: ElementFingerprint; actionType: ActionType }
  ): Promise<ExecOutcome> {
    const handleId = idToHandle.get(tool.id);
    if (!handleId && !pinned) return { kind: 'declined', reason: 'unknown-handle' };
    try {
      const resp = await send<ExecuteResponse>({
        tag: PA_MSG,
        type: 'execute',
        requestId: nextRequestId(),
        handleId: handleId ?? '',
        value,
        dryRun,
        pinned,
      });
      if (!resp.ok) return { kind: 'declined', reason: 'unknown-handle', detail: resp.reason };
      return resp.outcome;
    } catch (e) {
      // chrome.tabs.sendMessage rejects when there's no content script on the tab — the
      // page needs a reload after the extension reloaded, or it's a restricted page.
      return { kind: 'declined', reason: 'disconnected', detail: (e as Error).message };
    }
  }

  function buildPreview(tool: Tool, value: string | undefined, liveLabel: string, provenance: string): GatePreview {
    const tier: 1 | 2 = tool.risk === 2 ? 2 : 1;
    return {
      tier,
      verb: tool.actionType,
      toolName: tool.id,
      targetLabel: `“${liveLabel}” (${tool.provenance})`,
      value: value && value.trim() ? value : undefined,
      consequence:
        tier === 2
          ? 'This is a high-consequence action and can’t be undone from here.'
          : 'This may be hard to undo.',
      provenance,
      reacknowledge: tier === 2 ? (value && value.trim() ? value : liveLabel) : undefined,
      proceedLabel: tool.name,
      cancelLabel: 'Don’t do it',
      locatable: true,
    };
  }

  /** The gate + execute deps shared by the Chat loop and a direct Execute-tab run. */
  function makeToolRunDeps(
    host: RunHost,
    signal: AbortSignal,
    provenanceFor: (tool: Tool) => string
  ): ToolRunDeps {
    return {
      classifyTier: (tool) => tool.risk,
      gate: async (tool, args): Promise<GateOutcome> => {
        const value = typeof args.value === 'string' ? args.value : undefined;
        if (tool.source === 'declared') {
          // A site-declared tool is "located" via the WebMCP API — no DOM dry-run.
          if (signal.aborted) return { decision: 'cancelled' };
          const shown = value ?? JSON.stringify(args);
          const ok = await host.confirm(buildPreview(tool, shown, tool.name, provenanceFor(tool)));
          return { decision: ok ? 'approved' : 'cancelled' };
        }
        // Locate-or-decline BEFORE the gate (Step 8.5): a dry-run re-resolve + verify.
        const dry = await bridgeExecute(tool, value, true);
        if (signal.aborted) return { decision: 'cancelled' };
        if (dry.kind === 'declined') return { decision: 'declined', reason: dry.reason, detail: dry.detail };
        const label = dry.kind === 'located' ? dry.label : tool.name;
        const ok = await host.confirm(buildPreview(tool, value, label, provenanceFor(tool)));
        return { decision: ok ? 'approved' : 'cancelled' };
      },
      execute: (tool, args): Promise<ExecOutcome> => {
        if (tool.source === 'declared') return invokeDeclaredTool(tool.id, args);
        const value = typeof args.value === 'string' ? args.value : undefined;
        return bridgeExecute(tool, value, false);
      },
      registerReverse: (id, tool, value) =>
        reverseActions.set(id, { tool, value, pinned: idToFingerprint.get(tool.id), tabId: boundTabId }),
      signal,
    };
  }

  async function ensureSession(tools: Tool[]): Promise<LanguageSession> {
    if (session && sessionForTools === tools) return session;
    session?.destroy?.();
    const lm = getLanguageModel();
    if (!lm) throw new Error('on-device model not available');
    // Declare the I/O language (English) so the Prompt API can attest to output safety and
    // quality — without it Canary warns "No output language was specified" on every request.
    session = await lm.create({
      initialPrompts: [{ role: 'system', content: buildSystemPrompt(tools) }],
      expectedInputs: [{ type: 'text', languages: ['en'] }],
      expectedOutputs: [{ type: 'text', languages: ['en'] }],
    });
    sessionForTools = tools;
    return session;
  }

  // The one real scan: refresh cachedTools + idToHandle, invalidate the stale session. Shared
  // by the public `scan` (user re-Scan → rebind to the active tab) and the loop's between-step
  // re-scan (Phase 10.1 → rebind:false, so it re-scans the SAME tab the run is scoped to even
  // if the user switched tabs mid-loop).
  async function doScan(signal?: AbortSignal, opts: { rebind?: boolean } = {}): Promise<ScanResult> {
    const requestId = nextRequestId();
    const onAbort = (): void => {
      void send({ tag: PA_MSG, type: 'abort', requestId }).catch(() => {});
    };
    if (signal?.aborted) return { status: 'failed', reason: 'Scan stopped.' };
    // Bind this tool-set to the tab we're ABOUT to scan (captured once, at the start) so every
    // send for it — page-info, scan, execute — targets that tab even if the user switches away
    // mid-scan (review finding). A switch during the scan then reads as stale, not fresh.
    if (opts.rebind !== false) {
      try {
        const t = await activeTab();
        boundTabId = t.id;
        boundWindowId = t.windowId;
      } catch {
        /* keep the previous binding */
      }
    }
    signal?.addEventListener('abort', onAbort, { once: true });
    try {
      await loadPageInfo();
      const resp = await send<ScanResponse>({ tag: PA_MSG, type: 'scan', requestId });
      if (!resp.ok) return { status: 'failed', reason: resp.reason };
      if (signal?.aborted) return { status: 'failed', reason: 'Scan stopped.' };
      const raw = resp.result;
      // Pass the page origin so the classifier can bias conservative on high-stakes origins (8.3).
      const manufactured = generateTools(raw.elements, { origin: cachedPage.origin });
      // Zip manufactured tools ↔ elements (generateTools preserves order) so we can dispatch
      // by tool id. Build this from the MANUFACTURED list BEFORE fusion reorders it.
      idToHandle.clear();
      idToFingerprint.clear();
      raw.elements.forEach((el, i) => {
        const tool = manufactured[i];
        if (tool) {
          idToHandle.set(tool.id, el.handleId);
          idToFingerprint.set(tool.id, { fingerprint: el.fingerprint, actionType: el.actionType });
        }
      });
      // Fuse with the site's declared WebMCP tools (Step 8.1): declared win on overlap.
      cachedTools = mergeTools(manufactured, cachedDeclared);
      // The tool-set changed → the model's system prompt is stale.
      session?.destroy?.();
      session = null;
      sessionForTools = null;
      void loadPageInfo();
      if (raw.status === 'partial') {
        return { status: 'partial', tools: cachedTools, coverage: raw.coverage, note: raw.note ?? '' };
      }
      return { status: 'ok', tools: cachedTools, coverage: raw.coverage };
    } catch (e) {
      return { status: 'failed', reason: describeScanError(e) };
    } finally {
      signal?.removeEventListener('abort', onAbort);
    }
  }

  // The multi-step loop's between-step re-scan (Phase 10.1): re-read the live page, rebuild the
  // model session against the FRESH tool-set, and hand the loop a brain bound to it. On a
  // failed/empty scan (or a model that won't wake) it hands back honestly instead — the loop
  // stops rather than plan against a stale or empty page.
  async function rescanForLoop(signal: AbortSignal): Promise<RescanResult> {
    // Keep the run scoped to the tab it started on — never hop to a tab the user switched to.
    const res = await doScan(signal, { rebind: false });
    if (signal.aborted) {
      return { handBack: { certainty: 'didnt', text: 'You stopped it — I didn’t do anything more.' } };
    }
    if (res.status === 'failed') {
      return { handBack: { certainty: 'couldnt', text: `I re-scanned to plan the next step, but ${res.reason}` } };
    }
    if (cachedTools.length === 0) {
      return {
        handBack: { certainty: 'couldnt', text: 'After re-scanning I found no tools on this page, so I stopped.' },
      };
    }
    let brainSession: LanguageSession;
    try {
      brainSession = await ensureSession(cachedTools);
    } catch (e) {
      return {
        handBack: { certainty: 'couldnt', text: `The on-device model isn't ready to continue: ${(e as Error).message}` },
      };
    }
    return {
      tools: cachedTools,
      brain: { prompt: (t: string) => brainSession.prompt(t, { responseConstraint: INTENT_SCHEMA }) },
    };
  }

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
    onPageChange(cb: (kind: PageChangeKind) => void): () => void {
      // A content-script drift notice (DOM mutation / SPA route change) — only once we're bound
      // to a tab, and only from THAT tab. sender.tab is set by the browser, not the page.
      const onRuntime = (msg: unknown, sender: chrome.runtime.MessageSender): void => {
        if (!isPageChangedNotice(msg)) return;
        if (boundTabId == null || sender.tab?.id !== boundTabId) return;
        cb(msg.reason);
      };
      // The active tab changed WITHIN our window: away from our tab → the tools are for the
      // previous page; back to our tab → clear that (a switch in another window is ignored).
      const onActivated = (info: { tabId: number; windowId: number }): void => {
        if (boundTabId == null || info.windowId !== boundWindowId) return;
        cb(info.tabId === boundTabId ? 'tab-return' : 'tab-switch');
      };
      // Our tab navigated / reloaded (content script torn down + re-injected) → stale. A
      // same-URL reload carries no change.url, so also treat a 'loading' transition as drift.
      const onUpdated = (tabId: number, change: { url?: string; status?: string }): void => {
        if (boundTabId != null && tabId === boundTabId && (change.url != null || change.status === 'loading')) {
          cb('navigation');
        }
      };
      chrome.runtime.onMessage.addListener(onRuntime);
      chrome.tabs.onActivated.addListener(onActivated);
      chrome.tabs.onUpdated.addListener(onUpdated);
      return () => {
        chrome.runtime.onMessage.removeListener(onRuntime);
        chrome.tabs.onActivated.removeListener(onActivated);
        chrome.tabs.onUpdated.removeListener(onUpdated);
      };
    },
    scan(signal?: AbortSignal): Promise<ScanResult> {
      // Refuse a user-triggered re-Scan while a LIVE run owns the scan state — re-scanning
      // mid-action would clear idToHandle + destroy the session under the running loop. An owner
      // that's already aborted (Stop pressed, run still unwinding) is NOT live, so the re-Scan is
      // honoured — the aborted run won't act again anyway.
      if (inFlightOwner && !inFlightOwner.aborted) {
        return Promise.resolve({
          status: 'failed',
          reason: 'PageAgent is in the middle of an action — Stop it first, then re-Scan.',
        });
      }
      return doScan(signal);
    },

    async *runIntent(text: string, signal: AbortSignal, host: RunHost): AsyncIterable<Turn> {
      if (signal.aborted) return;
      const tools = cachedTools;
      if (tools.length === 0) {
        yield {
          id: nextTurnId(),
          kind: 'agent',
          text: "I haven't found any tools on this page yet — open the Scan tab and scan first.",
        };
        return;
      }

      let brainSession: LanguageSession;
      try {
        brainSession = await ensureSession(tools);
      } catch (e) {
        yield {
          id: nextTurnId(),
          kind: 'report',
          certainty: 'couldnt',
          text: `The on-device model isn't ready: ${(e as Error).message}`,
        };
        return;
      }
      if (signal.aborted) return;

      const deps: LoopDeps = {
        tools,
        brain: {
          prompt: (t: string) => brainSession.prompt(t, { responseConstraint: INTENT_SCHEMA }),
        },
        // Best-effort multi-step (Phase 10.1) ONLY when the request clearly asks for more than one
        // step; a plain single-action request stays single-action so the weak model can't re-plan
        // into a repeat or a conflicting second action (found live).
        rescan: looksMultiStep(text) ? rescanForLoop : undefined,
        ...makeToolRunDeps(host, signal, () => `Because you asked: “${text.trim()}”`),
      };

      // Own the scan state for the whole (possibly multi-step) run so a public re-Scan can't
      // race it. Clear ownership only if THIS run still holds it — a run restarted after Stop
      // may already own it, and our delayed unwind must not clear the new run's guard.
      inFlightOwner = signal;
      try {
        yield* runAgentLoop(text, deps);
      } finally {
        if (inFlightOwner === signal) inFlightOwner = null;
      }
    },

    // Run ONE tool the user chose by hand from the Tools tab (Execute). Same tier → gate →
    // execute → report pipeline as Chat — including invoking a site-declared WebMCP tool.
    async *runTool(
      tool: Tool,
      value: string | undefined,
      host: RunHost,
      signal: AbortSignal
    ): AsyncIterable<Turn> {
      if (signal.aborted) return;
      const args: Record<string, unknown> = value != null && value !== '' ? { value } : {};
      const deps = makeToolRunDeps(host, signal, (t) => `Because you ran “${t.name}” from the Tools list.`);
      inFlightOwner = signal;
      try {
        yield* runSelectedTool(tool, args, deps);
      } finally {
        if (inFlightOwner === signal) inFlightOwner = null;
      }
    },

    async *reverseAction(turnId: string, signal: AbortSignal): AsyncIterable<Turn> {
      if (signal.aborted) return;
      const entry = reverseActions.get(turnId);
      if (!entry) {
        yield { id: nextTurnId(), kind: 'agent', text: 'There’s nothing to undo for that step.' };
        return;
      }
      // The tools now point at a DIFFERENT tab than the one this undo ran on (a re-scan re-bound
      // them) — flipping "the same" control on the current tab would be the wrong page, so decline
      // (review finding). It stays consumed so it can't fire later against the right tab either.
      if (entry.tabId !== boundTabId) {
        reverseActions.delete(turnId);
        yield {
          id: nextTurnId(),
          kind: 'report',
          certainty: 'couldnt',
          text: "That undo is for a different page than the one I'm on now — open it again and toggle it there, or re-scan it.",
        };
        return;
      }
      // Only reversible Tier-0 toggles are ever registered, so re-running the SAME tool is a
      // genuine inverse and needs no gate. A used undo is consumed so it can't double-fire. We
      // dispatch against the PINNED fingerprint captured when it ran, so a between-step re-scan
      // that remapped the (positional) handle can't make the undo flip a different control — the
      // pinned fingerprint re-resolves the original element, or declines honestly (review finding).
      reverseActions.delete(turnId);
      const { tool, value, pinned } = entry;
      inFlightOwner = signal;
      let outcome: ExecOutcome;
      try {
        outcome = await bridgeExecute(tool, value, false, pinned);
      } finally {
        if (inFlightOwner === signal) inFlightOwner = null;
      }
      if (signal.aborted) return;
      if (outcome.kind === 'executed' && outcome.observed.verified) {
        yield { id: nextTurnId(), kind: 'report', certainty: 'done', text: `Reversed — ${outcome.observed.summary}` };
        return;
      }
      // Honest non-verified / declined cases reuse the certainty-ladder mapping.
      yield outcomeToReport(nextTurnId(), tool, 0, outcome);
    },
  };
}
