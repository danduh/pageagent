// Spike A2 follow-up battery. Runs entirely at the extension origin. Exposes
// window.spikeA2.* granular probes (so an automation harness can drive each stage
// with bounded latency and read the JSON back) plus a "Run all" button that renders
// the report in the real side-panel document (the authoritative test for #5).
//
// Everything is wrapped so one failing stage never aborts the battery. No preceding
// `await` before the first create() in the button handler (user-gesture-safe per
// Spike A), and a separate no-gesture path is exercised when driven from a tab.
'use strict';

// --- Reuse: INTENT_SCHEMA + parse helpers (verbatim from window-ai mcpAgentLoop) ---
const INTENT_SCHEMA = {
  type: 'object',
  required: ['toolName'],
  additionalProperties: false,
  properties: {
    toolName: {
      type: 'string',
      description:
        'Name of the tool to call next, or "done" when you are ready to give a plain-text reply.',
    },
    args: {
      type: 'object',
      description: 'Arguments object for the tool (omit or use {} when toolName is "done").',
    },
    reply: {
      type: 'string',
      description: 'Your conversational reply to the user. Only populated when toolName is "done".',
    },
  },
};

function extractJsonFromResponse(raw) {
  const trimmed = String(raw).trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch (_) {
    /* fall through */
  }
  const fenceMatch = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/);
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1].trim());
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch (_) {
      /* fall through */
    }
  }
  const braceMatch = trimmed.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      const parsed = JSON.parse(braceMatch[0]);
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch (_) {
      /* fall through */
    }
  }
  return null;
}

function renderSchemaProperties(inputSchema) {
  const props =
    inputSchema && typeof inputSchema.properties === 'object' ? inputSchema.properties : {};
  const required = Array.isArray(inputSchema && inputSchema.required) ? inputSchema.required : [];
  const entries = Object.entries(props);
  if (entries.length === 0) return '{}';
  return `{ ${entries
    .map(([k, v]) => `"${k}": ${(v && v.type) || 'any'}${required.includes(k) ? ' (required)' : ''}`)
    .join(', ')} }`;
}

function buildSystemPrompt(tools) {
  const toolLines = tools
    .map((t) => `- ${t.name}${t.description ? ` — ${t.description}` : ''}\n  args: ${renderSchemaProperties(t.inputSchema)}`)
    .join('\n');
  const validNames = tools.map((t) => t.name).join(', ');
  return `You are an assistant that fulfils the user's request by calling one of the listed tools.

You respond ONLY with a single JSON object — no markdown, no code fences, no extra text.
Format: { "toolName": "<toolName or 'done'>", "args": { ... }, "reply": "<only when done>" }

Available tools (call ONE per turn):
${toolLines}

Valid tool names: ${validNames}

CRITICAL RULES:
1. Only ever use a tool name from the "Valid tool names" list above.
2. "toolName" MUST be a plain string equal to one of those names.
3. Fill "args" using the argument schema shown for the chosen tool.
4. NEVER wrap the JSON in code fences or markdown. Output ONLY the raw JSON object.`;
}

// --- Tool sets -------------------------------------------------------------
const SMALL_TOOLS = [
  { name: 'click_rerun_failed_jobs', description: 'Re-run all failed jobs in this workflow run', inputSchema: { type: 'object', properties: {}, required: [] } },
  { name: 'click_cancel_run', description: 'Cancel the current in-progress run', inputSchema: { type: 'object', properties: {}, required: [] } },
  { name: 'click_view_logs', description: 'View the logs for the selected job', inputSchema: { type: 'object', properties: {}, required: [] } },
  { name: 'type_search_jobs', description: 'Search jobs by name', inputSchema: { type: 'object', properties: { value: { type: 'string' } }, required: ['value'] } },
  { name: 'follow_link_settings', description: 'Open the repository settings page', inputSchema: { type: 'object', properties: {}, required: [] } },
];
const SMALL_INTENT = 'rerun the failed jobs';
const SMALL_EXPECTED = 'click_rerun_failed_jobs';

function buildDenseTools() {
  const settings = [
    'security_alerts', 'weekly_digest', 'product_updates', 'push_notifications', 'sound_effects',
    'auto_save', 'dark_mode', 'compact_layout', 'show_avatars', 'two_factor_auth',
    'login_alerts', 'session_timeout', 'data_export', 'analytics_sharing', 'crash_reports',
    'beta_features', 'keyboard_shortcuts', 'read_receipts', 'typing_indicators', 'online_status',
    'profile_public', 'search_indexing', 'comment_mentions', 'follow_notifications', 'newsletter',
    'promotions', 'partner_offers', 'sms_alerts', 'desktop_alerts', 'high_contrast',
    'reduced_motion', 'autoplay_video', 'location_services', 'contacts_sync', 'calendar_sync',
  ];
  const tools = settings.map((s) => ({
    name: `toggle_${s}`,
    description: `Turn ${s.replace(/_/g, ' ')} on or off`,
    inputSchema: { type: 'object', properties: {}, required: [] },
  }));
  // The target — embedded mid-list, not first/last.
  tools.splice(18, 0, {
    name: 'toggle_marketing_emails',
    description: 'Turn marketing emails on or off',
    inputSchema: { type: 'object', properties: {}, required: [] },
  });
  return tools;
}
const DENSE_TOOLS = buildDenseTools();
const DENSE_INTENT = 'turn off marketing emails';
const DENSE_EXPECTED = 'toggle_marketing_emails';

