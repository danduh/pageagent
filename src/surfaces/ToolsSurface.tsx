// The TOOLS trust surface + Execute (Plan Steps 5.3 / 5.4 / 5.5, issue #41).
//
// This is where the user BROWSES what PageAgent can do on this page and RUNS a single
// tool by hand (Execute is a per-row affordance, never a co-equal fifth tab). It is
// presentational: App owns the stub↔engine seam and passes the frozen ToolsProps.
//
// Anatomy of a row (a spec-card):
//   • Left-edge tick keyed to the Action-type (mirrors the Card primitive's hue map).
//   • Mono tool identifier, plain name + description, an Action-type glyph + Badge, a
//     SOURCE badge (declared = "From this site" · manufactured = "Read from the page"),
//     and — only for risk ≥ 1 — an "Asks first" badge (it will hit the Confirm-gate).
//   • The ROW body is a single roving tab stop (ListRow arrow-key roving); Enter/Space
//     on the focused row RUNS the tool (Execute). The trailing Run button mirrors that
//     and is taken out of the Tab order (tabIndex=-1) so it's not a redundant stop; the
//     Details toggle is the one extra per-row tab stop, for keyboard disclosure.
//   • A trailing action slot with a (mouse) Run control and a one-tap Details toggle.
//   • Details is progressive disclosure — the element mapping / provenance / a mock
//     selector — NOT a raw JSON dump.
//   • type/choose tools (valueLabel present) reveal a labelled value Field in the
//     expanded row; that value is passed VERBATIM as onRun(tool, value).
//
// Honesty rules honored: unlabeled controls are NEVER given an invented name — they
// read "Unnamed control (icon only)" plus their page provenance, and note they can be
// run one at a time here. Empty is a calm state, not an error. Meaning is always in
// TEXT — the tick hue and badge tone only reinforce a word that is already present.
//
// Class names are `pat-*` / `pat__*` (PageAgent-Tools) so they never collide with the
// side panel's `.pa-*`, the primitives' `.pak-*`, or Chat's `.pac-*` rules.

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { ToolsProps } from './contracts';
import type { ActionType, Tool, ToolSource } from '../engine/types';
import { Badge, Button, Field, ListRow } from '../components/primitives';
import type { BadgeProps } from '../components/primitives';
import {
  ChevronIcon,
  ChooseIcon,
  ClickIcon,
  FollowLinkIcon,
  SearchIcon,
  TypeIcon,
} from '../components/icons';
import './tools-surface.css';

/* Plain-language Action-type label — the word rides in the Badge next to the glyph, so
 * meaning never depends on the glyph or the tick hue alone. */
const ACTION_LABEL: Record<ActionType, string> = {
  click: 'Click',
  type: 'Type',
  choose: 'Choose',
  'follow-link': 'Follow link',
};

/* Source, at-a-glance (the "fusion" story) — declared vs DOM-manufactured. Both carry
 * the distinction in WORDS; the tone is only a second, reinforcing channel. */
const SOURCE_BADGE: Record<ToolSource, string> = {
  declared: 'From this site',
  manufactured: 'Read from the page',
};
const SOURCE_BADGE_TONE: Record<ToolSource, BadgeProps['tone']> = {
  declared: 'neutral',
  manufactured: 'filament',
};
const SOURCE_LONG: Record<ToolSource, string> = {
  declared: 'This site published this action itself (a site-declared tool).',
  manufactured: 'I built this from a control I read on the page — the site didn’t publish it.',
};

/* The element the details panel maps to, written as a readable MOCK selector (this is
 * fixture-backed Scope-A; the real engine supplies the true selector). */
const ELEMENT_TAG: Record<ActionType, string> = {
  click: 'button',
  type: 'input',
  choose: 'select',
  'follow-link': 'a',
};

function mockSelector(tool: Tool): string {
  return `${ELEMENT_TAG[tool.actionType]}[data-pa-tool="${tool.id}"]`;
}

/** The name we are ALLOWED to show. Unlabeled controls never get an invented name —
 *  they read as an honest "Unnamed control (icon only)". */
function displayNameOf(tool: Tool): string {
  return tool.unlabeled ? 'Unnamed control (icon only)' : tool.name;
}

/** The sub-line under the name. For unlabeled controls this is the page provenance
 *  (never a made-up description); otherwise the tool's own description when it adds
 *  something beyond the name. */
function subLineOf(tool: Tool): string | null {
  if (tool.unlabeled) return tool.provenance;
  const desc = tool.description.trim();
  return desc && desc !== tool.name.trim() ? desc : null;
}

/** The full accessible name for a row's run button: plain name + description + the
 *  spoken destructive flag (Step 5.3 acceptance), plus source + how to run. */
