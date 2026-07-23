// Spike A probe — does the Prompt API (Gemini Nano) work FROM THIS side-panel
// document? Reports typeof, availability(), and whether create() succeeds.
'use strict';

const out = document.getElementById('out');
const log = (msg) => {
  out.textContent += (out.textContent ? '\n' : '') + msg;
  // eslint-disable-next-line no-console
  console.log('[spike-a]', msg);
};

async function probe() {
  out.textContent = '';
  log('context: MV3 side-panel document (' + location.href + ')');

  // The API surfaced as a global `LanguageModel` in recent Chrome; older builds
  // exposed it under `self.ai.languageModel`. Check both, honestly.
  const LM = self.LanguageModel || (self.ai && self.ai.languageModel) || null;
  log('typeof LanguageModel (global): ' + typeof self.LanguageModel);
  log('self.ai?.languageModel present: ' + Boolean(self.ai && self.ai.languageModel));

  if (!LM) {
    log('RESULT: unavailable — no Prompt API surface in this document.');
    log('If unavailable here but present elsewhere, the brain must move to an ' +
        'offscreen document or content script (record in FINDINGS.md).');
    return;
  }

  try {
    const availability = await (LM.availability ? LM.availability() : LM.capabilities());
    log('availability(): ' + JSON.stringify(availability));
  } catch (e) {
    log('availability() threw: ' + (e && e.message));
  }

  try {
    log('attempting create()… (may trigger a model download)');
    const session = await LM.create({});
    log('RESULT: create() SUCCEEDED in the side-panel document ✓');
    try { session.destroy && session.destroy(); } catch (_) {}
  } catch (e) {
    log('RESULT: create() FAILED in the side-panel document ✗ — ' + (e && e.message));
  }
}

document.getElementById('run').addEventListener('click', probe);
probe();