// --- Env helpers -----------------------------------------------------------
function getLM() {
  return self.LanguageModel || (self.ai && self.ai.languageModel) || null;
}
function chromeVersion() {
  const m = navigator.userAgent.match(/Chrome\/(\d+[.\d]*)/);
  return m ? m[1] : 'unknown';
}
async function timed(fn) {
  const t0 = performance.now();
  const v = await fn();
  return { ms: Math.round(performance.now() - t0), v };
}

// --- Stages ----------------------------------------------------------------
async function env() {
  const LM = getLM();
  let availability = null;
  let availErr = null;
  if (LM && LM.availability) {
    try {
      availability = await LM.availability();
    } catch (e) {
      availErr = String((e && e.message) || e);
    }
  }
  return {
    href: location.href,
    origin: location.origin,
    isExtensionOrigin: location.origin.startsWith('chrome-extension://'),
    ua: navigator.userAgent,
    chrome: chromeVersion(),
    userActivationActive: Boolean(navigator.userActivation && navigator.userActivation.isActive),
    surface: {
      typeofLanguageModel: typeof self.LanguageModel,
      aiLanguageModelPresent: Boolean(self.ai && self.ai.languageModel),
    },
    availability,
    availabilityError: availErr,
  };
}

// create() + a PING prompt for latency. When called from a tab via the harness
// there is NO user gesture — success here confirms the no-gesture claim at the
// extension origin.
async function createProbe() {
  const LM = getLM();
  if (!LM || !LM.create) return { ok: false, error: 'no LanguageModel.create' };
  const out = { userActivationActive: Boolean(navigator.userActivation && navigator.userActivation.isActive) };
  let session;
  try {
    const c = await timed(() => LM.create({}));
    session = c.v;
    out.create = { ok: true, ms: c.ms };
  } catch (e) {
    out.create = { ok: false, error: String((e && e.message) || e) };
    return out;
  }
  try {
    const p = await timed(() => session.prompt('Reply with the single word PONG.'));
    out.prompt = { ok: true, ms: p.ms, text: String(p.v).slice(0, 120) };
  } catch (e) {
    out.prompt = { ok: false, error: String((e && e.message) || e) };
  }
  try {
    session.destroy && session.destroy();
  } catch (_) {
    /* ignore */
  }
  return out;
}

// Independent structured-output test (separate from tool-calling). Tries the
// modern prompt(text, { responseConstraint }) first, then legacy create({ responseFormat }).
async function structured() {
  const LM = getLM();
  if (!LM || !LM.create) return { ok: false, error: 'no LanguageModel.create' };
  const sys = buildSystemPrompt(SMALL_TOOLS);
  const result = { expected: SMALL_EXPECTED };
  // Path 1: responseConstraint on prompt().
  try {
    const session = await LM.create({ initialPrompts: [{ role: 'system', content: sys }] });
    const p = await timed(() => session.prompt(SMALL_INTENT, { responseConstraint: INTENT_SCHEMA }));
    result.call = 'prompt(text,{responseConstraint})';
    result.ok = true;
    result.ms = p.ms;
    result.raw = String(p.v).slice(0, 400);
    const parsed = extractJsonFromResponse(String(p.v));
    result.parsed = parsed;
    result.parsedToolName = parsed && parsed.toolName;
    result.correct = result.parsedToolName === SMALL_EXPECTED;
    // Schema-faithful = toolName is a plain string (Canary saw an object here).
    result.schemaFaithful = typeof (parsed && parsed.toolName) === 'string';
    session.destroy && session.destroy();
    return result;
  } catch (e) {
    result.responseConstraintError = String((e && e.message) || e);
  }
  // Path 2: legacy responseFormat on create().
  try {
    const session = await LM.create({
      initialPrompts: [{ role: 'system', content: sys }],
      responseFormat: { type: 'json_schema', schema: INTENT_SCHEMA },
    });
    const p = await timed(() => session.prompt(SMALL_INTENT));
    result.call = 'create({responseFormat}) + prompt';
    result.ok = true;
    result.ms = p.ms;
    result.raw = String(p.v).slice(0, 400);
    const parsed = extractJsonFromResponse(String(p.v));
    result.parsed = parsed;
    result.parsedToolName = parsed && parsed.toolName;
    result.correct = result.parsedToolName === SMALL_EXPECTED;
    result.schemaFaithful = typeof (parsed && parsed.toolName) === 'string';
    session.destroy && session.destroy();
    return result;
  } catch (e) {
    result.responseFormatError = String((e && e.message) || e);
    result.ok = false;
    return result;
  }
}

