// The SCAN/GEN surface (Plan Step 5.6, issue #42).
//
// The panel that shows what a page scan produced — honestly. Presentational only: it
// implements the frozen ScanProps contract (freshness + the latest ScanResult + a
// re-scan callback) and owns NO state. App drives the scan lifecycle behind the
// EnginePort seam; here we only render what a scan HONESTLY found. Five states:
//
//   A) result === null            → a calm "Scan this page to begin" invitation.
//   B) freshness === 'scanning'   → a Halide READ-LINE: a thin line sweeping a small
//        wireframe of stacked control placeholders that resolve one by one. It is
//        HONEST progress — a qualitative read pass, never a fabricated percentage — and
//        role="status" carries the meaning in words ("Reading the page…") so it survives
//        with the animation frozen under reduced motion.
//   C) result.status 'ok'|'partial' → a coverage-HONESTY summary (detected / elements /
//        unlabeled / uncovered) over an element→Tool INSPECTION list. Each tool shows its
//        plain name + an honest derivation line, with the (mock) matched selector revealed
//        only ON DEMAND via a <details> toggle. 'partial' also states its note, calmly.
//   D) result.status 'failed'     → a calm, non-alarmist failure that shows the honest
//        reason and offers a retry (a scan only READS the page, so nothing changed).
//
// A re-scan control (RescanIcon) is reachable in every state. No fake %, no network
// spinner, no "protected" claim — the honesty of the scan is the whole point.

import { useId } from 'react';
import type { ComponentType, CSSProperties } from 'react';
import type { ScanProps } from './contracts';
import type { ActionType, Tool, ToolSource } from '../engine/types';
import { Badge, Button } from '../components/primitives';
import type { IconProps } from '../components/icons';
import {
  ChevronIcon,
  ChooseIcon,
  ClickIcon,
  FollowLinkIcon,
  RescanIcon,
  SearchIcon,
  TypeIcon,
} from '../components/icons';
import './scan-gen.css';

/* Tiny class-name joiner — filters falsy branches (same shape as the primitives'). */
function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/* Count + noun, pluralised — "1 tool" reads better than the raw template's "1 tools". */
function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/* Plain-language action label — 1:1 with ActionType, shared with the Card primitive's
 * wording so the whole product names the four action kinds identically. */
const ACTION_LABEL: Record<ActionType, string> = {
  click: 'Click',
  type: 'Type',
  choose: 'Choose',
  'follow-link': 'Follow link',
};

/* The action-type glyph, reinforcing the derivation line. Decorative only — the action
 * is always ALSO stated in the adjacent text, so meaning never rides on the icon alone. */
const ACTION_ICON: Record<ActionType, ComponentType<IconProps>> = {
  click: ClickIcon,
  type: TypeIcon,
  choose: ChooseIcon,
  'follow-link': FollowLinkIcon,
};

/* The likely element tag per action — used only to shape the MOCK selector below. */
const SELECTOR_TAG: Record<ActionType, string> = {
  click: 'button',
  type: 'input',
  choose: 'select',
  'follow-link': 'a',
};

/* Honest origin: manufactured tools were derived from the DOM; declared tools are the
 * page's own WebMCP tools — we never dress one up as the other. */
function originLabel(source: ToolSource): string {
  return source === 'declared' ? 'Declared by page' : 'From DOM';
}

/* A deterministic, clearly-synthetic selector for the on-demand reveal. Scope-A has no
 * real DOM behind it, so this stands in for the selector a scan WOULD record. */
function mockSelector(tool: Tool): string {
  return `${SELECTOR_TAG[tool.actionType]}[data-pa-id="${tool.id}"]`;
}

/* Placeholder-bar widths (%) for the scanning wireframe — a handful of stacked controls. */
const WIRE_BARS = [70, 88, 58, 80, 66];

/* --------------------------------------------------------------------------
 * The re-scan bar — a heading + the always-reachable re-scan control. Rendered
 * over the content states (scanning / ok / partial); the empty + failed states
 * carry their own focal scan CTA instead.
 * ------------------------------------------------------------------------ */
