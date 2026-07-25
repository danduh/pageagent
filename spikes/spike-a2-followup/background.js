// Open the side panel when the toolbar icon is clicked.
'use strict';

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((e) => console.error('[spike-a2] setPanelBehavior failed', e));
});
