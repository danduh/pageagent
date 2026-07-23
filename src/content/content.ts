// Isolated-world content script. In later phases this hosts the panel↔page bridge
// (Step 7.2). For Phase 1 it only proves the entry point loads and can talk to the
// MAIN-world island.
console.debug('[PageAgent] content script (isolated) loaded on', location.href);

export {};
