/* PageAgent component primitives (issue #23).
 *
 * Token-driven, accessibility-first primitives the screens compose from. Every
 * interactive control is a real, keyboard-operable element with a ≥44×44 CSS-px
 * target and a visible focus ring (the global `:focus-visible` in tokens.css — we
 * never suppress it). Styling lives entirely in ./primitives.css and references
 * ONLY the semantic design tokens; no raw color leaks into this module.
 *
 * Class names are deliberately `pak-*` (Primitives-Assembly-Kit) so they never
 * collide with the side panel's existing `.pa-*` rules.
 */
import { createContext, useContext, useId, useLayoutEffect, useMemo, useRef } from 'react';
import type {
  ButtonHTMLAttributes,
  FocusEvent as ReactFocusEvent,
  InputHTMLAttributes,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
} from 'react';

import './primitives.css';

/* Tiny class-name joiner — filters out falsy branches so callers can pass
 * conditionals inline without string-concatenation noise. */
function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/* --------------------------------------------------------------------------
 * Button
 * ------------------------------------------------------------------------ */

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual role. `destructive` styles with --halt and expects a caller-supplied
   *  label (the verb/amount restatement) — there is NO built-in OK/Confirm text. */
  variant?: 'primary' | 'ghost' | 'destructive' | 'firm';
}

export function Button({ variant = 'primary', type, className, children, ...rest }: ButtonProps) {
  return (
    <button
      // Default to a non-submitting button; callers may still pass type="submit".
      type={type ?? 'button'}
      className={cx('pak-btn', `pak-btn--${variant}`, className)}
      {...rest}
    >
      {children}
    </button>
  );
}

/* --------------------------------------------------------------------------
 * Toggle — an accessible switch (role="switch", aria-checked, keyboard).
 * ------------------------------------------------------------------------ */

export interface ToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Visible label; also the switch's accessible name (via aria-labelledby). */
  label: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function Toggle({ checked, onCheckedChange, label, disabled, id, className }: ToggleProps) {
  const reactId = useId();
  const labelId = `${id ?? reactId}-label`;
  return (
    <span className={cx('pak-toggle', disabled && 'is-disabled', className)}>
      <span className="pak-toggle__label" id={labelId}>
        {label}
      </span>
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        aria-labelledby={labelId}
        disabled={disabled}
        className="pak-switch"
        onClick={() => onCheckedChange(!checked)}
      >
        <span className="pak-switch__track" aria-hidden="true">
          <span className="pak-switch__thumb" />
        </span>
      </button>
    </span>
  );
}

/* --------------------------------------------------------------------------
 * Tabs — a tablist (a div, never <nav>) of roving-tabindex <button> tabs.
 * One tab stop; arrow keys move focus and select (automatic activation).
 * ------------------------------------------------------------------------ */

interface TabsContextValue {
  value: string;
  select: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error('<Tab> must be rendered inside <Tabs>.');
  }
  return ctx;
}

export interface TabsProps {
  /** Currently selected tab value (controlled). */
  value: string;
  onValueChange: (value: string) => void;
  /** Accessible name for the tablist. */
  label: string;
  orientation?: 'horizontal' | 'vertical';
  children: ReactNode;
  className?: string;
}

