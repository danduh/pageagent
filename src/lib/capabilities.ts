// Capability preflight (Plan Step 1.5), informed by Spike A (spikes/FINDINGS.md):
// - DETECT is passive: it only calls availability() and NEVER create(), so it can
//   never trigger a model download or throw the "requires a user gesture" error.
// - PROVISION triggers the download and must be called SYNCHRONOUSLY inside a user
//   gesture with no preceding `await` (an await can consume the activation).

export type Availability = 'available' | 'downloadable' | 'downloading' | 'unavailable';

export interface CapabilityState {
  languageModel: Availability;
  /** Human-readable, honest explanation of the current state. */
  reason: string;
}

interface LanguageModelLike {
  availability?: () => Promise<string>;
  capabilities?: () => Promise<{ available?: string }>;
  create?: (opts?: unknown) => Promise<unknown>;
}

function getLanguageModel(): LanguageModelLike | null {
  const g = self as unknown as {
    LanguageModel?: LanguageModelLike;
    ai?: { languageModel?: LanguageModelLike };
  };
  return g.LanguageModel ?? g.ai?.languageModel ?? null;
}

function normalize(raw: string | undefined): Availability {
  switch (raw) {
    case 'available':
    case 'readily':
      return 'available';
    case 'downloadable':
    case 'after-download':
      return 'downloadable';
    case 'downloading':
      return 'downloading';
    default:
      return 'unavailable';
  }
}

const REASONS: Record<Availability, string> = {
  available: 'On-device model ready',
  downloadable: 'On-device model available to download',
  downloading: 'On-device model downloading…',
  unavailable: 'On-device model unavailable',
};

/** Passive probe. Safe to call on load; never downloads, never needs a gesture. */
export async function detectLanguageModel(): Promise<CapabilityState> {
  const lm = getLanguageModel();
  if (!lm)
    return { languageModel: 'unavailable', reason: 'Prompt API not present in this browser' };
  try {
    const raw = lm.availability ? await lm.availability() : (await lm.capabilities?.())?.available;
    const languageModel = normalize(raw);
    const reason =
      languageModel === 'unavailable' && raw
        ? `Prompt API present but unavailable (${raw})`
        : REASONS[languageModel];
    return { languageModel, reason };
  } catch (e) {
    return {
      languageModel: 'unavailable',
      reason: `availability() failed: ${(e as Error).message}`,
    };
  }
}

/**
 * Kicks off the model download / session creation. MUST be called from within a
 * user-gesture handler with NO preceding await. Returns the created session.
 */
export function provisionLanguageModel(onProgress?: (loaded: number) => void): Promise<unknown> {
  const lm = getLanguageModel();
  if (!lm?.create) return Promise.reject(new Error('Prompt API not available'));
  return lm.create({
    monitor(m: { addEventListener?: (type: string, cb: (e: { loaded: number }) => void) => void }) {
      m.addEventListener?.('downloadprogress', (e) => onProgress?.(e.loaded));
    },
  });
}
