import { describe, it, expect } from 'vitest';
import { accessibleName, nearbyText, normalizeName } from './accname';

function el(html: string): Element {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.firstElementChild as Element;
}

describe('accessibleName', () => {
  it('prefers aria-labelledby over everything', () => {
    const host = document.createElement('div');
    host.innerHTML =
      '<span id="lbl">Rerun failed jobs</span><button aria-labelledby="lbl" aria-label="ignored">x</button>';
    document.body.appendChild(host);
    const btn = host.querySelector('button')!;
    expect(accessibleName(btn)).toBe('Rerun failed jobs');
  });

  it('falls back to aria-label', () => {
    expect(accessibleName(el('<button aria-label="Close dialog"></button>'))).toBe('Close dialog');
  });

  it('reads an associated label[for]', () => {
    const host = document.createElement('div');
    host.innerHTML = '<label for="q">Search jobs</label><input id="q" type="text" />';
    document.body.appendChild(host);
    expect(accessibleName(host.querySelector('input')!)).toBe('Search jobs');
  });

  it('reads a wrapping label', () => {
    expect(accessibleName(el('<label>Remember me<input type="checkbox" /></label>').querySelector('input')!)).toBe(
      'Remember me'
    );
  });

  it('uses text content for buttons and links', () => {
    expect(accessibleName(el('<button>  Rerun   failed jobs </button>'))).toBe('Rerun failed jobs');
    expect(accessibleName(el('<a href="/logs">View logs</a>'))).toBe('View logs');
  });

  it('uses title, then placeholder, then submit value', () => {
    expect(accessibleName(el('<button title="Only a title"></button>'))).toBe('Only a title');
    expect(accessibleName(el('<input type="text" placeholder="Filter" />'))).toBe('Filter');
    expect(accessibleName(el('<input type="submit" value="Save changes" />'))).toBe('Save changes');
  });

  it('returns empty string when no name can be read — never invents one', () => {
    expect(accessibleName(el('<button></button>'))).toBe('');
    expect(accessibleName(el('<input type="text" />'))).toBe('');
  });
});

describe('nearbyText', () => {
  it('reads a preceding sibling label for an unlabeled control', () => {
    const host = document.createElement('div');
    host.innerHTML = '<span>Danger zone</span><button></button>';
    document.body.appendChild(host);
    expect(nearbyText(host.querySelector('button')!)).toBe('Danger zone');
  });
});

describe('normalizeName', () => {
  it('collapses whitespace and trims', () => {
    expect(normalizeName('  a\n  b\t c ')).toBe('a b c');
    expect(normalizeName(null)).toBe('');
  });
});
