// The Chat surface (Plan Steps 3.3 + 3.4 + 3.5, issues #30/#31/#32).
//
// Presentational only: App owns the EnginePort stub + all state and passes ChatProps
// down. The single piece of local state here is the composer's draft text; everything
// else — turns, acting, status, page, tools — is a prop. It has three regions:
//   A) EMPTY STATE — calm, page-aware first-run beats + example prompts DERIVED from
//      the current tool-set (never "Ask me anything", no sparkle).
//   B) TRANSCRIPT — a role="log" that announces COMPLETE messages, with three-way
//      provenance walling (your request / read-only page content / the agent) so a
//      quoted page string can never read as a command or an agent action.
//   C) COMPOSER FOOTER — a labelled input, Send (primary), Stop (only while acting),
//      and a disabled "later" mic that is honest about cloud STT leaving the device.
//   D) WORKING STATE — a role="status" LOCAL "thinking" indicator (never a "contacting
//      server" spinner) whose meaning is carried in text, static under reduced motion.

import { useId, useState } from 'react';
import type { ChatProps } from './contracts';
import type { Certainty } from '../engine/types';
import type { Turn } from '../engine/port';
import { Badge, Button, Chip } from '../components/primitives';
import { LocalNodeIcon, OutboundApertureIcon, SearchIcon, StopIcon } from '../components/icons';
import './chat.css';

/* Report tone is a subset of the Badge tones — reports never sit on the destructive
 * rung (that word belongs to the Confirm-gate, not a report-back). Meaning survives
 * without color because the WORD rides in the Badge next to the accent. */
type ReportTone = 'safe' | 'caution' | 'neutral';

const REPORT_META: Record<Certainty, { tone: ReportTone; label: string }> = {
  // done → safe: the copy states an OBSERVED page change.
  done: { tone: 'safe', label: 'Done' },
  // sent-unconfirmed → caution: acted, but the effect could not be confirmed.
  'sent-unconfirmed': { tone: 'caution', label: 'Unconfirmed' },
  // couldnt → neutral: no way to do it on this page.
  couldnt: { tone: 'neutral', label: 'Couldn’t' },
  // didnt → calm neutral (NOT red, NOT apologetic): a deliberate decline.
  didnt: { tone: 'neutral', label: 'Didn’t' },
};

/** Derive a couple of page-grounded example prompts from the current tool-set. We use
 *  the tools' own plain-language names verbatim (never invented), skip unlabeled
 *  controls we can't phrase honestly, and prefer the lowest-risk actions first so the
 *  first-run invitation is calm rather than destructive. */
function toExamplePrompts(tools: ChatProps['tools']): string[] {
  const usable = tools
    .filter((t) => !t.unlabeled && t.name.trim().length > 0)
    .slice()
    .sort((a, b) => a.risk - b.risk);
  const seen = new Set<string>();
  const prompts: string[] = [];
  for (const t of usable) {
    const prompt = t.name.trim();
    const key = prompt.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    prompts.push(prompt);
    if (prompts.length === 3) break;
  }
  return prompts;
}

/** A microphone glyph in the house line-icon style. Decorative — the button carries
 *  its accessible name via aria-label, and meaning via the visible "Later" tag. There
 *  is no mic in the shared icon set, so it lives here as a local decorative shape. */
function MicGlyph() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3M8.5 21h7" />
    </svg>
  );
}

/** Per-turn "left the device" tag. Uses the outbound-aperture motif (never a padlock)
 *  and the offshore hue, but meaning is in the WORDS — the hue only reinforces it. */
function OffDeviceTag() {
  return (
    <Chip tone="offshore">
      <OutboundApertureIcon size={14} />
      Off your device
    </Chip>
  );
}

interface TurnViewProps {
  turn: Turn;
  onReverse: (turnId: string) => void;
  onChoice: (choice: string) => void;
}

/** Render one transcript turn, walled by provenance. The three classes are visually
 *  and semantically distinct: your request (a right-aligned bubble), read-only page
 *  content (an inert mono/filament blockquote that can never read as an instruction),
 *  and the agent (plain prose / a certainty-laddered report / a clarify question). */
