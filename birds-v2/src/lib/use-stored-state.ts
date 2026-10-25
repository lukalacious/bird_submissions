"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const EVENT = "stored-state";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // private mode / blocked storage
  }
}

/**
 * State mirrored to localStorage. The server render (and first client render)
 * always sees `initial`, so hydration never mismatches; the stored value
 * takes over right after.
 */
export function useStoredState<T>(key: string, initial: T): [T, (next: T | ((prev: T) => T)) => void] {
  const raw = useSyncExternalStore(subscribe, () => read(key), () => null);

  const value = useMemo<T>(() => {
    if (raw === null) return initial;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
    // initial is a constant default; re-parsing only when the stored text changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const current = (() => {
        const r = read(key);
        try {
          return r === null ? initial : (JSON.parse(r) as T);
        } catch {
          return initial;
        }
      })();
      const resolved = typeof next === "function" ? (next as (prev: T) => T)(current) : next;
      try {
        localStorage.setItem(key, JSON.stringify(resolved));
      } catch {}
      window.dispatchEvent(new Event(EVENT));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  );

  return [value, set];
}
