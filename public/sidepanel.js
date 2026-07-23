// PageAgent — Phase 0 static shell behavior (plain JS, no build).
// Scope: prove the panel is live, focuses its input (home base), shows the
// active page's origin when available, and demonstrates the Send↔Stop
// distinction. No engine, no scan, no execution yet.
'use strict';

(function () {
  const $ = (id) => document.getElementById(id);
  const input = $('composer-input');
  const log = $('pa-log');
  const status = $('pa-status');
  const form = $('pa-composer');
  const stopBtn = $('pa-stop');
  const originEl = $('pa-origin');

  // Home base: focus the Chat input on open (REQ-A11Y-1).
  if (input) input.focus();

  // Best-effort page identity. activeTab grants access when the panel is
  // invoked from the action; otherwise we keep the honest placeholder.
  try {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (!tab || !tab.url) return;
      try {
        originEl.textContent = new URL(tab.url).host || tab.title || originEl.textContent;
      } catch (_) {
        /* chrome:// and similar have no host — leave the placeholder */
      }
    });
  } catch (_) {
    /* chrome.tabs unavailable — leave the placeholder */
  }

  function append(text) {
    const li = document.createElement('li');
    li.textContent = text;
    log.appendChild(li);
    log.scrollTop = log.scrollHeight;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    append('You: ' + text);
    input.value = '';
    // Demonstrate the acting/Stop state briefly (no real work in Phase 0).
    stopBtn.hidden = false;
    status.textContent = 'Working… (Phase 0 placeholder)';
    window.setTimeout(() => {
      stopBtn.hidden = true;
      status.textContent = '';
      append(
        'PageAgent: I heard you, but I have no engine yet — this is the Phase 0 shell.'
      );
      input.focus();
    }, 500);
  });

  stopBtn.addEventListener('click', () => {
    stopBtn.hidden = true;
    status.textContent = 'Stopped.';
    input.focus();
  });

  // Escape clears the input / stops — interruptibility is keyboard-first.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!stopBtn.hidden) {
      stopBtn.click();
    } else if (input.value) {
      input.value = '';
      status.textContent = 'Cleared.';
    }
  });
})();
