// Spike B probe (MAIN world). Only activates on the fixture (#spikeb-fixture).
// Captures fingerprints of a target element, then after an SPA re-render tries
// several re-resolution strategies and reports which ones hit the intended node.
'use strict';

(function () {
  if (!document.getElementById('spikeb-fixture')) return;

  const TARGET_TEXT = 'Rerun failed jobs';
  let captured = null;

  // --- helpers ------------------------------------------------------------
  const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
  function accName(el) {
    return norm(el.getAttribute('aria-label') || el.textContent);
  }
  function cssPath(el) {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node.id !== 'spikeb-fixture') {
      let sel = node.nodeName.toLowerCase();
      if (node.id) { sel += '#' + node.id; parts.unshift(sel); break; }
      const parent = node.parentNode;
      if (parent) {
        const sibs = Array.prototype.filter.call(parent.children, (c) => c.nodeName === node.nodeName);
        if (sibs.length > 1) sel += ':nth-of-type(' + (sibs.indexOf(node) + 1) + ')';
      }
      parts.unshift(sel);
      node = node.parentNode;
    }
    return parts.join(' > ');
  }
  function allButtons() {
    return Array.prototype.slice.call(document.querySelectorAll('#spikeb-fixture button'));
  }
  function findTarget() {
    return allButtons().find((b) => accName(b) === TARGET_TEXT) || null;
  }

  function capture() {
    const el = findTarget();
    if (!el) { report('capture failed — target not found'); return; }
    captured = {
      ref: (typeof WeakRef !== 'undefined') ? new WeakRef(el) : null,
      id: el.id || null,
      cssPath: cssPath(el),
      text: accName(el),
      index: allButtons().indexOf(el),
    };
    report('captured: ' + JSON.stringify({ id: captured.id, cssPath: captured.cssPath, text: captured.text, index: captured.index }, null, 0));
  }

  function isIntended(el) {
    return !!el && el.isConnected && accName(el) === TARGET_TEXT;
  }

  function reresolve() {
    if (!captured) { report('re-resolve: nothing captured yet'); return; }
    const results = {};
    // 1) live object reference
    const live = captured.ref && captured.ref.deref ? captured.ref.deref() : null;
    results.weakref = live ? (live.isConnected ? 'HIT (still connected)' : 'STALE (detached)') : 'GONE (gc/replaced)';
    // 2) id selector
    const byId = captured.id ? document.querySelector('#spikeb-fixture #' + CSS.escape(captured.id)) : null;
    results.id = captured.id ? (isIntended(byId) ? 'HIT' : (byId ? 'WRONG NODE' : 'MISS')) : 'n/a (no id)';
    // 3) css path
    let byPath = null; try { byPath = document.querySelector(captured.cssPath); } catch (_) {}
    results.cssPath = isIntended(byPath) ? 'HIT' : (byPath ? 'WRONG NODE' : 'MISS');
    // 4) accessible-name / text match
    const byText = allButtons().find((b) => accName(b) === captured.text) || null;
    results.text = isIntended(byText) ? 'HIT' : 'MISS';
    // 5) DOM index
    const byIndex = allButtons()[captured.index] || null;
    results.index = isIntended(byIndex) ? 'HIT' : (byIndex ? 'WRONG NODE' : 'MISS');
    report('re-resolve results:\n' + JSON.stringify(results, null, 2));
  }

  // --- MAIN-world capability read ----------------------------------------
  const hasModelContext = typeof document !== 'undefined' && 'modelContext' in document;

  // --- injected control panel --------------------------------------------
  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;top:12px;right:12px;z-index:2147483647;background:#12211e;color:#e7f0ed;border:1px solid #26403a;border-radius:10px;padding:10px;font:12px/1.4 system-ui,sans-serif;width:300px;';
  panel.innerHTML =
    '<b>Spike B</b> — content script (MAIN world)<br>' +
    'document.modelContext present: <b>' + hasModelContext + '</b>' +
    '<div style="display:flex;gap:6px;margin:8px 0;">' +
    '<button id="sb-cap">Capture handle</button>' +
    '<button id="sb-res">Re-resolve</button></div>' +
    '<pre id="sb-out" style="white-space:pre-wrap;background:#0b1614;border:1px solid #26403a;border-radius:6px;padding:6px;max-height:220px;overflow:auto;">ready.</pre>';
  document.body.appendChild(panel);
  const outEl = panel.querySelector('#sb-out');
  function report(msg) {
    outEl.textContent += '\n' + msg;
    outEl.scrollTop = outEl.scrollHeight;
    // eslint-disable-next-line no-console
    console.log('[spike-b]', msg);
  }
  panel.querySelector('#sb-cap').addEventListener('click', capture);
  panel.querySelector('#sb-res').addEventListener('click', reresolve);
  window.addEventListener('spikeb:rerendered', (e) => report('page re-rendered (render #' + (e.detail && e.detail.renderCount) + ') — now click Re-resolve'));
  report('document.modelContext present: ' + hasModelContext);
})();
