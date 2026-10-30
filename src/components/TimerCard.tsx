"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, RotateCcw } from "lucide-react";
import { formatClock } from "@/lib/date";
import type { Mode } from "@/lib/types";

type Props = {
  elapsed: number;
  running: boolean;
  mode: Mode;
  todayInput: number;
  todayOutput: number;
  onToggle: () => void;
  onReset: () => void;
};

const MODE_COLOR: Record<Mode, string> = { input: "#7c8cff", output: "#ff8fb8" };

export default function TimerCard({ elapsed, running, mode, todayInput, todayOutput, onToggle, onReset }: Props) {
  const color = MODE_COLOR[mode];
  return (
    <section className="glass glass-sheen relative rounded-[2rem] px-5 pt-6 pb-5">
      <motion.button
        type="button"
        data-testid="timer-toggle"
        data-state={running ? "running" : "paused"}
        aria-label={running ? "一時停止" : "計測開始"}
        onClick={onToggle}
        whileTap={{ scale: 0.97 }}
        className="relative mx-auto block w-full select-none outline-none"
      >
        {/* Heartbeat halo: one beat per second while running. */}
        <AnimatePresence>
          {running && (
            <motion.span
              key={`beat-${elapsed}`}
              aria-hidden
              className="pointer-events-none absolute inset-x-6 inset-y-0 rounded-[2rem]"
              style={{ boxShadow: `0 0 0 2px ${color}55, 0 0 40px 6px ${color}40` }}
              initial={{ opacity: 0.9, scale: 0.94 }}
              animate={{ opacity: 0, scale: 1.08 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.95, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>
        <motion.div
          data-testid="timer-display"
          className="relative text-center font-semibold tabular-nums tracking-tight"
          style={{ fontSize: "clamp(3.2rem, 17vw, 5.5rem)", lineHeight: 1.05 }}
          animate={running ? { scale: [1, 1.025, 1], color: "#1f2440" } : { scale: 1, color: "#1f244099" }}
          transition={running ? { duration: 1, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
        >
          {formatClock(elapsed)}
        </motion.div>
        <motion.div
          className="mx-auto mt-4 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg"
          animate={{ backgroundColor: color, scale: running ? 1 : [1, 1.08, 1] }}
          transition={running ? { duration: 0.3 } : { duration: 1.6, repeat: Infinity }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={running ? "pause" : "play"}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {running ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-0.5" />}
            </motion.span>
          </AnimatePresence>
        </motion.div>
      </motion.button>

      <div className="mt-4 flex items-center justify-between text-xs text-ink/60">
        <div className="flex gap-3 tabular-nums">
          <span data-testid="today-input">
            <i className="mr-1 inline-block h-2 w-2 rounded-full bg-input" />
            {formatClock(todayInput)}
          </span>
          <span data-testid="today-output">
            <i className="mr-1 inline-block h-2 w-2 rounded-full bg-output" />
            {formatClock(todayOutput)}
          </span>
        </div>
        <motion.button
          type="button"
          aria-label="リセット"
          onClick={onReset}
          disabled={running || elapsed === 0}
          whileTap={{ rotate: -180 }}
          className="grid h-8 w-8 place-items-center rounded-full bg-white/60 disabled:opacity-30"
        >
          <RotateCcw size={14} />
        </motion.button>
      </div>
    </section>
  );
}