function rowAccessibleName(tool: Tool): string {
  const parts: string[] = [`${ACTION_LABEL[tool.actionType]}: ${displayNameOf(tool)}`];
  const sub = subLineOf(tool);
  if (sub) parts.push(sub);
  parts.push(SOURCE_LONG[tool.source]);
  if (tool.risk >= 1) parts.push('Asks you to confirm at a checkpoint first before it runs.');
  if (tool.valueLabel) parts.push(`Needs a value: ${tool.valueLabel}. Opens a field to fill in.`);
  else parts.push('Press to run.');
  if (tool.unlabeled) parts.push('No readable label — run these one at a time.');
  return parts.join('. ') + '.';
}

/** Stable ids so the details toggle can reference its panel and we can focus the value
 *  field on expand. */
const panelId = (id: string) => `pat-panel-${id}`;
const valueFieldId = (id: string) => `pat-value-${id}`;

/** The Action-type glyph. Decorative — the Action-type is always also a Badge word. */
function ActionGlyph({ actionType, size = 18 }: { actionType: ActionType; size?: number }) {
  switch (actionType) {
    case 'click':
      return <ClickIcon size={size} />;
    case 'type':
      return <TypeIcon size={size} />;
    case 'choose':
      return <ChooseIcon size={size} />;
    case 'follow-link':
      return <FollowLinkIcon size={size} />;
  }
}

interface ToolRowProps {
  tool: Tool;
  expanded: boolean;
  value: string;
  onActivate: (tool: Tool) => void;
  onToggle: (tool: Tool) => void;
  onValueChange: (id: string, value: string) => void;
  onRunWithValue: (tool: Tool) => void;
}

function ToolRow({
  tool,
  expanded,
  value,
  onActivate,
  onToggle,
  onValueChange,
  onRunWithValue,
}: ToolRowProps) {
  const name = displayNameOf(tool);
  const sub = subLineOf(tool);
  const destructive = tool.risk >= 1;
  const pid = panelId(tool.id);

  return (
    <Fragment>
      <ListRow
        className={`pat-row pat-row--${tool.actionType}`}
        aria-label={rowAccessibleName(tool)}
        onActivate={() => onActivate(tool)}
        action={
          <div className="pat-row__actions">
            <Button
              variant="firm"
              className="pat-row__run"
              tabIndex={-1}
              onClick={() => onActivate(tool)}
              aria-label={`Run ${name}${tool.valueLabel ? ' (enter a value first)' : ''}${
                destructive ? ' — asks first' : ''
              }`}
            >
              Run
            </Button>
            <Button
              variant="ghost"
              className="pat-row__disclose"
              aria-expanded={expanded}
              aria-controls={expanded ? pid : undefined}
              aria-label={`${expanded ? 'Hide' : 'Show'} details for ${name}`}
              onClick={() => onToggle(tool)}
            >
              <ChevronIcon
                size={16}
                className={expanded ? 'pat-chevron pat-chevron--open' : 'pat-chevron'}
              />
              Details
            </Button>
          </div>
        }
      >
        <span className="pat-row__glyph" aria-hidden="true">
          <ActionGlyph actionType={tool.actionType} />
        </span>
        <span className="pat-row__text">
          <code className="pat-row__id">{tool.id}</code>
          <span className="pat-row__name">{name}</span>
          {sub ? <span className="pat-row__sub">{sub}</span> : null}
          <span className="pat-row__badges">
            <Badge tone="neutral">{ACTION_LABEL[tool.actionType]}</Badge>
            <Badge tone={SOURCE_BADGE_TONE[tool.source]}>{SOURCE_BADGE[tool.source]}</Badge>
            {destructive ? <Badge tone="caution">Asks first</Badge> : null}
          </span>
        </span>
      </ListRow>

      {expanded ? (
        <li className="pat-details">
          <div className="pat-details__panel" id={pid}>
            <div className="pat-details__field">
              <span className="pat-details__label">Where this comes from</span>
              <span className="pat-details__value">{SOURCE_LONG[tool.source]}</span>
            </div>
            <div className="pat-details__field">
              <span className="pat-details__label">On the page</span>
              <code className="pat-details__mono">{tool.provenance}</code>
            </div>
            <div className="pat-details__field">
              <span className="pat-details__label">Matched element (mock)</span>
              <code className="pat-details__mono">{mockSelector(tool)}</code>
            </div>

            {destructive ? (
              <p className="pat-details__note">
                Running this stops at a Confirm-gate first — it may be hard to undo, so I check with
                you before acting.
              </p>
            ) : null}
            {tool.unlabeled ? (
              <p className="pat-details__note">
                This control has no readable label, so I won’t name it. You can still run it here,
                one at a time.
              </p>
            ) : null}

            {tool.valueLabel ? (
              <div className="pat-details__run">
                <Field
                  id={valueFieldId(tool.id)}
                  label={tool.valueLabel}
                  placeholder={`Enter ${tool.valueLabel}…`}
                  autoComplete="off"
                  value={value}
                  onChange={(event) => onValueChange(tool.id, event.target.value)}
                />
                <Button variant="firm" onClick={() => onRunWithValue(tool)}>
                  Run with this value
                </Button>
              </div>
            ) : null}
          </div>
        </li>
      ) : null}
    </Fragment>
  );
}

