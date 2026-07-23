import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createStubEngine } from '../engine/stub';
import type { Turn } from '../engine/port';
import type { FreshnessState, LocusState, PageInfo, Tool } from '../engine/types';
import type { CapabilityState } from '../lib/capabilities';
import { Button, Tab, Tabs, Toggle } from '../components/primitives';
import { Header } from '../surfaces/Header';
import { Chat } from '../surfaces/Chat';
import { DENSE_TOOLS, PAGES, SPARSE_TOOLS } from '../fixtures';

type SurfaceTab = 'chat' | 'tools' | 'scan';

export function App() {
  // Dev gallery: which fixture drives the panel.
  const [dense, setDense] = useState(false);
  const engine = useMemo(
    () =>
      createStubEngine({
        page: dense ? PAGES.settings : PAGES.ci,
        tools: dense ? DENSE_TOOLS : SPARSE_TOOLS,
      }),
    [dense]
  );

  const [tab, setTab] = useState<SurfaceTab>('chat');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [acting, setActing] = useState(false);
  const [status, setStatus] = useState('');
  const [freshness, setFreshness] = useState<FreshnessState>('fresh');
  const [locus, setLocus] = useState<LocusState>('on-device');
  const [, setCapability] = useState<CapabilityState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const page: PageInfo = engine.page();
  const tools: Tool[] = engine.tools();

  useEffect(() => {
    let alive = true;
    void engine.capability().then((c) => {
      if (!alive) return;
      setCapability(c);
      setLocus(c.languageModel === 'unavailable' ? 'unavailable' : 'on-device');
    });
    inputRef.current?.focus();
    return () => {
      alive = false;
    };
  }, [engine]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setActing(false);
    setStatus('Stopped.');
    inputRef.current?.focus();
  }, []);

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || acting) return;
      setTab('chat');
      setTurns((prev) => [...prev, { id: `u-${prev.length}`, kind: 'user', text: trimmed }]);
      const controller = new AbortController();
      abortRef.current = controller;
      setActing(true);
      setStatus('Working on your device…');
      void (async () => {
        try {
          for await (const turn of engine.runIntent(trimmed, controller.signal)) {
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
    },
    [acting, engine]
  );

  const rescan = useCallback(() => {
    setFreshness('scanning');
    const controller = new AbortController();
    void engine.scan(controller.signal).then((res) => {
      setFreshness(res.status === 'failed' ? 'failed' : 'fresh');
    });
  }, [engine]);

  const reverse = useCallback((turnId: string) => {
    setTurns((prev) => [
      ...prev,
      {
        id: `rev-${turnId}`,
        kind: 'report',
        certainty: 'done',
        text: 'Reversed — turned "Marketing emails" back on.',
      },
    ]);
  }, []);

  const choice = useCallback((picked: string) => send(picked), [send]);

  // Escape stops the loop from anywhere (interruptibility).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && acting) stop();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [acting, stop]);

  return (
    <div className="pa">
      <Header
        page={page}
        freshness={freshness}
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

      <div className="pa-surface">
        {tab === 'chat' && (
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
        )}
        {tab === 'tools' && (
          <p className="pa-placeholder">The browsable tool-set (Tools) lands in Phase 5.</p>
        )}
        {tab === 'scan' && (
          <p className="pa-placeholder">The detection view (Scan / Gen) lands in Phase 5.</p>
        )}
      </div>

      <details className="pa-gallery">
        <summary>Screen gallery (dev)</summary>
        <div className="pa-gallery__row">
          <Toggle checked={dense} onCheckedChange={setDense} label="Dense page (50–100 tools)" />
          <span className="pa-gallery__label">Locus:</span>
          {(['on-device', 'unavailable', 'off-device'] as const).map((l) => (
            <Button key={l} variant={locus === l ? 'primary' : 'ghost'} onClick={() => setLocus(l)}>
              {l}
            </Button>
          ))}
          <Button variant="ghost" onClick={() => setTurns([])}>
            Clear transcript
          </Button>
        </div>
      </details>
    </div>
  );
}
