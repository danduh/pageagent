/**
 * PageAgent icon set — inline, single-color line glyphs.
 *
 * House style (line icons): viewBox 0 0 24 24, stroke = currentColor, fill = none,
 * stroke-width 1.75, round caps/joins, a squared/technical feel. Color is inherited
 * via `currentColor`, so an icon takes on the text color of whatever it sits in.
 *
 * Accessibility: pass `title` to expose an icon as an image with an accessible name
 * (role="img" + <title> + aria-label). Omit `title` for purely decorative icons —
 * they are then hidden from assistive tech (aria-hidden + focusable="false"), which
 * is the right default because meaning in this product is always carried by adjacent
 * TEXT, never by an icon alone.
 *
 * Deliberately NO padlock / shield / lock shapes anywhere (design ban): "on your
 * device" is a chip with a lit core, and the Confirm-gate is a checkpoint barrier.
 */
import type { ReactNode } from 'react';

export interface IconProps {
  /** Width & height in CSS px (icons are square). Defaults to 20. */
  size?: number;
  /**
   * Accessible name. When provided, the icon is exposed to assistive tech as an
   * image with this label. Omit for decorative icons (the common case) — they are
   * then hidden, because state is always spelled out in accompanying text.
   */
  title?: string;
  /** Extra class for layout or color overrides. */
  className?: string;
}

interface SvgProps extends IconProps {
  children: ReactNode;
}

/**
 * Shared wrapper: applies the house line-icon style and resolves the decorative vs.
 * labelled accessibility contract from the presence of `title`.
 */
function Svg({ size = 20, title, className, children }: SvgProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable={title ? undefined : 'false'}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/* ---- load-bearing state glyphs ------------------------------------------------ */

/**
 * On-device / "your machine" chip: a rounded square (the chip) with a lit filled
 * core and pins on every edge. Intentionally NOT a padlock or shield.
 */
export function LocalNodeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="5" y="5" width="14" height="14" rx="2.5" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
      <path d="M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2" />
    </Svg>
  );
}

/**
 * Leaves-device / outbound: an arrow exiting a bracket-shaped aperture toward the
 * right. Signals data crossing the device boundary (Offshore).
 */
export function OutboundApertureIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7" />
      <path d="M10 12h11" />
      <path d="M17.5 8.5 21 12l-3.5 3.5" />
    </Svg>
  );
}

/**
 * Confirm-gate checkpoint: a striped boom barrier lowered on its pivot post above
 * the ground. A gate/barrier that stops you — deliberately not a lock.
 */
export function CheckpointIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 20h18" />
      <path d="M6.5 20v-8" />
      <path d="M5 9h16v3H5z" />
      <path d="M9 9 6 12M13 9l-3 3M17 9l-3 3M21 9l-3 3" />
    </Svg>
  );
}

/* ---- action-type glyphs (1:1 with the four action kinds) ---------------------- */

/** Click: the mouse pointer / cursor. */
export function ClickIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 4 11 20.5 13.4 13.4 20.5 11 Z" />
      <path d="M13.5 13.5 19 19" />
    </Svg>
  );
}

/** Type: a keyboard (keys + spacebar). */
export function TypeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2.5" y="6.5" width="19" height="11" rx="2" />
      <path d="M6.5 10.5h.001M10 10.5h.001M13.5 10.5h.001M17 10.5h.001" />
      <path d="M8 14h8" />
    </Svg>
  );
}

/** Choose: pick one option from a set — a checked square above empty ones. */
export function ChooseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="5" width="4.5" height="4.5" rx="1" />
      <path d="M4.7 7.3 5.6 8.2 7.1 6.3" />
      <rect x="3.5" y="14.5" width="4.5" height="4.5" rx="1" />
      <path d="M11 7.25h9.5M11 16.75h9.5" />
    </Svg>
  );
}

/** Follow link: the interlocked-chain hyperlink glyph. */
export function FollowLinkIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </Svg>
  );
}

/* ---- common UI ---------------------------------------------------------------- */

/** Rescan: a circular reload / run-again arrow pair. */
export function RescanIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M21 4v6h-6" />
      <path d="M3 20v-6h6" />
      <path d="M3.5 9a9 9 0 0 1 15-3.5L21 10M3 14l2.5 4.5A9 9 0 0 0 20.5 15" />
    </Svg>
  );
}

/** Stop: a solid rounded square (halts the running loop). */
export function StopIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Search: a magnifier. */
export function SearchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16 20.5 20.5" />
    </Svg>
  );
}

/**
 * Chevron: a right-pointing chevron for disclosure / next. Rotate via CSS
 * (e.g. `transform: rotate(90deg)`) for down / up / left.
 */
export function ChevronIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 5 16 12 9 19" />
    </Svg>
  );
}
