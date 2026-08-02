import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createStubEngine } from '../engine/stub';
import { createLiveEngine, isExtensionRuntime, type LiveEngine } from '../engine/live';
import type { RunHost, Turn } from '../engine/port';
import type { Certainty, FreshnessState, GatePreview, LocusState, PageInfo, ScanResult, Tool } from '../engine/types';
import { FRESH, nextFreshness, type FreshnessSignal, type FreshnessView } from '../engine/freshness';
import type { CapabilityState } from '../lib/capabilities';
import { Button, Tab, Tabs, Toggle } from '../components/primitives';
import { Header } from '../surfaces/Header';
import { Chat } from '../surfaces/Chat';
import { ConfirmGate } from '../surfaces/ConfirmGate';
import { ToolsSurface } from '../surfaces/ToolsSurface';
import { ScanGen } from '../surfaces/ScanGen';
import { AvailabilityBanner } from '../surfaces/AvailabilityBanner';
import { buildGatePreview, classifyTier, previewForTool } from '../safety/classifier';
import { DENSE_TOOLS, PAGES, SPARSE_TOOLS } from '../fixtures';

type SurfaceTab = 'chat' | 'tools' | 'scan';

export function App() {
  const [dense, setDense] = useState(false);
  // The REAL engine drives the loaded extension (scans the live active tab); the stub
  // drives tests + the dev gallery. Same EnginePort — no surface knows the difference.
  const live = useMemo(() => isExtensionRuntime(), []);
  const engine = useMemo(
    () =>
      live
        ? createLiveEngine()
        : createStubEngine({
            page: dense ? PAGES.settings : PAGES.ci,
            tools: dense ? DENSE_TOOLS : SPARSE_TOOLS,
          }),
    [live, dense]
  );

  const [tab, setTab] = useState<SurfaceTab>('chat');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [acting, setActing] = useState(false);
  const [status, setStatus] = useState('');
  // Freshness/staleness (Step 8.2). `fresh` is the sticky page-drift view (mutation/navigation,
  // cleared by a scan); `onWrongTab` is the transient "you're on a different tab than the tools"
  // condition (cleared by switching back or re-scanning). The header + run-guards use both.
  const [fresh, setFresh] = useState<FreshnessView>(FRESH);
  const [onWrongTab, setOnWrongTab] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [locus, setLocus] = useState<LocusState>('on-device');
  const [cloudOnce, setCloudOnce] = useState(false);
  const [pendingGate, setPendingGate] = useState<GatePreview | null>(null);
  const [, setCapability] = useState<CapabilityState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Resolves the OPEN Confirm-gate's promise: the live loop awaits host.confirm here, so
  // approve/cancel/Stop flow the user's decision back into the running loop.
  const gateResolverRef = useRef<((ok: boolean) => void) | null>(null);

  const page: PageInfo = engine.page();
  const tools: Tool[] = engine.tools();
  const degraded = locus === 'unavailable' && !cloudOnce;

  // Combine sticky drift with the transient wrong-tab condition (Step 8.2). A run is guarded
  // when EITHER holds; the header shows Scanning first, else Stale, else the drift state.
  const toolsStale = fresh.toolsStale || onWrongTab;
  // A genuine scan failure keeps its own header state ahead of the generic stale relabel (a
  // failed scan also sets toolsStale, so the run-guard is unaffected either way).
  const freshnessState: FreshnessState =
    fresh.state === 'scanning'
      ? 'scanning'
      : fresh.state === 'failed'
        ? 'failed'
        : toolsStale
          ? 'stale'
          : fresh.state;
  const staleReason = fresh.toolsStale
    ? fresh.reason
    : onWrongTab
      ? 'these tools are for the previous page'
      : undefined;

  // Feed one signal through the freshness state machine (Step 8.2).
  const signalFreshness = useCallback(
    (sig: FreshnessSignal) => setFresh((cur) => nextFreshness(cur, sig)),
    []
  );

  useEffect(() => {
    let alive = true;
    void engine.capability().then((c) => {
      if (!alive) return;
      setCapability(c);
      setLocus(c.languageModel === 'unavailable' ? 'unavailable' : 'on-device');
    });
    // Prime the Scan surface with an initial detection (onWrongTab starts false).
    void engine.scan().then((res) => {
      if (!alive) return;
      setScanResult(res);
      signalFreshness({ kind: res.status === 'failed' ? 'scan-failed' : 'scanned' });
    });
    inputRef.current?.focus();
    return () => {
      alive = false;
    };
  }, [engine, signalFreshness]);

  // Live page-drift → Stale (Step 8.2). Drift (mutation/navigation) is sticky; the tab-switch /
  // tab-return pair toggles the transient wrong-tab condition.
  useEffect(
    () =>
      engine.onPageChange((kind) => {
        if (kind === 'tab-switch') setOnWrongTab(true);
        else if (kind === 'tab-return') setOnWrongTab(false);
        else signalFreshness({ kind });
      }),
    [engine, signalFreshness]
  );

  // Resolve an open gate promise (live loop) and clear the gate. No-op for the stub gate.
  const resolveGate = useCallback((ok: boolean) => {
    const r = gateResolverRef.current;
    gateResolverRef.current = null;
    setPendingGate(null);
    r?.(ok);
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    if (gateResolverRef.current) resolveGate(false); // Stop reaches inside an open gate too
    setActing(false);
    setStatus('Stopped.');
    inputRef.current?.focus();
  }, [resolveGate]);

  // The loop calls back here for a Tier-1/2 action: show the gate, await the decision.
  const host: RunHost = useMemo(
    () => ({
      confirm: (preview) =>
        new Promise<boolean>((resolve) => {
          gateResolverRef.current = resolve;
          setPendingGate(preview);
        }),
    }),
    []
  );

  // Append a report turn to the transcript. The id is a unique, stable React key.
  const addReport = useCallback(
    (certainty: Certainty, text: string, prefix = 'r') =>
      setTurns((prev) => [...prev, { id: `${prefix}-${prev.length}`, kind: 'report', certainty, text }]),
    []
  );

  // When the tool-set is stale, refuse a run PROACTIVELY with an honest reason instead of
  // acting on controls that may have moved — the user re-scans (header re-Scan) and retries.
  const refuseStale = useCallback(() => {
    setTab('chat');
    addReport('couldnt', `${staleReason ?? 'The page changed'} — Scan this page again, then try.`, 'stale');
    inputRef.current?.focus();
  }, [staleReason, addReport]);

  // Drive one live run: own the AbortController, stream its turns into the transcript, and
  // clear the working state when it ends (unless Stop already did). The single place that owns
  // the acting/status/abort lifecycle, so send/runTool/reverse each stay one call.
  const startRun = useCallback((make: (signal: AbortSignal) => AsyncIterable<Turn>) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setActing(true);
    setStatus('Working on your device…');
    void (async () => {
      try {
        for await (const turn of make(controller.signal)) {
          if (controller.signal.aborted) break;
          setTurns((prev) => [...prev, turn]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setActing(false);
          setStatus('');
        }
        inputRef.current?.focus();
      }
    })();
  }, []);

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || acting || pendingGate) return;
      setTab('chat');
      setTurns((prev) => [...prev, { id: `u-${prev.length}`, kind: 'user', text: trimmed }]);
      // The page drifted / we're on another tab — don't act on a possibly-stale tool-set (8.2).
      if (live && toolsStale) {
        refuseStale();
        return;
      }
      // The Scope-A mock gate/classifier is a fixture-only demo. In the live engine the
      // real Chat loop (with real tiering + gate) lands in Phase 9, so here we send every
      // request straight to runIntent, which hands back honestly rather than faking a gate.
      if (!live) {
        const tier = classifyTier(trimmed);
        if (tier === 1 || tier === 2) {
          setPendingGate(buildGatePreview(trimmed, tier));
          return;
        }
      }
      startRun((signal) => engine.runIntent(trimmed, signal, host));
    },
    [acting, engine, pendingGate, live, host, toolsStale, refuseStale, startRun]
  );

  const rescan = useCallback(() => {
    // A run owns the page — re-scanning would be refused and misread as a failure; ask the user
    // to Stop first instead of falsely marking the (still-valid) tool-set stale (review finding).
    if (acting) {
      addReport('couldnt', 'I’m in the middle of an action — Stop it first, then Scan.', 'busy');
      return;
    }
    // Reset wrong-tab at scan START: we bind to the tab we're on now, so a switch that happens
    // DURING the scan (onActivated) survives to the completed view instead of being cleared.
    setOnWrongTab(false);
    signalFreshness({ kind: 'scanning' });
    const controller = new AbortController();
    void engine.scan(controller.signal).then((res) => {
      setScanResult(res);
      signalFreshness({ kind: res.status === 'failed' ? 'scan-failed' : 'scanned' });
    });
  }, [engine, signalFreshness, acting, addReport]);

  // Execute: run one tool by hand. Destructive (risk ≥ 1) routes through the gate;
  // a reversible tool flows and reports. The report lands in the transcript (traceable).
  const runTool = useCallback(
    (tool: Tool, value?: string) => {
      if (pendingGate || acting) return;
      // The page drifted / we're on another tab — refuse rather than click a control that moved.
      if (live && toolsStale) {
        refuseStale();
        return;
      }
      // Live engine: run the chosen tool for real through the SAME tier → gate → execute →
      // report pipeline as Chat (a destructive tool hits the Confirm-gate first; a declared
      // WebMCP tool is invoked via the site's handler).
      if (live && 'runTool' in engine) {
        setTab('chat');
        startRun((signal) => (engine as LiveEngine).runTool(tool, value, host, signal));
        return;
      }
      // Stub path (tests + gallery): scripted gate/report.
      if (tool.risk >= 1) {
        setPendingGate(previewForTool(tool, value));
        return;
      }
      setTab('chat');
      addReport('done', `Done — ran "${tool.name}"${value ? ` with "${value}"` : ''}.`, 'x');
    },
    [pendingGate, acting, live, engine, host, toolsStale, refuseStale, startRun, addReport]
  );

  const reverse = useCallback(
    (turnId: string) => {
      // Never reverse while a run is in flight or a gate is open: a multi-step loop keeps
      // `acting` true across steps, so an earlier step's one-tap reverse stays on screen —
      // clicking it mid-run would orphan the loop's AbortController (breaking Stop) and race
      // a second execute over the content bridge. Stop first, then reverse.
      if (acting || pendingGate) return;
      // Live: re-run the inverse of THIS turn's action through the real execute pipeline.
      if (live && 'reverseAction' in engine) {
        startRun((signal) => (engine as LiveEngine).reverseAction(turnId, signal));
        return;
      }
      setTurns((prev) => [
        ...prev,
        {
          id: `rev-${turnId}`,
          kind: 'report',
          certainty: 'done',
          text: 'Reversed — turned "Marketing emails" back on.',
        },
      ]);
    },
    [live, engine, acting, pendingGate, startRun]
  );

  const choice = useCallback((picked: string) => send(picked), [send]);

  const approveGate = useCallback(() => {
    // Live: hand the approval to the awaiting loop, which executes + reports the outcome.
    if (gateResolverRef.current) {
      resolveGate(true);
      inputRef.current?.focus();
      return;
    }
    // Stub: scripted "Done" report.
    setPendingGate((g) => {
      if (g) {
        setTab('chat');
        setTurns((prev) => [
          ...prev,
          {
            id: `g-${prev.length}`,
            kind: 'report',
            certainty: 'done',
            text: `Done — clicked "${g.proceedLabel}". ${g.consequence}`,
          },
        ]);
      }
      return null;
    });
    inputRef.current?.focus();
  }, [resolveGate]);

  const cancelGate = useCallback(() => {
    // Live: the loop reports "didn't" itself when the gate resolves false.
    if (gateResolverRef.current) {
      resolveGate(false);
      inputRef.current?.focus();
      return;
    }
    // Stub: scripted "didn't" report.
    setPendingGate(null);
    addReport('didnt', 'You stopped it — I didn’t do anything.', 'gx');
    inputRef.current?.focus();
  }, [resolveGate, addReport]);

  // Cloud fallback: an explicit, per-use opt-in. It flips the locus off-device.
  const useCloudOnce = useCallback(() => {
    setCloudOnce(true);
    setLocus('off-device');
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && acting && !pendingGate) stop();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [acting, pendingGate, stop]);

  return (
    <div className="pa">
      <Header
        page={page}
        freshness={freshnessState}
        locus={locus}
        acting={acting}
        onRescan={rescan}
        onStop={stop}
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as SurfaceTab)} label="Surfaces">
        <Tab value="chat">Chat</Tab>
        <Tab value="tools">Tools</Tab>
        <Tab value="scan">Scan</Tab>
        <Tab value="profiles" disabled>
          Profiles (Later)
        </Tab>
      </Tabs>

      {degraded ? (
        <AvailabilityBanner
          reason="On-device AI is unavailable in this browser"
          cloudOffered
          onUseCloudOnce={useCloudOnce}
        />
      ) : null}

      <div className="pa-surface">
        {tab === 'chat' &&
          (degraded ? (
            <p className="pa-placeholder">
              Chat needs the on-device model. You can still browse the Tools found here, run one,
              and inspect the Scan — see the banner above.
            </p>
          ) : (
            <Chat
              page={page}
              tools={tools}
              turns={turns}
              acting={acting}
              status={status}
              inputRef={inputRef}
              onSend={send}
              onStop={stop}
              onReverse={reverse}
              onChoice={choice}
            />
          ))}
        {tab === 'tools' && <ToolsSurface tools={tools} onRun={runTool} />}
        {tab === 'scan' && <ScanGen freshness={freshnessState} result={scanResult} onRescan={rescan} />}
      </div>

      {pendingGate ? (
        <ConfirmGate
          key={`${pendingGate.toolName}:${pendingGate.value ?? ''}:${pendingGate.tier}:${pendingGate.unsure ? 'u' : ''}:${pendingGate.locatable ? '' : 'd'}`}
          preview={pendingGate}
          onApprove={approveGate}
          onCancel={cancelGate}
        />
      ) : null}

      <details className="pa-gallery">
        <summary>Screen gallery (dev)</summary>
        <div className="pa-gallery__row">
          <Toggle checked={dense} onCheckedChange={setDense} label="Dense page (50–100 tools)" />
          <span className="pa-gallery__label">Locus:</span>
          {(['on-device', 'unavailable', 'off-device'] as const).map((l) => (
            <Button
              key={l}
              variant={locus === l ? 'primary' : 'ghost'}
              onClick={() => {
                setLocus(l);
                setCloudOnce(false);
              }}
            >
              {l}
            </Button>
          ))}
          <span className="pa-gallery__label">Gate:</span>
          <Button
            variant="ghost"
            onClick={() => setPendingGate(buildGatePreview('cancel subscription', 1))}
          >
            Tier 1
          </Button>
          <Button variant="ghost" onClick={() => setPendingGate(buildGatePreview('pay $500', 2))}>
            Tier 2
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              setPendingGate({ ...buildGatePreview('cancel subscription', 1), locatable: false })
            }
          >
            Can’t locate
          </Button>
          <Button variant="ghost" onClick={() => setTurns([])}>
            Clear transcript
          </Button>
        </div>
      </details>
    </div>
  );
}