export function Tabs({
  value,
  onValueChange,
  label,
  orientation = 'horizontal',
  children,
  className,
}: TabsProps) {
  const ctx = useMemo<TabsContextValue>(
    () => ({ value, select: onValueChange }),
    [value, onValueChange]
  );
  return (
    <TabsContext.Provider value={ctx}>
      <div
        role="tablist"
        aria-label={label}
        aria-orientation={orientation}
        className={cx('pak-tabs', `pak-tabs--${orientation}`, className)}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export interface TabProps {
  /** Identity of this tab; matched against the parent Tabs `value`. */
  value: string;
  children: ReactNode;
  /** id of the panel this tab controls (aria-controls). */
  controls?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export function Tab({ value, children, controls, id, disabled, className }: TabProps) {
  const { value: selected, select } = useTabsContext();
  const isSelected = value === selected;

  function onKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    const { key } = event;
    if (
      key !== 'ArrowRight' &&
      key !== 'ArrowLeft' &&
      key !== 'ArrowDown' &&
      key !== 'ArrowUp' &&
      key !== 'Home' &&
      key !== 'End'
    ) {
      return;
    }
    const tablist = event.currentTarget.closest('[role="tablist"]');
    if (!tablist) return;
    const tabs = Array.from(
      tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)')
    );
    if (tabs.length === 0) return;
    const index = tabs.indexOf(event.currentTarget);
    let next: number;
    if (key === 'Home') {
      next = 0;
    } else if (key === 'End') {
      next = tabs.length - 1;
    } else if (key === 'ArrowRight' || key === 'ArrowDown') {
      next = index < 0 ? 0 : (index + 1) % tabs.length;
    } else {
      next = index <= 0 ? tabs.length - 1 : index - 1;
    }
    event.preventDefault();
    const target = tabs[next];
    if (!target) return;
    target.focus();
    const targetValue = target.getAttribute('data-value');
    if (targetValue !== null) select(targetValue);
  }

  return (
    <button
      type="button"
      role="tab"
      id={id}
      data-value={value}
      aria-selected={isSelected}
      aria-controls={controls}
      // Roving tabindex: only the selected tab is a tab stop.
      tabIndex={isSelected ? 0 : -1}
      disabled={disabled}
      className={cx('pak-tab', isSelected && 'is-selected', className)}
      onClick={() => select(value)}
      onKeyDown={onKeyDown}
    >
      {children}
    </button>
  );
}

/* --------------------------------------------------------------------------
 * ListRow — a Tools-list row. Roving-tabindex (arrows move, Enter/Space
 * activate the row via the native button), ≥44px tall, optional trailing
 * action slot that carries its own control (kept a sibling — never nested
 * inside the row button). Wrap rows in a <ul> (or any [data-pak-list]).
 * ------------------------------------------------------------------------ */

const ROW_SELECTOR = '.pak-listrow__main:not(:disabled)';

function rowContainer(element: HTMLElement): Element {
  return (
    element.closest('[data-pak-list], ul, ol, [role="list"]') ?? element.parentElement ?? element
  );
}

function rowItems(element: HTMLElement): HTMLButtonElement[] {
  return Array.from(rowContainer(element).querySelectorAll<HTMLButtonElement>(ROW_SELECTOR));
}

export interface ListRowProps {
  children: ReactNode;
  /** Fired on click and on Enter/Space (native button activation). */
  onActivate?: () => void;
  /** Optional trailing control (e.g. a Run button); rendered as a sibling. */
  action?: ReactNode;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function ListRow({
  children,
  onActivate,
  action,
  disabled,
  className,
  'aria-label': ariaLabel,
}: ListRowProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Initialise the single tab stop: the first enabled row in the container.
  useLayoutEffect(() => {
    const button = buttonRef.current;
    if (!button) return;
    const items = rowItems(button);
    button.tabIndex = items[0] === button ? 0 : -1;
  }, []);

  function handleKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    const { key } = event;
    if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Home' && key !== 'End') {
      return;
    }
    const items = rowItems(event.currentTarget);
    if (items.length === 0) return;
    const index = items.indexOf(event.currentTarget);
    let next: number;
    if (key === 'Home') {
      next = 0;
    } else if (key === 'End') {
      next = items.length - 1;
    } else if (key === 'ArrowDown') {
      next = index < 0 ? 0 : (index + 1) % items.length;
    } else {
      next = index <= 0 ? items.length - 1 : index - 1;
    }
    event.preventDefault();
    items[next]?.focus();
  }

  // Keep exactly one tab stop as focus lands (covers keyboard and pointer focus).
  function handleFocus(event: ReactFocusEvent<HTMLButtonElement>) {
    const current = event.currentTarget;
    for (const item of rowItems(current)) {
      item.tabIndex = item === current ? 0 : -1;
    }
  }

  return (
    <li className={cx('pak-listrow', disabled && 'is-disabled', className)}>
      <button
        ref={buttonRef}
        type="button"
        className="pak-listrow__main"
        disabled={disabled}
        aria-label={ariaLabel}
        onClick={onActivate}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
      >
        {children}
      </button>
      {action ? <span className="pak-listrow__action">{action}</span> : null}
    </li>
  );
}

