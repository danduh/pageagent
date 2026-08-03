// Keyword tool-retrieval fallback (Plan Step 10.2).
//
// There is no on-device embeddings model today (SemanticEmbedder is Phase 11.1), so when a
// page is DENSE, feeding EVERY manufactured tool to the weak on-device model floods its
// context and wrecks its routing accuracy. This module narrows the tool-set to a
// request-relevant candidate set by simple request-token overlap, and reports when the set
// is still too large so the caller can ask the user to narrow instead of guessing.
//
// Two hard rules:
//  - Retrieval narrows ONLY what the AGENT (model) sees — NEVER what the user can browse
//    (REQ-RETR-5). The Tools surface always renders the full set.
//  - A SMALL page passes through UNCHANGED, so the single-action reliability that is verified
//    live is byte-identical when narrowing isn't needed. Narrowing is a dense-page-only path.
//
// Pure + framework-free so the engine (live.ts) can use it without pulling in any UI.

import type { Tool } from './types';

/** Max tools handed to the on-device model at once. At/below this a page passes through
 *  unchanged; above it a dense page is narrowed by request, and if the relevant set is STILL
 *  above it the caller asks the user to narrow. Owner-tunable. */
export const MAX_TOOLS_FOR_MODEL = 24;

// A tiny, conservative stop-word set: filler that carries no tool signal. Deliberately does
// NOT include action verbs (delete/cancel/pay/turn/off…) — those are exactly the words that
// pick out the right control, so dropping them would hurt recall.
const STOPWORDS = new Set([
  'the', 'a', 'an', 'to', 'of', 'for', 'and', 'or', 'my', 'me', 'i', 'please',
  'can', 'you', 'it', 'is', 'be', 'do', 'with', 'at', 'as', 'in', 'this', 'that',
]);

/** Split a request or label into comparable lowercase word tokens (≥ 2 chars, no stop-words).
 *  Order-independent by construction, so "rerun failed jobs" and "jobs that failed, rerun"
 *  yield the same signal — the whole-substring browse filter can't do that. */
export function tokenize(text: string): string[] {
  const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return words.filter((w) => w.length >= 2 && !STOPWORDS.has(w));
}

/** A tool's searchable text (name + description + id) as a SET of word tokens — the SAME
 *  normalization as the request, so matching is WHOLE-WORD, not substring. Substring matching
 *  let a short token like "on" match inside "Notifications"/"Options"/"Sessions" and falsely
 *  trip the "too many controls" hand-back on a busy page (review finding). */
function toolTokens(tool: Tool): Set<string> {
  return new Set(tokenize(`${tool.name} ${tool.description} ${tool.id}`));
}

/** Score a tool against the request tokens: how many DISTINCT request words appear as WHOLE
 *  WORDS in its text. 0 = no overlap. Recall-oriented — any single overlapping word keeps the
 *  tool in play, so a multi-word request rarely drops a relevant control. */
export function scoreTool(tool: Tool, requestTokens: string[]): number {
  const words = toolTokens(tool);
  let score = 0;
  for (const token of new Set(requestTokens)) {
    if (words.has(token)) score += 1;
  }
  return score;
}

export interface ToolSelection {
  /** The candidate tools to hand the model (ranked; already capped). Empty is possible on a
   *  dense page when nothing matched. */
  tools: Tool[];
  /** The page was small enough (≤ cap) that NO narrowing happened — every tool passed through
   *  unchanged. When true, the caller behaves exactly as before Step 10.2. */
  passedThrough: boolean;
  /** How many tools matched the request (score > 0) BEFORE capping. 0 on a dense page means
   *  "no control matched those words". */
  matched: number;
  /** Even after matching, the relevant set still exceeds the cap → the caller should ask the
   *  user to narrow rather than feed a truncated guess to the model. */
  tooMany: boolean;
  /** Total tools on the page (what the user can still browse). */
  total: number;
}

/**
 * Choose which tools to feed the on-device model for one request.
 * - Small page (≤ cap): pass ALL tools through unchanged (`passedThrough`).
 * - Dense page (> cap): keep only tools with request-token overlap, ranked by score desc
 *   (ties keep scan order — a stable sort); if that relevant set is STILL > cap, flag
 *   `tooMany` so the caller asks the user to narrow.
 * Never mutates the input; never reflects on what the user can browse.
 */
export function selectToolsForRequest(
  allTools: Tool[],
  request: string,
  cap: number = MAX_TOOLS_FOR_MODEL
): ToolSelection {
  const total = allTools.length;
  if (total <= cap) {
    return { tools: allTools, passedThrough: true, matched: total, tooMany: false, total };
  }
  const tokens = tokenize(request);
  const scored = allTools
    .map((tool, index) => ({ tool, index, score: scoreTool(tool, tokens) }))
    .filter((entry) => entry.score > 0)
    // Higher score first; equal scores keep original scan order (stable, deterministic).
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const matched = scored.length;
  const tooMany = matched > cap;
  const tools = scored.slice(0, cap).map((entry) => entry.tool);
  return { tools, passedThrough: false, matched, tooMany, total };
}
