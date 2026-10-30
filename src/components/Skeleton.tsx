"use client";

import { motion } from "framer-motion";

const Bar = ({ className }: { className: string }) => <div className={`shimmer rounded-2xl ${className}`} />;

/** Full-screen shimmer shown on boot, data fetch and AI generation. */
export default function FullScreenSkeleton({ label }: { label: string }) {
  return (
    <motion.div
      key="skeleton"
      data-testid="fullscreen-skeleton"
      role="status"
      aria-label={label}
      className="fixed inset-0 z-50 flex flex-col gap-4 overflow-hidden bg-white/40 px-4 pt-[max(env(safe-area-inset-top),1.25rem)] backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
    >
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <div className="flex items-center justify-between">
          <Bar className="h-6 w-28" />
          <Bar className="h-9 w-9 rounded-full" />
        </div>
        <div className="glass rounded-[2rem] p-6">
          <Bar className="mx-auto h-20 w-4/5" />
          <Bar className="mx-auto mt-5 h-12 w-3/5 rounded-full" />
        </div>
        <Bar className="h-14 w-full rounded-full" />
        <div className="glass rounded-[2rem] p-5">
          <Bar className="h-4 w-1/3" />
          <div className="mt-5 flex h-40 items-end gap-3">
            {[40, 70, 55, 90, 30, 65, 80].map((h, i) => (
              <div key={i} className="shimmer flex-1 rounded-xl" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Bar className="h-24" />
          <Bar className="h-24" />
        </div>
      </div>
    </motion.div>
  );
}