function ScanBar({ onRescan }: { onRescan: () => void }) {
  return (
    <div className="psg__bar">
      <h2 className="psg__heading">Page scan</h2>
      <Button variant="ghost" className="psg__rescan" onClick={onRescan}>
        <RescanIcon size={18} />
        Re-scan
      </Button>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * One element→Tool inspection row: the tool's plain name, an honest derivation
 * line, and the matched (mock) selector tucked behind a details toggle so the
 * list stays calm at rest. The left-edge tick is keyed to the action-type (a
 * FUNCTIONAL cue, mirrored in the derivation text — never color/icon alone).
 * ------------------------------------------------------------------------ */
function ToolRow({ tool }: { tool: Tool }) {
  const ActionGlyph = ACTION_ICON[tool.actionType];
  return (
    <li className={cx('psg-tool', `psg-tool--${tool.actionType}`)}>
      <span className="psg-tool__tick" aria-hidden="true" />
      <div className="psg-tool__body">
        <div className="psg-tool__head">
          <span className={cx('psg-tool__name', tool.unlabeled && 'is-unlabeled')}>
            {tool.unlabeled ? 'Unnamed control (icon only)' : tool.name}
          </span>
          {tool.unlabeled ? <Badge tone="neutral">No label</Badge> : null}
        </div>

        <p className="psg-tool__deriv">
          <span className="psg-tool__origin">{originLabel(tool.source)}</span>
          <span className="psg-tool__sep" aria-hidden="true">
            ·
          </span>
          <span className="psg-tool__act">
            <ActionGlyph size={14} className="psg-tool__act-icon" />
            {ACTION_LABEL[tool.actionType]}
          </span>
          <span className="psg-tool__sep" aria-hidden="true">
            ·
          </span>
          <span className="psg-tool__prov">{tool.provenance}</span>
        </p>

        <details className="psg-tool__details">
          <summary className="psg-tool__summary">
            <ChevronIcon size={16} className="psg-tool__chev" />
            Show how I found it
          </summary>
          <div className="psg-tool__reveal">
            <div className="psg-tool__reveal-row">
              <span className="psg-tool__reveal-label">Matched element</span>
              <code className="psg-tool__code">{mockSelector(tool)}</code>
            </div>
            <div className="psg-tool__reveal-row">
              <span className="psg-tool__reveal-label">Tool id</span>
              <code className="psg-tool__code">{tool.id}</code>
            </div>
          </div>
        </details>
      </div>
    </li>
  );
}

export function ScanGen({ freshness, result, onRescan }: ScanProps) {
  const listId = useId();

  /* B) Scanning wins over any prior result — an in-flight read is the honest current
   *    truth. The wireframe is decorative (aria-hidden); role="status" announces the
   *    text, which is all that remains when the animation is frozen (reduced motion). */
  if (freshness === 'scanning') {
    return (
      <div className="psg">
        <ScanBar onRescan={onRescan} />
        <div className="psg__content">
          <div className="psg__scanning" role="status">
            <p className="psg__scanning-text">Reading the page…</p>
            <div className="psg__wire" aria-hidden="true">
              {WIRE_BARS.map((w, i) => {
                const barStyle = {
                  '--psg-bar-w': `${w}%`,
                  '--psg-bar-delay': `${i * 180}ms`,
                } as CSSProperties;
                return <span key={`bar-${i}`} className="psg__wire-bar" style={barStyle} />;
              })}
              <span className="psg__readline" />
            </div>
            <p className="psg__scanning-sub">
              Looking at each control in turn. This can take a moment on a busy page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* A) Never scanned — a calm invitation with the focal scan CTA. */
  if (result === null) {
    return (
      <div className="psg">
        <div className="psg__empty">
          <SearchIcon size={28} className="psg__empty-icon" />
          <h2 className="psg__empty-title">Scan this page to begin</h2>
          <p className="psg__empty-text">
            I’ll read this page’s controls and list what I can actually do here, with where each one
            came from.
          </p>
          <Button variant="primary" onClick={onRescan}>
            <SearchIcon size={18} />
            Scan this page
          </Button>
        </div>
      </div>
    );
  }

  /* D) Failed — calm and honest (not alarmist). The reason is announced politely; the
   *    retry is the focal action. A scan only reads, so nothing on the page changed. */
  if (result.status === 'failed') {
    return (
      <div className="psg">
        <div className="psg__failed">
          <h2 className="psg__failed-title">I couldn’t finish reading this page</h2>
          <p className="psg__failed-reason" role="status">
            {result.reason}
          </p>
          <p className="psg__failed-help">Nothing on the page changed — a scan only reads it.</p>
          <Button variant="primary" onClick={onRescan}>
            <RescanIcon size={18} />
            Try scanning again
          </Button>
        </div>
      </div>
    );
  }

  /* C) ok | partial — coverage honesty + the element→Tool inspection list. Both members
   *    carry tools + coverage; only 'partial' adds a note. */
  const { tools, coverage } = result;
  return (
    <div className="psg">
      <ScanBar onRescan={onRescan} />
      <div className="psg__content">
        <div className="psg__summary">
          <p className="psg__summary-line">
            Found <strong>{plural(coverage.detected, 'tool', 'tools')}</strong> from{' '}
            <strong>{plural(coverage.fromElements, 'element', 'elements')}</strong>
            {coverage.unlabeled > 0 ? (
              <span className="psg__summary-extra">
                {' · '}
                {plural(coverage.unlabeled, 'control', 'controls')} had no label I could name
              </span>
            ) : null}
          </p>

          {result.status === 'partial' ? (
            <div className="psg__note">
              <Badge tone="caution">Partial scan</Badge>
              <span className="psg__note-text">{result.note}</span>
            </div>
          ) : null}

          {coverage.uncovered.length > 0 ? (
            <div className="psg__uncovered">
              <p className="psg__uncovered-title">Couldn’t cover reliably:</p>
              <ul className="psg__uncovered-list">
                {coverage.uncovered.map((region) => (
                  <li key={region} className="psg__uncovered-item">
                    {region}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {tools.length > 0 ? (
          <>
            <h3 className="psg__tools-title" id={listId}>
              Element-to-tool mapping
            </h3>
            <ul className="psg__tools" aria-labelledby={listId}>
              {tools.map((tool) => (
                <ToolRow key={tool.id} tool={tool} />
              ))}
            </ul>
          </>
        ) : (
          <p className="psg__empty-note">I didn’t find any controls I can operate on this page.</p>
        )}
      </div>
    </div>
  );
}
