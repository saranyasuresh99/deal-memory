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

export type FieldValue = string | number | null;

// A lead created from a debrief (not in the base CRM). id looks like "NEW-1".
export type NewLead = { lead_id: string; fields: Record<string, FieldValue> };

export type ApprovedPromise = {
  id: string;
  lead_id: string | null;
  account: string;
  owner: string | null;
  what: string;
  due_date: string | null;
  date_clear: boolean;
  quote: string;
  source: "debrief";
  status: "open" | "done";
  approved_on: string;
};

export type AuditEntry = {
  who: string;
  when: string;
  lead_id: string;
  account: string;
  field: string;
  before: FieldValue;
  after: FieldValue;
  quote: string;
  edited: boolean; // true if the person changed the AI's proposed value before approving
};

export type Store = {
  radar: Record<string, RadarAction>;
  accountEdits: Record<string, Record<string, FieldValue>>; // lead_id -> field -> approved value
  newLeads: NewLead[];
  promises: ApprovedPromise[];
  audit: AuditEntry[];
};

const EMPTY: Store = { radar: {}, accountEdits: {}, newLeads: [], promises: [], audit: [] };

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
