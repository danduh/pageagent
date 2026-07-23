# PageAgent — Capabilities Reference

**Purpose:** A plain-language reference to the Chrome built-in AI capabilities PageAgent depends on — what each one is, its honest current reality (availability, limits, gotchas), and which PageAgent need it serves. This is reference material, not a design; it describes WHAT exists and WHAT it is for, never HOW to wire it together. For product framing see `00-brief.md` and `01-product-definition.md`.

---

## How to read this document

Each capability below is described in three parts:

- **What it is** — one paragraph, in plain terms.
- **Current reality (mid-2026)** — availability, channel, and the specific limits and gotchas that matter. Written honestly; the hard parts are not softened.
- **What PageAgent needs it for** — the product need it maps to.

PageAgent's thesis (see `00-brief.md`) is that the agentic web can work on **any page today** by manufacturing tools from the DOM and driving them with an **on-device** agent. That thesis leans on four capabilities. Two are load-bearing for the MVP (WebMCP as the tool surface, the Prompt API as the agent brain). Two are flagged for later scope (Embeddings for tool retrieval, Web Speech for voice) but are documented here because the product story assumes they arrive.

A recurring theme: **these capabilities are early.** Origin trials, Canary/EPP channels, and unshipped sub-features are the norm, not the exception. This is precisely why PageAgent plans for a clearly-labeled **cloud fallback** (see `01-product-definition.md`) rather than assuming on-device availability everywhere.

---

## 1. WebMCP / `document.modelContext`

### What it is

WebMCP is a browser mechanism that lets a web page expose a set of **tools** — named, described, callable actions — to an AI agent, through a page-level surface (`document.modelContext` / `navigator.modelContext`). It is the web-native expression of the Model Context Protocol idea: instead of the agent guessing at a page, the page (or, in PageAgent's case, PageAgent acting on the page's behalf) advertises exactly what can be done and how. The agent reads the tool list and calls tools by name with arguments.

### Current reality (mid-2026)

- **Availability / channel:** early. It lives as an origin trial and a moving W3C draft — the shape of the API is still shifting, and almost no production websites expose `document.modelContext` today. This is the chicken-and-egg problem PageAgent exists to dissolve.
- **Gotcha — nobody has published tools yet.** Because sites don't ship tools, an agent that only consumes real `document.modelContext` tools has almost nothing to operate. PageAgent's answer is to **manufacture** tools from the page's DOM and register them through this same surface, so the tools exist even when the site's author never wrote any.
- **Fusion is the forward path.** When a site *does* expose real `document.modelContext` tools, those are higher-fidelity than anything scanned from the DOM and should be preferred; DOM-derived tools are the fallback. This "`.well-known/mcp` fusion" is later scope (see `01-product-definition.md`), but the capability is the same surface either way.
- **Draft-stage risk:** because the spec is moving, tool schema and registration details can change under PageAgent; it is not a stable, finished platform feature.

### What PageAgent needs it for

This is the **tool surface** — the registry through which PageAgent's DOM-derived tools become visible and callable by the agent. Every generated **Tool** (one packaged **Action**, per the glossary in `01-product-definition.md`) lives here. It backs the **Tools** and **Execute** surfaces and is what the **Agent / intent-loop** dispatches against.

---

## 2. Prompt API / `LanguageModel` (Gemini Nano)

### What it is

The Prompt API exposes Chrome's built-in on-device language model (Gemini Nano) to web code — a small general-purpose LLM that runs locally on the user's machine with no network round-trip. PageAgent uses it as the **agent brain**: the component that reads the user's typed (later, spoken) intent, looks at the available tools, and decides which tool to call with which arguments.

### Current reality (mid-2026)

- **Availability / channel:** the most mature of the four capabilities, but still gated behind model download and hardware requirements; not universally present.
- **Gotcha — native tool-calling is not usable.** The ergonomic path (the model calling tools directly) is **not shipped / effectively broken**. The only working pattern is a manual, **capped intent loop**: the model names one tool and its arguments, the extension runs that tool and feeds the result back, and it repeats for a bounded number of steps. This constraint — not a design preference — is why PageAgent commits to reliable single, confirmed actions rather than long autonomous chains.
- **Gotcha — it's a small model.** Nano is genuinely good at **intent → tool routing and classification** when the tools are few and well-labeled. It is **weak at deep multi-step planning**. This is why the MVP commits to **reliable single, confirmed actions** and treats long autonomous chains as later, lower-confidence scope (see the honest risks in `00-brief.md`).
- **Gotcha — quality ceiling under tool overload.** Routing accuracy degrades when the tool list is large or the tools are similar to one another — exactly the situation a busy page produces. This is the pressure that motivates embeddings-based tool retrieval (capability 3).

