// PageAgent service worker (MV3, module). Opens + focuses the side panel from the
// toolbar action and the global summon shortcut. The MV3 user-gesture caveat for
// sidePanel.open() is handled by caching the focused window id (see Phase 0 notes).

let lastFocusedWindowId: number | null = null;

function seedWindowId(): void {
  chrome.windows
    .getLastFocused()
    .then((win) => {
      if (typeof win?.id === 'number') lastFocusedWindowId = win.id;
    })
    .catch(() => {});
}

seedWindowId();

chrome.runtime.onInstalled.addListener(() => {
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

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'toggle_panel') return;
  if (lastFocusedWindowId != null) {
    chrome.sidePanel
      .open({ windowId: lastFocusedWindowId })
      .catch((e) => console.error('[PageAgent] sidePanel.open (cached) failed', e));
    return;
  }
  chrome.windows
    .getLastFocused()
    .then((win) => chrome.sidePanel.open({ windowId: win.id as number }))
    .catch((e) => console.error('[PageAgent] sidePanel.open (fallback) failed', e));
});
