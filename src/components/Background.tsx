"use client";

import { motion } from "framer-motion";

const blobs = [
  { color: "#c9d4ff", size: 420, x: ["-10%", "15%", "-5%"], y: ["-8%", "10%", "-8%"], left: "-15%", top: "-10%" },
  { color: "#ffd6e7", size: 380, x: ["10%", "-12%", "10%"], y: ["0%", "14%", "0%"], left: "45%", top: "20%" },
  { color: "#d4f5ec", size: 360, x: ["-6%", "10%", "-6%"], y: ["10%", "-6%", "10%"], left: "-10%", top: "55%" },
  { color: "#fff1cc", size: 300, x: ["8%", "-8%", "8%"], y: ["-4%", "8%", "-4%"], left: "55%", top: "70%" },
];

/** Slow-moving pastel fluid gradient behind every screen. */
export default function Background() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-br from-white via-[#f6f7ff] to-[#fdf6fa]">
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full opacity-70 blur-3xl"
          style={{ width: b.size, height: b.size, left: b.left, top: b.top, background: b.color }}
          animate={{ x: b.x, y: b.y, scale: [1, 1.12, 1] }}
          transition={{ duration: 18 + i * 4, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
