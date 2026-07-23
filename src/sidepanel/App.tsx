import { useEffect, useRef, useState } from 'react';
import type { CapabilityState } from '../lib/capabilities';
import { detectLanguageModel, provisionLanguageModel } from '../lib/capabilities';

interface Msg {
  who: 'you' | 'agent';
  text: string;
}

export function App() {
  const [origin, setOrigin] = useState('the page in front of you');
  const [cap, setCap] = useState<CapabilityState | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [acting, setActing] = useState(false);
  const [status, setStatus] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    void detectLanguageModel().then(setCap);
    try {
      chrome.tabs?.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        const url = tabs?.[0]?.url;
        if (!url) return;
        try {
          const host = new URL(url).host;
          if (host) setOrigin(host);
        } catch {
          /* chrome:// and similar have no host */
        }
      });
    } catch {
      /* chrome.tabs unavailable outside the extension */
    }
  }, []);

  // Escape stops the loop / clears the input — interruptibility is keyboard-first
  // and app-wide, so it lives on the document rather than a static element.
  useEffect(() => {
    function onDocKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (acting) {
        setActing(false);
        setStatus('Stopped.');
        inputRef.current?.focus();
      } else if (input) {
        setInput('');
        setStatus('Cleared.');
      }
    }
    document.addEventListener('keydown', onDocKeyDown);
    return () => document.removeEventListener('keydown', onDocKeyDown);
  }, [acting, input]);

  function send() {
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { who: 'you', text }]);
    setInput('');
    setActing(true);
    setStatus('Working… (Phase 1 shell — no engine yet)');
    window.setTimeout(() => {
      setActing(false);
      setStatus('');
      setMessages((m) => [
        ...m,
        {
          who: 'agent',
          text: 'I heard you, but I have no engine yet — this is the Phase 1 build shell.',
        },
      ]);
      inputRef.current?.focus();
    }, 500);
  }

  function stop() {
    setActing(false);
    setStatus('Stopped.');
    inputRef.current?.focus();
  }

  // Provision must run inside this click handler (a user gesture) with no await before create().
  function downloadModel() {
    setStatus('Downloading on-device model…');
    provisionLanguageModel((loaded) =>
      setStatus(`Downloading on-device model… ${Math.round(loaded * 100)}%`)
    )
      .then(async () => {
        setStatus('On-device model ready.');
        setCap(await detectLanguageModel());
      })
      .catch((e: unknown) => setStatus(`Download failed: ${(e as Error).message}`));
  }

  return (
    <div className="pa">
      <header className="pa-header">
        <div className="pa-identity" aria-label="Current page">
          <span className="pa-favicon" aria-hidden="true" />
          <span className="pa-origin">{origin}</span>
        </div>
        <div className="pa-locus" title="Processing runs on your device">
          <span className="pa-node" aria-hidden="true">
            <span className="pa-node-dot" />
          </span>
          <span className="pa-locus-label">On your device</span>
        </div>
      </header>

      <div className="pa-capability" role="status">
        {cap ? (
          <>
            <span className={`pa-dot pa-dot--${cap.languageModel}`} aria-hidden="true" />
            <span>{cap.reason}</span>
            {cap.languageModel === 'downloadable' && (
              <button className="pa-link" type="button" onClick={downloadModel}>
                Download on-device model
              </button>
            )}
          </>
        ) : (
          <span>Checking on-device availability…</span>
        )}
      </div>

      <div className="pa-tabs" role="tablist" aria-label="Surfaces">
        <button role="tab" aria-selected="true" className="pa-tab is-active">
          Chat
        </button>
        <button role="tab" aria-selected="false" className="pa-tab">
          Tools
        </button>
        <button role="tab" aria-selected="false" className="pa-tab">
          Scan
        </button>
        <button role="tab" aria-selected="false" className="pa-tab pa-tab--later" disabled>
          Profiles <span className="pa-later">Later</span>
        </button>
      </div>

      <main className="pa-body" role="main">
        <h1 className="pa-hello-title">PageAgent — Phase 1 build</h1>
        <p className="pa-hello-lead">
          Now a bundled React + TypeScript side panel. The engine, real surfaces, and safety layer
          arrive in later phases.
        </p>
        <div className="pa-log" role="log" aria-live="polite" aria-label="Session log">
          {messages.map((m, i) => (
            <div key={i} className={`pa-msg pa-msg--${m.who}`}>
              <b>{m.who === 'you' ? 'You' : 'PageAgent'}:</b> {m.text}
            </div>
          ))}
        </div>
      </main>

      <footer className="pa-footer">
        <form
          className="pa-composer"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <label className="visually-hidden" htmlFor="composer-input">
            Tell this page what you want
          </label>
          <input
            id="composer-input"
            ref={inputRef}
            className="pa-input"
            type="text"
            autoComplete="off"
            placeholder="Tell this page what you want…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          {acting && (
            <button type="button" className="pa-btn pa-btn--stop" onClick={stop}>
              Stop
            </button>
          )}
          <button type="submit" className="pa-btn pa-btn--send">
            Send
          </button>
        </form>
        <p className="pa-status" role="status">
          {status}
        </p>
      </footer>
    </div>
  );
}