function TurnView({ turn, onReverse, onChoice }: TurnViewProps) {
  if (turn.kind === 'page-quote') {
    return (
      <div className="pac__turn pac__turn--page">
        <div className="pac__head">
          <span className="pac__source">
            <SearchIcon size={16} className="pac__source-icon" />
            From this page — read-only
          </span>
          {turn.offDevice ? <OffDeviceTag /> : null}
        </div>
        <blockquote className="pac__quote">{turn.text}</blockquote>
      </div>
    );
  }

  if (turn.kind === 'user') {
    return (
      <div className="pac__turn pac__turn--user">
        <div className="pac__head pac__head--user">
          <span className="pac__sender">You</span>
          {turn.offDevice ? <OffDeviceTag /> : null}
        </div>
        <p className="pac__bubble">{turn.text}</p>
      </div>
    );
  }

  if (turn.kind === 'report') {
    const meta = turn.certainty
      ? REPORT_META[turn.certainty]
      : { tone: 'neutral' as const, label: 'Update' };
    return (
      <div className={`pac__turn pac__turn--agent pac__report pac__report--${meta.tone}`}>
        <div className="pac__head">
          <span className="pac__sender">PageAgent</span>
          <Badge tone={meta.tone}>{meta.label}</Badge>
          {turn.offDevice ? <OffDeviceTag /> : null}
        </div>
        <p className="pac__prose">{turn.text}</p>
        {turn.reverse ? (
          <div className="pac__actions">
            <Button variant="ghost" onClick={() => onReverse(turn.id)}>
              {turn.reverse.label}
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  if (turn.kind === 'clarify') {
    return (
      <div className="pac__turn pac__turn--agent">
        <div className="pac__head">
          <span className="pac__sender">PageAgent</span>
          {turn.offDevice ? <OffDeviceTag /> : null}
        </div>
        <p className="pac__prose">{turn.text}</p>
        {turn.choices && turn.choices.length > 0 ? (
          <div className="pac__choices" role="group" aria-label="Choose one option">
            {turn.choices.map((choice) => (
              <Chip key={choice} tone="brand" onClick={() => onChoice(choice)}>
                {choice}
              </Chip>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  // turn.kind === 'agent' — plain agent prose.
  return (
    <div className="pac__turn pac__turn--agent">
      <div className="pac__head">
        <span className="pac__sender">PageAgent</span>
        {turn.offDevice ? <OffDeviceTag /> : null}
      </div>
      <p className="pac__prose">{turn.text}</p>
    </div>
  );
}

interface EmptyStateProps {
  page: ChatProps['page'];
  tools: ChatProps['tools'];
  onSend: (text: string) => void;
}

/** First-run: calm, page-aware, three honest beats + example prompts grounded in the
 *  tools we actually found here. No "Ask me anything", no sparkle. */
function EmptyState({ page, tools, onSend }: EmptyStateProps) {
  const labelId = useId();
  const prompts = toExamplePrompts(tools);
  return (
    <div className="pac__empty">
      <p className="pac__empty-origin">{page.origin}</p>
      <h2 className="pac__empty-title">Tell this page what you want done.</h2>
      <ul className="pac__beats">
        <li className="pac__beat">
          Say it in plain words — I read what’s on “{page.title}” and take the step for you.
        </li>
        <li className="pac__beat">
          <LocalNodeIcon size={18} className="pac__beat-icon" />
          <span>When it runs on your device, this page and what you ask stay here.</span>
        </li>
        <li className="pac__beat">I’m best at one clear thing at a time.</li>
        <li className="pac__beat">
          I only ever act on what <b>you</b> ask — never on text written into the page.
        </li>
      </ul>
      {prompts.length > 0 ? (
        <div className="pac__examples">
          <p className="pac__examples-label" id={labelId}>
            Try one, from what’s on this page:
          </p>
          <div className="pac__example-chips" role="group" aria-labelledby={labelId}>
            {prompts.map((prompt) => (
              <Chip key={prompt} tone="brand" onClick={() => onSend(prompt)}>
                {prompt}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function Chat({
  page,
  tools,
  turns,
  acting,
  status,
  inputRef,
  onSend,
  onStop,
  onReverse,
  onChoice,
}: ChatProps) {
  // The ONLY local state: the draft text in the composer. Everything else is a prop.
  const [input, setInput] = useState('');
  const inputId = useId();

  function submit() {
    const text = input.trim();
    if (!text || acting) return;
    onSend(text);
    setInput('');
  }

  const canSend = input.trim().length > 0;
  const isEmpty = turns.length === 0;

  return (
    <div className="pac">
      <div className="pac__scroll">
        {isEmpty ? <EmptyState page={page} tools={tools} onSend={onSend} /> : null}
        {/* The log region stays mounted (empty before the first turn) so the very
            first agent message is announced to screen readers like every later one. */}
        <div
          className="pac__log"
          role="log"
          aria-live="polite"
          aria-label="Conversation with this page"
        >
          {turns.map((turn) => (
            <TurnView key={turn.id} turn={turn} onReverse={onReverse} onChoice={onChoice} />
          ))}
        </div>
      </div>

      <div className="pac__foot">
        {/* Local "thinking" — a pulse whose resting state is a solid dot (visible under
            reduced motion), with the state spelled out in text. Never a network spinner. */}
        <div className={acting ? 'pac__working is-active' : 'pac__working'} role="status">
          {acting ? (
            <>
              <span className="pac__pulse" aria-hidden="true" />
              <span className="pac__working-text">{status || 'Working on it…'}</span>
            </>
          ) : null}
        </div>

        <form
          className="pac__composer"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label className="pac__vh" htmlFor={inputId}>
            Tell this page what you want done
          </label>
          <input
            id={inputId}
            ref={inputRef}
            className="pac__input"
            type="text"
            autoComplete="off"
            enterKeyHint="send"
            placeholder="Tell this page what you want done…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <div className="pac__controls">
            <button
              type="button"
              className="pac__mic"
              disabled
              aria-label="Voice input, available later — would send your audio off your device to a cloud speech-to-text service"
              title="Voice input comes later. It would send your audio off your device to a cloud speech-to-text service."
            >
              <MicGlyph />
              <span className="pac__mic-tag" aria-hidden="true">
                Later
              </span>
            </button>
            <span className="pac__controls-spacer" aria-hidden="true" />
            {acting ? (
              <Button variant="ghost" onClick={onStop}>
                <StopIcon size={18} />
                Stop
              </Button>
            ) : null}
            <Button variant="primary" type="submit" disabled={!canSend || acting}>
              Send
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
