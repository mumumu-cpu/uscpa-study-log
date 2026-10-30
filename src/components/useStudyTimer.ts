"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { localDate } from "@/lib/date";
import type { Mode } from "@/lib/types";

const KEY = "uscpa-timer-v1";

type Persisted = { mode: Mode; segmentStart: number | null; sessionBase: number };

export type Segment = { date: string; mode: Mode; seconds: number };

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Persisted;
  } catch {}
  return { mode: "input", segmentStart: null, sessionBase: 0 };
}

/**
 * Wall-clock timer split into segments. Every stop or Input/Output switch closes the
 * running segment and hands it to `onSegment` so it can be written to D1 per mode.
 */
export function useStudyTimer(onSegment: (seg: Segment) => void) {
  const [state, setState] = useState<Persisted>({ mode: "input", segmentStart: null, sessionBase: 0 });
  const [now, setNow] = useState(() => Date.now());
  const onSegmentRef = useRef(onSegment);
  onSegmentRef.current = onSegment;
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => setState(load()), []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const running = state.segmentStart !== null;

  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [running]);

  /** Closes the running segment (if any) and returns its length in whole seconds. */
  const closeSegment = useCallback((at: number) => {
    const s = stateRef.current;
    if (s.segmentStart === null) return 0;
    const seconds = Math.floor((at - s.segmentStart) / 1000);
    if (seconds >= 1) onSegmentRef.current({ date: localDate(new Date(at)), mode: s.mode, seconds });
    return Math.max(0, seconds);
  }, []);

  const start = useCallback(() => {
    setState((s) => (s.segmentStart === null ? { ...s, segmentStart: Date.now() } : s));
  }, []);

  const stop = useCallback(() => {
    const at = Date.now();
    const seconds = closeSegment(at);
    setState((s) => ({ ...s, segmentStart: null, sessionBase: s.sessionBase + seconds }));
  }, [closeSegment]);

  const toggle = useCallback(() => (stateRef.current.segmentStart === null ? start() : stop()), [start, stop]);

  const reset = useCallback(() => setState((s) => (s.segmentStart === null ? { ...s, sessionBase: 0 } : s)), []);

  const setMode = useCallback(
    (mode: Mode) => {
      if (mode === stateRef.current.mode) return;
      const at = Date.now();
      const seconds = closeSegment(at);
      setState((s) => ({
        mode,
        sessionBase: s.sessionBase + seconds,
        segmentStart: s.segmentStart === null ? null : at - ((at - s.segmentStart) % 1000),
      }));
    },
    [closeSegment],
  );

  // Hand the open segment to the server when the tab goes away, then keep counting from now.
  useEffect(() => {
    const flush = () => {
      const s = stateRef.current;
      if (s.segmentStart === null) return;
      const at = Date.now();
      const seconds = Math.floor((at - s.segmentStart) / 1000);
      if (seconds < 1) return;
      const body = JSON.stringify({ date: localDate(new Date(at)), mode: s.mode, seconds });
      navigator.sendBeacon?.("/api/sessions", new Blob([body], { type: "application/json" }));
      const next = { ...s, segmentStart: at, sessionBase: s.sessionBase + seconds };
      stateRef.current = next;
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      setState(next);
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  const segmentSeconds = running ? Math.max(0, Math.floor((now - state.segmentStart!) / 1000)) : 0;

  return {
    mode: state.mode,
    running,
    elapsed: state.sessionBase + segmentSeconds,
    segmentSeconds,
    start,
    stop,
    toggle,
    reset,
    setMode,
  };
}
