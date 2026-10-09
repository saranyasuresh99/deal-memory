"use client";

// User actions live in the browser (localStorage key "dealmemory:v1"), layered on top of the base JSON data.
import { useSyncExternalStore } from "react";

const KEY = "dealmemory:v1";

export type RadarAction = {
  status: "done" | "snoozed" | "dismissed";
  until?: string; // snooze date (YYYY-MM-DD)
  reason?: string; // dismiss reason
  at: string; // demo "today"
};

export type Store = {
  radar: Record<string, RadarAction>;
};

const EMPTY: Store = { radar: {} };

let cache: Store | null = null;
const listeners = new Set<() => void>();

function load(): Store {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache!;
}

export function updateStore(fn: (s: Store) => Store): void {
  cache = fn(load());
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // storage full or blocked — keep the in-memory copy
  }
  listeners.forEach((l) => l());
}

export function clearStore(): void {
  cache = EMPTY;
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export function useStore(): Store {
  return useSyncExternalStore(subscribe, load, () => EMPTY);
}