/* --------------------------------------------------------------------------
 * Field — a labelled input. The label is always associated via htmlFor/id;
 * placeholders are never used as the label.
 * ------------------------------------------------------------------------ */

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Optional helper text, wired to the input via aria-describedby. */
  hint?: string;
}

export function Field({ label, hint, id, className, ...rest }: FieldProps) {
  const reactId = useId();
  const inputId = id ?? reactId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  return (
    <div className={cx('pak-field', className)}>
      <label className="pak-field__label" htmlFor={inputId}>
        {label}
      </label>
      <input id={inputId} className="pak-field__input" aria-describedby={hintId} {...rest} />
      {hint ? (
        <span className="pak-field__hint" id={hintId}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Badge — a small status/type pill. Meaning is carried in words (the text
 * child is required), never by color alone.
 * ------------------------------------------------------------------------ */

export interface BadgeProps {
  tone?: 'neutral' | 'safe' | 'caution' | 'destructive' | 'brand' | 'filament';
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return <span className={cx('pak-badge', `pak-badge--${tone}`, className)}>{children}</span>;
}

/* --------------------------------------------------------------------------
 * Chip — a provenance/choice chip. A <button> when interactive (onClick),
 * otherwise an inert <span>.
 * ------------------------------------------------------------------------ */

export interface ChipProps {
  children: ReactNode;
  tone?: 'neutral' | 'brand' | 'filament' | 'offshore';
  /** When provided, the chip becomes an interactive choice control. */
  onClick?: () => void;
  /** Choice state; reflected as aria-pressed on the interactive chip. */
  selected?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Chip({
  children,
  tone = 'neutral',
  onClick,
  selected,
  disabled,
  className,
}: ChipProps) {
  const classes = cx('pak-chip', `pak-chip--${tone}`, selected && 'is-selected', className);
  if (onClick) {
    return (
      <button
        type="button"
        className={classes}
        aria-pressed={selected}
        disabled={disabled}
        onClick={onClick}
      >
        {children}
      </button>
    );
  }
  return <span className={classes}>{children}</span>;
}

/* --------------------------------------------------------------------------
 * Banner — a status strip. Destructive tone announces assertively (role
 * "alert"); every other tone is polite (role "status").
 * ------------------------------------------------------------------------ */

export interface BannerProps {
  tone?: 'neutral' | 'safe' | 'caution' | 'destructive' | 'brand' | 'filament' | 'offshore';
  children: ReactNode;
  className?: string;
}

export function Banner({ tone = 'neutral', children, className }: BannerProps) {
  const role = tone === 'destructive' ? 'alert' : 'status';
  return (
    <div role={role} className={cx('pak-banner', `pak-banner--${tone}`, className)}>
      {children}
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Card — a Tool spec-card. A FUNCTIONAL left-edge tick keyed to the atomic
 * Action-type (click / type / choose / follow-link) — not a decorative accent
 * bar — plus a mono tool-identifier headline slot and a body slot. The tick's
 * meaning is mirrored in words for assistive tech so it never rides on color
 * alone.
 * ------------------------------------------------------------------------ */

export type ActionType = 'click' | 'type' | 'choose' | 'follow-link';

const ACTION_TYPE_LABEL: Record<ActionType, string> = {
  click: 'Click',
  type: 'Type',
  choose: 'Choose',
  'follow-link': 'Follow link',
};

export interface CardProps {
  actionType: ActionType;
  /** Mono tool-identifier headline (e.g. `click_rerun_failed_jobs`). */
  name: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Card({ actionType, name, children, className }: CardProps) {
  return (
    <div className={cx('pak-card', `pak-card--${actionType}`, className)}>
      <span className="pak-card__tick" aria-hidden="true" />
      <span className="pak-vh">{`${ACTION_TYPE_LABEL[actionType]} action`}</span>
      <div className="pak-card__content">
        <div className="pak-card__name">{name}</div>
        {children ? <div className="pak-card__body">{children}</div> : null}
      </div>
    </div>
  );
}
