"use client";

import { useSyncExternalStore } from "react";

// Lightweight SSR-safe localStorage subscription (replaces the wagmi/useSyncExternalStore
// helper used by the reference app, without pulling in extra deps). Tracks a value in
// localStorage and notifies across tabs via the storage event.
function subscribeFor(key: string, cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

function getSnapshot(key: string, fallback: string) {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function useLocalStorageValue(key: string, fallback = "") {
  return useSyncExternalStore(
    (cb) => subscribeFor(key, cb),
    () => getSnapshot(key, fallback),
    () => fallback,
  );
}
