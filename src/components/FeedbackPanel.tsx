"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { Feedback } from "@/lib/types";

export default function FeedbackPanel({ feedback, onGenerate, busy }: { feedback: Feedback; onGenerate: () => void; busy: boolean }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="glass glass-sheen rounded-[2rem] p-5" data-testid="feedback-card">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-ink/60">
          <Sparkles size={14} className="text-input" />
          AI Feedback
          {feedback && (
            <span className="ml-auto font-normal text-ink/40">{new Date(feedback.createdAt.replace(" ", "T") + (feedback.createdAt.includes("Z") ? "" : "Z")).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          )}
        </div>
        <AnimatePresence mode="wait">
          {feedback ? (
            <motion.ol key={feedback.createdAt} className="flex flex-col gap-2.5" initial="hidden" animate="show" exit={{ opacity: 0 }} variants={{ show: { transition: { staggerChildren: 0.12 } } }}>
              {feedback.lines.map((line, i) => (
                <motion.li
                  key={i}
                  data-testid="feedback-line"
                  variants={{ hidden: { opacity: 0, y: 10, filter: "blur(4px)" }, show: { opacity: 1, y: 0, filter: "blur(0px)" } }}
                  className={`flex gap-3 rounded-2xl bg-white/60 px-3.5 py-3 text-sm leading-relaxed ${i === 0 ? "font-semibold" : ""}`}
                >
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gradient-to-br from-input to-output text-[10px] font-bold text-white">{i + 1}</span>
                  {line}
                </motion.li>
              ))}
            </motion.ol>
          ) : (
            <motion.div key="empty" className="py-6 text-center text-xs text-ink/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              —
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <motion.button
        type="button"
        data-testid="feedback-generate"
        disabled={busy}
        onClick={onGenerate}
        whileTap={{ scale: 0.97 }}
        className="flex h-14 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-input to-output font-semibold text-white shadow-xl disabled:opacity-60"
      >
        <Sparkles size={18} />
        今週のフィードバックを生成
      </motion.button>
    </section>
  );
}