### What PageAgent needs it for

The **on-device agent brain** behind the **Chat** surface and the **Agent / intent-loop**: understand intent → pick tool(s) → execute → observe → continue, capped and re-checking the page between steps. Being on-device is the product unlock, not a nicety — it lets PageAgent operate the user's **authenticated sessions** privately, for free, and instantly (see `00-brief.md`).

---

## 3. Embeddings / `SemanticEmbedder`

### What it is

An embeddings capability turns text into vectors whose closeness reflects meaning, enabling **semantic search**: given the user's request, find the tools whose descriptions are most relevant, regardless of exact wording. Chrome's built-in embedder (based on an on-device embedding model) is the local, private way to compute these vectors. In PageAgent's story it powers **tool retrieval**.

### Current reality (mid-2026)

- **Availability / channel:** earliest-stage of the set — EPP / Canary today. Not something the MVP can assume is present.
- **Gotcha — it solves a real, specific problem, not a vague one.** A busy page can yield 50–100+ generated tools. Feeding all of them to Nano blows up the context and, worse, degrades selection accuracy (capability 2's quality ceiling). The embeddings answer is to embed the tool list once, semantically search the user's request against it, and feed the model only the **top-k relevant tools**. This is targeted at the tool-overload failure mode specifically.
- **Scope note:** embeddings-based tool retrieval is **later** scope in the MVP boundary (`01-product-definition.md`), documented here because it is the intended fix for a problem the MVP will feel.

### What PageAgent needs it for

**Tool retrieval / relevance filtering** — narrowing a large generated tool-set down to the handful the agent brain should actually consider for a given request. It is the pressure valve on capability 2's quality ceiling and the enabler for pages that generate many tools.

---

## 4. Web Speech API (STT + TTS)

### What it is

The Web Speech API is two separate features. **Speech-to-text (STT / recognition)** turns the user's spoken words into text — voice **in**. **Text-to-speech (TTS / `SpeechSynthesis`)** turns text into spoken audio — voice **out**. Together they are what makes a hands-free, spoken conversation with PageAgent possible, which is the accessibility flagship of the product (see `00-brief.md`).

### Current reality (mid-2026)

- **STT is cloud-backed.** In Chrome today, speech recognition sends the captured **audio to Google** for transcription. This is the important honesty caveat: voice **input** is not on-device, which sits in tension with PageAgent's on-device privacy thesis. Voice is real, but this trade-off must be stated plainly to the user rather than hidden.
- **TTS uses OS voices.** `SpeechSynthesis` reads text aloud using the operating system's installed voices — **mostly local**, but **quality varies** widely by platform and installed voice, and it is not an AI-generated voice.
- **There is no on-device AI text-to-speech.** Chrome does not offer a built-in, on-device *AI* TTS. So "natural, generated" spoken output is not available locally; TTS quality is whatever the OS provides.
- **Net:** voice is genuinely usable, but with two honest asterisks — input leaves the device, and output is OS-voice quality, not AI-synthesized.

### What PageAgent needs it for

The **voice** modality of the **Chat** surface — the **accessibility flagship** (operate any website by voice, transformative for motor- and vision-impaired users). Voice is **later** scope in the MVP boundary (`01-product-definition.md`); it is documented here so the caveats (cloud STT, OS-voice TTS) are on the record before it is built.

---

## Capability-to-need summary

| Capability | Current reality (short) | PageAgent need it maps to | MVP or Later |
|---|---|---|---|
| WebMCP / `document.modelContext` | Origin trial + moving draft; almost no sites expose tools | The **tool surface** — where DOM-derived tools are registered and called (Tools, Execute) | MVP |
| Prompt API / `LanguageModel` (Nano) | On-device; native tool-calling unusable → manual capped intent loop; weak at long planning | The **agent brain** behind Chat and the intent-loop | MVP |
| Embeddings / `SemanticEmbedder` | EPP/Canary | **Top-k tool retrieval** — tame large tool-sets, protect routing accuracy | Later |
| Web Speech (STT + TTS) | STT cloud-backed (audio → Google); TTS = OS voices; no on-device AI TTS | **Voice** modality of Chat — accessibility flagship | Later |

---

## Cross-references

- `00-brief.md` — product thesis, why on-device is the unlock, the honest risks.
- `01-product-definition.md` — surfaces, glossary, and the MVP vs Later boundary these capabilities are mapped against.
