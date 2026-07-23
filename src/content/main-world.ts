// MAIN-world script — the surface where WebMCP `document.modelContext` tools are
// read and (later) registered. Phase 1 only proves MAIN-world reach and reports
// whether the page exposes modelContext (Spike B found it present on Chrome 152).
console.debug(
  '[PageAgent] MAIN-world script loaded; document.modelContext present:',
  'modelContext' in document
);

export {};
