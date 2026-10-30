"use client";

import { motion } from "framer-motion";
import { BookOpen, PenLine } from "lucide-react";
import type { Mode } from "@/lib/types";

const OPTIONS: { mode: Mode; label: string; Icon: typeof BookOpen; color: string }[] = [
  { mode: "input", label: "Input", Icon: BookOpen, color: "#7c8cff" },
  { mode: "output", label: "Output", Icon: PenLine, color: "#ff8fb8" },
];

export default function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div role="radiogroup" aria-label="計測モード" data-testid="mode-toggle" data-mode={mode} className="glass relative grid grid-cols-2 rounded-full p-1.5">
      {OPTIONS.map(({ mode: m, label, Icon, color }) => {
        const active = m === mode;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={active}
            data-testid={`mode-${m}`}
            onClick={() => onChange(m)}
            className="relative z-0 flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold"
          >
            {active && (
              <motion.span
                layoutId="mode-pill"
                className="absolute inset-0 -z-10 rounded-full shadow-md"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
            <motion.span
              className="flex items-center gap-2"
              animate={{ color: active ? "#ffffff" : "#1f244099" }}
              transition={{ duration: 0.2 }}
            >
              <Icon size={16} />
              {label}
            </motion.span>
          </button>
        );
      })}
    </div>
  );
}
