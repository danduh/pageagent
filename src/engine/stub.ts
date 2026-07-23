// Scope-A stub implementing EnginePort from fixtures. Async + abortable + scripted
// certainty-ladder turns, so the UI exercises the same shapes the real engine will
// deliver (partial/failed scan, decline, mid-flight Stop). Swapping this for the
// real engine later requires no change to any surface — they import EnginePort only.

import type { CapabilityState } from '../lib/capabilities';
import type { EnginePort, Turn } from './port';
import type { PageInfo, ScanResult, Tool } from './types';
import { DEFAULT_SCENARIO, OK_COVERAGE, PAGES, SCENARIOS, SPARSE_TOOLS } from '../fixtures';

export interface StubOptions {
  page?: PageInfo;
  tools?: Tool[];
  capability?: CapabilityState;
  /** Per-step delay for scripted turns / scan (ms). */
  stepMs?: number;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(id);
        resolve();
      },
      { once: true }
    );
  });
}

export function createStubEngine(opts: StubOptions = {}): EnginePort {
  const page = opts.page ?? PAGES.ci;
  const tools = opts.tools ?? SPARSE_TOOLS;
  const capability: CapabilityState = opts.capability ?? {
    languageModel: 'available',
    reason: 'On-device model ready',
  };
  const stepMs = opts.stepMs ?? 450;

  return {
    capability(): Promise<CapabilityState> {
      return Promise.resolve(capability);
    },
    page(): PageInfo {
      return page;
    },
    tools(): Tool[] {
      return tools;
    },
    async scan(signal?: AbortSignal): Promise<ScanResult> {
      await delay(stepMs * 1.5, signal);
      if (signal?.aborted) return { status: 'failed', reason: 'Scan stopped.' };
      // Coverage reflects the ACTUAL tool-set (honest for both the sparse + dense pages).
      const unlabeled = tools.filter((t) => t.unlabeled).length;
      return {
        status: 'ok',
        tools,
        coverage: {
          detected: tools.length,
          fromElements: tools.length + 3,
          unlabeled,
          uncovered: OK_COVERAGE.uncovered,
        },
      };
    },
    async *runIntent(text: string, signal: AbortSignal): AsyncIterable<Turn> {
      const scenario = SCENARIOS.find((s) => s.match(text.toLowerCase())) ?? DEFAULT_SCENARIO;
      let i = 0;
      for (const turn of scenario.turns) {
        await delay(stepMs, signal);
        if (signal.aborted) return;
        yield { ...turn, id: `${scenario.id}-${i}` };
        i += 1;
      }
    },
  };
}