// One INTENT_SCHEMA routing turn (the manual-loop mechanism).
async function intentSchemaTurn(tools, userText, expected) {
  const LM = getLM();
  const sys = buildSystemPrompt(tools);
  const session = await LM.create({ initialPrompts: [{ role: 'system', content: sys }] });
  const out = { expected, toolCount: tools.length };
  try {
    const p = await timed(() => session.prompt(userText, { responseConstraint: INTENT_SCHEMA }));
    out.ms = p.ms;
    out.raw = String(p.v).slice(0, 400);
    const parsed = extractJsonFromResponse(String(p.v));
    out.malformed = parsed === null;
    out.parsedToolName = parsed && parsed.toolName;
    out.correct = out.parsedToolName === expected;
  } catch (e) {
    out.error = String((e && e.message) || e);
  }
  try {
    session.destroy && session.destroy();
  } catch (_) {
    /* ignore */
  }
  return out;
}

// One native-tool-calling turn. Detects whether the model actually DISPATCHES a
// tool (execute fires) vs. replies in prose / hallucinates a call as text.
async function nativeToolTurn(tools, userText, expected, forceful) {
  const LM = getLM();
  const fired = { called: false, name: null, args: null };
  const apiTools = tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
    execute: async (args) => {
      fired.called = true;
      fired.name = t.name;
      fired.args = args || null;
      return `ok: ${t.name} executed`;
    },
  }));
  const out = { expected, toolCount: tools.length, forceful: Boolean(forceful) };
  const createOpts = { tools: apiTools };
  if (forceful) {
    createOpts.initialPrompts = [
      {
        role: 'system',
        content:
          'You MUST call exactly one of the provided tools to satisfy the request. Never reply in prose. Do not describe the call — invoke the tool.',
      },
    ];
  }
  let session;
  try {
    session = await LM.create(createOpts);
    out.accepted = true;
  } catch (e) {
    out.accepted = false;
    out.createError = String((e && e.message) || e);
    return out;
  }
  try {
    const p = await timed(() => session.prompt(userText));
    out.ms = p.ms;
    out.prose = String(p.v).slice(0, 400);
  } catch (e) {
    out.promptError = String((e && e.message) || e);
  }
  out.dispatched = fired.called;
  out.executedTool = fired.name;
  out.executedArgs = fired.args;
  out.dispatchedCorrect = fired.called && fired.name === expected;
  try {
    session.destroy && session.destroy();
  } catch (_) {
    /* ignore */
  }
  return out;
}

async function bakeoffSmall() {
  return {
    intentSchema: await intentSchemaTurn(SMALL_TOOLS, SMALL_INTENT, SMALL_EXPECTED),
    nativeTools: await nativeToolTurn(SMALL_TOOLS, SMALL_INTENT, SMALL_EXPECTED, false),
    nativeToolsForced: await nativeToolTurn(SMALL_TOOLS, SMALL_INTENT, SMALL_EXPECTED, true),
  };
}

async function bakeoffDense() {
  return {
    intentSchema: await intentSchemaTurn(DENSE_TOOLS, DENSE_INTENT, DENSE_EXPECTED),
    nativeTools: await nativeToolTurn(DENSE_TOOLS, DENSE_INTENT, DENSE_EXPECTED, false),
  };
}

async function runAll(onStage) {
  const report = { ts: new Date().toISOString() };
  const stages = [
    ['env', env],
    ['createProbe', createProbe],
    ['structured', structured],
    ['bakeoffSmall', bakeoffSmall],
    ['bakeoffDense', bakeoffDense],
  ];
  for (const [key, fn] of stages) {
    if (onStage) onStage(key);
    try {
      report[key] = await fn();
    } catch (e) {
      report[key] = { fatal: String((e && e.message) || e) };
    }
    window.__spikeA2Result = report;
  }
  return report;
}

window.spikeA2 = { env, createProbe, structured, bakeoffSmall, bakeoffDense, runAll };

// --- UI (for the authoritative manual run inside the real side panel) ------
const outEl = document.getElementById('out');
const statusEl = document.getElementById('status');
document.getElementById('run').addEventListener('click', () => {
  statusEl.textContent = 'Running…';
  outEl.textContent = '';
  runAll((stage) => {
    statusEl.textContent = `Running… ${stage}`;
    outEl.textContent = JSON.stringify(window.__spikeA2Result || {}, null, 2);
  })
    .then((r) => {
      statusEl.textContent = 'Done. Copy the JSON below and paste it back.';
      outEl.textContent = JSON.stringify(r, null, 2);
    })
    .catch((e) => {
      statusEl.textContent = 'Battery threw: ' + String((e && e.message) || e);
    });
});
document.getElementById('copy').addEventListener('click', () => {
  navigator.clipboard.writeText(outEl.textContent || '').then(
    () => (statusEl.textContent = 'Copied.'),
    () => (statusEl.textContent = 'Copy failed — select the text manually.')
  );
});
