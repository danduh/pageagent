// WebMCP fusion (Step 8.1). Merge the page's OWN declared `document.modelContext` tools
// with the DOM-manufactured tool-set into one transparently-sourced list. Site-declared
// tools WIN on overlap (REQ-SCAN-6): the site knows its own capabilities better than our
// DOM heuristic. Pure + deterministic so it is unit-testable and swap-safe.
//
// A declared tool's id is its WebMCP `name` (that is what document.modelContext.executeTool
// resolves), tagged `source: 'declared'` so the engine routes it to the site's own handler
// instead of a DOM action, and the Tools surface shows it as "From this site".

import type { DeclaredToolDef, ObservedChange } from './scan-types';
import type { Tool } from './types';
import { classifyAction } from '../safety/classifier';

function nonEmpty(s: string | undefined): string | undefined {
  return s && s.trim() ? s : undefined;
}

/**
 * Split camelCase / snake_case machine names into spaced words so the keyword classifier
 * sees the verb. Without this, a declared `deleteAccount` (no `\b` after "delete") would
 * slip past the Tier-2 gate — a real safety gap for site-declared destructive tools.
 */
export function humanize(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .trim();
}

/** Top-level parameter names declared in a JSON-Schema inputSchema (for arg hints). */
export function schemaParamNames(schema: unknown): string[] {
  if (!schema || typeof schema !== 'object') return [];
  const props = (schema as { properties?: unknown }).properties;
  if (!props || typeof props !== 'object') return [];
  return Object.keys(props as Record<string, unknown>);
}

/**
 * A compact, model-readable description of a site tool's arguments so the loop can fill the
 * NAMED fields (not a single args.value) — e.g. `name (one of: marketing, security), enabled
 * (true/false)`. Nano fumbled multi-arg site tools when told only the field names (live bug).
 */
export function describeArgs(schema: unknown): string | undefined {
  if (!schema || typeof schema !== 'object') return undefined;
  const props = (schema as { properties?: unknown }).properties;
  if (!props || typeof props !== 'object') return undefined;
  const required = (schema as { required?: unknown }).required;
  const req = new Set(Array.isArray(required) ? (required as unknown[]).map(String) : []);
  // These field/enum strings are SITE-controlled and go into the model's system prompt, so
  // collapse whitespace + strip control chars + cap length — a crafted enum value can't break
  // out of its line to forge an instruction (same defence as the declared-tool-id escaping).
  const clean = (v: unknown): string =>
    String(v)
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 40);
  const parts = Object.entries(props as Record<string, unknown>).map(([rawKey, spec]) => {
    const key = clean(rawKey);
    const s = (spec ?? {}) as Record<string, unknown>;
    let hint = key;
    if (Array.isArray(s.enum)) hint += ` (one of: ${s.enum.slice(0, 12).map(clean).join(', ')})`;
    else if (s.type === 'boolean') hint += ' (true/false)';
    else if (typeof s.type === 'string') hint += ` (${clean(s.type)})`;
    return req.size > 0 && !req.has(rawKey) ? `${hint} [optional]` : hint;
  });
  return parts.length > 0 ? parts.slice(0, 12).join(', ') : undefined;
}

/** Map one site-declared WebMCP tool to a PageAgent Tool. */
export function declaredToTool(d: DeclaredToolDef): Tool {
  const name = nonEmpty(d.title) ?? d.name;
  const params = schemaParamNames(d.inputSchema);
  const tool: Tool = {
    id: d.name,
    name,
    description: nonEmpty(d.description) ?? name,
    // Site tools are "run this capability" — the source badge carries the real distinction;
    // the engine routes by `source`, not by actionType.
    actionType: 'click',
    source: 'declared',
    // Tier on the humanized title AND the raw id, so a camelCase destructive verb still gates,
    // carrying the declaring origin (Step 8.3: a high-stakes origin escalates an ambiguous tool).
    risk: Math.max(
      classifyAction({ label: humanize(name), actionType: 'click', origin: d.origin }).tier,
      classifyAction({ label: humanize(d.name), actionType: 'click', origin: d.origin }).tier
    ) as Tool['risk'],
    provenance: `declared by ${d.origin || 'this site'}`,
  };
  if (params.length > 0) tool.valueLabel = params.join(', ');
  // A fuller arg spec (types + enums) for the model prompt, so it fills the NAMED fields.
  const argSchema = describeArgs(d.inputSchema);
  if (argSchema) tool.argSchema = argSchema;
  return tool;
}

/**
 * Fuse manufactured + declared into one tool-set. Declared tools come first (authoritative);
 * a manufactured tool whose plain name collides with a declared one is dropped (site wins).
 */
export function mergeTools(manufactured: Tool[], declared: DeclaredToolDef[]): Tool[] {
  // Dedupe declared-vs-declared by id first (a malformed getTools() snapshot can repeat a
  // name) so the loop never sees two tools with the same id.
  const seenDeclared = new Set<string>();
  const declaredTools = declared
    .map(declaredToTool)
    .filter((t) => (seenDeclared.has(t.id) ? false : (seenDeclared.add(t.id), true)));
  const declaredNames = new Set(declaredTools.map((t) => t.name.toLowerCase()));
  const declaredIds = new Set(declaredTools.map((t) => t.id));
  const keptManufactured = manufactured.filter(
    (t) => !declaredNames.has(t.name.toLowerCase()) && !declaredIds.has(t.id)
  );
  return [...declaredTools, ...keptManufactured];
}

function looksLikeFailure(v: unknown): boolean {
  if (v === false) return true;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (o.success === false || o.ok === false || o.isError === true) return true;
    if (typeof o.error === 'string' && o.error.trim() !== '') return true;
  }
  return false;
}

function summarizeResult(v: unknown): string {
  if (typeof v === 'string') return v.slice(0, 200);
  try {
    return JSON.stringify(v).slice(0, 200);
  } catch {
    return String(v).slice(0, 200);
  }
}

/** Pull the site tool's own error text out of a failure return, for a plain report. */
function failureMessage(v: unknown): string {
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    for (const k of ['error', 'message', 'reason']) {
      const s = o[k];
      if (typeof s === 'string' && s.trim() !== '') return s.trim().slice(0, 200);
    }
  }
  return summarizeResult(v);
}

/**
 * Interpret a site tool's return into an HONEST ObservedChange. We can't observe a site
 * tool's DOM effect, so a return that signals failure ({success:false}, {error}, bare false)
 * is NEVER reported as done — it is flagged `failed` (which reports a clean "that didn't work"
 * and stops a multi-step loop). Only a clean, non-failure return is `verified` (no overclaim).
 */
export function interpretDeclaredResult(result: unknown): ObservedChange {
  if (result == null) {
    return { summary: 'the site ran its tool (no result returned).', verified: false };
  }
  if (looksLikeFailure(result)) {
    return { summary: `the site said: ${failureMessage(result)}`, verified: false, failed: true };
  }
  return { summary: `the site ran its tool and returned: ${summarizeResult(result)}`, verified: true };
}
