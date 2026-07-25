// Pragmatic accessible-name + nearby-text computation (Step 7.3 / 7.4, REQ-A11Y-3).
//
// This is NOT the full W3C accname algorithm (which is large and rarely needed in
// full for actionable controls). It covers the load-bearing cases in priority order
// and — critically — returns `''` when it genuinely cannot read a name, so tool-gen
// can present the control HONESTLY as unlabeled rather than inventing a label
// (REQ-SCAN-3). Better to say "no accessible name found" than to guess wrong.

/** Collapse runs of whitespace and trim. */
export function normalizeName(raw: string | null | undefined): string {
  return (raw ?? '').replace(/\s+/g, ' ').trim();
}

function rootOf(el: Element): Document | ShadowRoot {
  const root = el.getRootNode();
  // Both Document and ShadowRoot expose getElementById.
  return root as Document | ShadowRoot;
}

function textFromIds(el: Element, idrefs: string): string {
  const root = rootOf(el);
  const parts: string[] = [];
  for (const id of idrefs.split(/\s+/).filter(Boolean)) {
    const ref = root.getElementById?.(id);
    if (ref) parts.push(normalizeName(ref.textContent));
  }
  return normalizeName(parts.join(' '));
}

function escapeForSelector(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
  return value.replace(/["\\]/g, '\\$&');
}

/** The <label> associated with a form control (wrapping or for=id). */
function associatedLabelText(el: Element): string {
  const id = el.getAttribute('id');
  if (id) {
    const root = rootOf(el);
    // Escape the id for the attribute selector (ids can contain odd characters).
    const forLabel = root.querySelector?.(`label[for="${escapeForSelector(id)}"]`);
    if (forLabel) return normalizeName(forLabel.textContent);
  }
  const wrapping = el.closest('label');
  if (wrapping) {
    // The control's own text should not double-count; textContent of the label
    // minus the control is a fine approximation for the thin slice.
    return normalizeName(wrapping.textContent);
  }
  return '';
}

const TEXT_NAMED_TAGS = new Set(['button', 'a', 'summary']);

/**
 * Best-effort accessible name. Returns `''` when none can be read.
 * Priority: aria-labelledby → aria-label → associated <label> → element text
 * (for buttons/links) → title → placeholder → alt → button/submit value.
 */
export function accessibleName(el: Element): string {
  const labelledby = el.getAttribute('aria-labelledby');
  if (labelledby) {
    const t = textFromIds(el, labelledby);
    if (t) return t;
  }

  const ariaLabel = normalizeName(el.getAttribute('aria-label'));
  if (ariaLabel) return ariaLabel;

  const tag = el.tagName.toLowerCase();

  // Form controls take their name from an associated <label> before their own text.
  if (tag === 'input' || tag === 'select' || tag === 'textarea') {
    const labelText = associatedLabelText(el);
    if (labelText) return labelText;
  }

  if (TEXT_NAMED_TAGS.has(tag) || el.getAttribute('role') === 'button') {
    const text = normalizeName(el.textContent);
    if (text) return text;
  }

  const title = normalizeName(el.getAttribute('title'));
  if (title) return title;

  if (tag === 'input') {
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    if (type === 'submit' || type === 'button' || type === 'reset') {
      const value = normalizeName(el.getAttribute('value'));
      if (value) return value;
    }
    if (type === 'image') {
      const alt = normalizeName(el.getAttribute('alt'));
      if (alt) return alt;
    }
    const placeholder = normalizeName(el.getAttribute('placeholder'));
    if (placeholder) return placeholder;
  }

  // An <img> inside a link/button contributes its alt text.
  const img = el.querySelector?.('img[alt]');
  if (img) {
    const alt = normalizeName(img.getAttribute('alt'));
    if (alt) return alt;
  }

  return '';
}

const NON_LABEL_TAGS = new Set(['a', 'button', 'input', 'select', 'textarea', 'option']);
const INTERACTIVE_ROLE = /^(button|link|checkbox|radio|switch|tab|menuitem|combobox|listbox|textbox|searchbox|option|slider)/;

/** A preceding element is "label-like" only if it is itself non-interactive text. */
function isLabelLike(el: Element): boolean {
  if (NON_LABEL_TAGS.has(el.tagName.toLowerCase())) return false;
  const role = el.getAttribute('role');
  if (role && INTERACTIVE_ROLE.test(role.trim().toLowerCase())) return false;
  return true;
}

/**
 * Short disambiguating text near a control — used to name honestly-unlabeled controls
 * ("near 'Delete'") and to break fingerprint ties. Deliberately a MERIT signal, not a
 * positional one: only a label-like (non-interactive) PRECEDING sibling counts. It must
 * NOT aggregate parent/sibling text — that would leak an adjacent control's words and
 * let two otherwise-identical controls be told apart by position (the Spike-B danger).
 */
export function nearbyText(el: Element): string {
  const prev = el.previousElementSibling;
  if (prev && isLabelLike(prev)) {
    const t = normalizeName(prev.textContent);
    if (t) return t.slice(0, 40);
  }
  return '';
}
