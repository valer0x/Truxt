import { vi } from "vitest";

// matchMedia polyfill for theme store
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

// BroadcastChannel polyfill for networkEvents
class FakeBroadcastChannel {
  static channels = new Map<string, Set<FakeBroadcastChannel>>();
  name: string;
  listeners = new Set<(ev: MessageEvent) => void>();

  constructor(name: string) {
    this.name = name;
    if (!FakeBroadcastChannel.channels.has(name)) {
      FakeBroadcastChannel.channels.set(name, new Set());
    }
    FakeBroadcastChannel.channels.get(name)!.add(this);
  }

  postMessage(data: unknown) {
    for (const ch of FakeBroadcastChannel.channels.get(this.name)!) {
      if (ch === this) continue;
      for (const cb of ch.listeners) {
        cb({ data } as MessageEvent);
      }
    }
  }

  addEventListener(_type: string, cb: (ev: MessageEvent) => void) {
    this.listeners.add(cb);
  }

  removeEventListener(_type: string, cb: (ev: MessageEvent) => void) {
    this.listeners.delete(cb);
  }

  close() {
    FakeBroadcastChannel.channels.get(this.name)?.delete(this);
  }
}

if (typeof globalThis.BroadcastChannel === "undefined") {
  (globalThis as any).BroadcastChannel = FakeBroadcastChannel;
}