export function ToolsSurface({ tools, onRun }: ToolsProps) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [values, setValues] = useState<Record<string, string>>({});
  const [focusId, setFocusId] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const trimmedQuery = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!trimmedQuery) return tools;
    return tools.filter((tool) => {
      const haystack = `${tool.name} ${tool.description} ${tool.id}`.toLowerCase();
      return haystack.includes(trimmedQuery);
    });
  }, [tools, trimmedQuery]);

  // Key for the roving-repair effect: it should fire only when the SHOWN set changes
  // (a filter), never on expand/collapse — so it never clobbers the live roving cursor.
  const shownKey = filtered.map((tool) => tool.id).join('|');

  // Defensive roving repair (re-validates the Step 4.7 contract against this real dense
  // list): after a filter narrows the rows, guarantee EXACTLY ONE row main button is a
  // tab stop. Without this, filtering away the currently-tabbable row could leave the
  // list unreachable by keyboard.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const rows = Array.from(list.querySelectorAll<HTMLButtonElement>('.pak-listrow__main'));
    if (rows.length === 0) return;
    const active = rows.findIndex((row) => row.tabIndex === 0);
    rows.forEach((row, index) => {
      const keep = active === -1 ? index === 0 : index === active;
      row.tabIndex = keep ? 0 : -1;
    });
  }, [shownKey]);

  // Focus the value field right after a type/choose row expands, so a keyboard run flows
  // straight into typing the value.
  useEffect(() => {
    if (!focusId) return;
    document.getElementById(valueFieldId(focusId))?.focus();
    setFocusId(null);
  }, [focusId]);

  function setValue(id: string, value: string) {
    setValues((prev) => ({ ...prev, [id]: value }));
  }

  function expand(id: string) {
    setExpanded((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  function toggle(tool: Tool) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(tool.id)) next.delete(tool.id);
      else next.add(tool.id);
      return next;
    });
  }

  // Run the focused row (Enter/Space, row click, or the Run button). A type/choose tool
  // can't run without a value, so it OPENS its field instead of firing empty; the value
  // is then sent verbatim from the expanded row.
  function activate(tool: Tool) {
    if (tool.valueLabel) {
      expand(tool.id);
      setFocusId(tool.id);
      return;
    }
    onRun(tool);
  }

  function runWithValue(tool: Tool) {
    onRun(tool, values[tool.id] ?? '');
  }

  // ---- calm empty state (no actionable elements at all) --------------------
  if (tools.length === 0) {
    return (
      <div className="pat">
        <div className="pat__empty">
          <p className="pat__empty-title">Nothing to run here yet</p>
          <p className="pat__empty-body">
            I didn’t find any controls on this page I could turn into actions. If the page just
            changed, re-scan it from the header.
          </p>
        </div>
      </div>
    );
  }

  const total = tools.length;
  const shown = filtered.length;
  const searching = trimmedQuery.length > 0;
  const unlabeledShown = filtered.reduce((n, tool) => (tool.unlabeled ? n + 1 : n), 0);
  const countMain = searching
    ? `Showing ${shown} of ${total}`
    : `Found ${total} ${total === 1 ? 'thing' : 'things'} you can do here`;
  const gapNote =
    unlabeledShown > 0
      ? `${unlabeledShown} ${unlabeledShown === 1 ? 'control' : 'controls'} had no label I could read`
      : null;
  // The Later top-k retrieval hint earns its place only once the set is genuinely large.
  const searchHint =
    total >= 12
      ? 'Filtering by name for now. On busy pages this becomes smarter (top-k) retrieval.'
      : undefined;

  return (
    <div className="pat">
      <div className="pat__head">
        <div className="pat__search">
          <SearchIcon size={18} className="pat__search-icon" />
          <Field
            label="Filter actions by name"
            hint={searchHint}
            type="search"
            inputMode="search"
            autoComplete="off"
            placeholder="Filter by name…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <p className="pat__count" aria-live="polite">
          {countMain}
          {gapNote ? <span className="pat__count-gap"> · {gapNote}</span> : null}
        </p>
      </div>

      <div className="pat__scroll">
        {shown === 0 ? (
          <div className="pat__noresults">
            <p className="pat__noresults-title">Nothing matches “{query.trim()}”.</p>
            <Button variant="ghost" onClick={() => setQuery('')}>
              Clear search
            </Button>
          </div>
        ) : (
          <ul className="pat__list" ref={listRef}>
            {filtered.map((tool) => (
              <ToolRow
                key={tool.id}
                tool={tool}
                expanded={expanded.has(tool.id)}
                value={values[tool.id] ?? ''}
                onActivate={activate}
                onToggle={toggle}
                onValueChange={setValue}
                onRunWithValue={runWithValue}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
