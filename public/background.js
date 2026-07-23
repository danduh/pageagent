// PageAgent — Phase 0 service worker (static, no build).
// Responsibilities in this phase: open+focus the side panel from the toolbar
// action AND a global summon shortcut. Everything else (scan, engine, safety)
// arrives in later phases.
//
// HONEST MV3 CAVEAT (revisit in Phase 1): chrome.sidePanel.open() must be called
// inside a user gesture. commands.onCommand IS a gesture, but an awaited async hop
// can consume it. We therefore cache the focused window id so open() can be called
// synchronously. On a cold service-worker start the cache may be empty for the very
// first keypress; we seed it on startup and fall back to an async lookup.

let lastFocusedWindowId = null;

function seedWindowId() {
  chrome.windows
    .getLastFocused()
    .then((win) => {
      if (win && typeof win.id === 'number') lastFocusedWindowId = win.id;
    })
    .catch(() => {});
}

seedWindowId();

chrome.runtime.onInstalled.addListener(() => {
  // Clicking the toolbar action opens the side panel (no popup).
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((e) => console.error('[PageAgent] setPanelBehavior failed', e));
  seedWindowId();
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) lastFocusedWindowId = windowId;
});

chrome.tabs.onActivated.addListener((info) => {
  lastFocusedWindowId = info.windowId;
});

// Global summon shortcut (default Cmd/Ctrl+Shift+Y — owner decision D5).
chrome.commands.onCommand.addListener((command) => {
  if (command !== 'toggle_panel') return;
  if (lastFocusedWindowId != null) {
    // Synchronous call — keeps the user gesture intact.
    chrome.sidePanel.open({ windowId: lastFocusedWindowId }).catch((e) => {
      console.error('[PageAgent] sidePanel.open (cached) failed', e);
    });
    return;
  }
  // Cold-start fallback: no cached window yet.
  chrome.windows
    .getLastFocused()
    .then((win) => chrome.sidePanel.open({ windowId: win.id }))
    .catch((e) => console.error('[PageAgent] sidePanel.open (fallback) failed', e));
});
