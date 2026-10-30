"use client";

import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip, type Plugin } from "chart.js";
import { motion } from "framer-motion";
import { Bar } from "react-chartjs-2";
import { formatHours } from "@/lib/date";
import { OUTPUT_RATIO_GOAL, WEEKLY_GOAL_MAX_H, WEEKLY_GOAL_MIN_H, type DayTotal } from "@/lib/types";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];
const DAILY_MIN = WEEKLY_GOAL_MIN_H / 7;
const DAILY_MAX = WEEKLY_GOAL_MAX_H / 7;

/** Shaded band + dashed edges for the daily pace that adds up to the 17–20h weekly goal. */
const goalBand: Plugin<"bar"> = {
  id: "goalBand",
  beforeDatasetsDraw(chart) {
    const { ctx, chartArea, scales } = chart;
    const yMin = scales.y.getPixelForValue(DAILY_MIN);
    const yMax = scales.y.getPixelForValue(DAILY_MAX);
    ctx.save();
    ctx.fillStyle = "rgba(124, 140, 255, 0.08)";
    ctx.fillRect(chartArea.left, yMax, chartArea.width, yMin - yMax);
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = "rgba(31, 36, 64, 0.35)";
    for (const y of [yMin, yMax]) {
      ctx.beginPath();
      ctx.moveTo(chartArea.left, y);
      ctx.lineTo(chartArea.right, y);
      ctx.stroke();
    }
    ctx.restore();
  },
};

type Props = { days: DayTotal[]; liveInput: number; liveOutput: number; todayIndex: number };

export default function WeeklyChart({ days, liveInput, liveOutput, todayIndex }: Props) {
  const input = days.map((d, i) => (d.input + (i === todayIndex ? liveInput : 0)) / 3600);
  const output = days.map((d, i) => (d.output + (i === todayIndex ? liveOutput : 0)) / 3600);
  const inSec = input.reduce((a, b) => a + b, 0) * 3600;
  const outSec = output.reduce((a, b) => a + b, 0) * 3600;
  const total = inSec + outSec;
  const totalH = total / 3600;
  const ratio = total ? outSec / total : 0;
  const peak = Math.max(...input.map((v, i) => v + output[i]), DAILY_MAX);

  const goalState = totalH >= WEEKLY_GOAL_MIN_H ? "達成" : `あと${(WEEKLY_GOAL_MIN_H - totalH).toFixed(1)}h`;
  const ratioOk = ratio >= OUTPUT_RATIO_GOAL;

  return (
    <section className="flex flex-col gap-3">
      <div className="glass glass-sheen rounded-[2rem] p-4">
        <div className="mb-2 flex items-center justify-between px-1 text-xs text-ink/60">
          <span className="font-semibold text-ink">This week</span>
          <span className="flex items-center gap-3">
            <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-input" />In</span>
            <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-output" />Out</span>
            <span><i className="mr-1 inline-block h-0 w-3 border-t border-dashed border-ink/40 align-middle" />17–20h</span>
          </span>
        </div>
        <div className="h-48" data-testid="weekly-chart">
          <Bar
            plugins={[goalBand]}
            data={{
              labels: WEEKDAYS.map((w, i) => (i === todayIndex ? `${w}•` : w)),
              datasets: [
                { label: "Input", data: input, backgroundColor: "rgba(124, 140, 255, 0.85)", borderRadius: 8, borderSkipped: false, stack: "s" },
                { label: "Output", data: output, backgroundColor: "rgba(255, 143, 184, 0.85)", borderRadius: 8, borderSkipped: false, stack: "s" },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              animation: { duration: 900, easing: "easeOutQuart" },
              plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${Number(c.raw).toFixed(1)}h` } },
              },
              scales: {
                x: { stacked: true, grid: { display: false }, border: { display: false }, ticks: { color: "#1f244099" } },
                y: {
                  stacked: true,
                  suggestedMax: Math.ceil(peak + 0.5),
                  grid: { color: "rgba(31,36,64,0.06)" },
                  border: { display: false },
                  ticks: { color: "#1f244066", callback: (v) => `${v}h`, maxTicksLimit: 5 },
                },
              },
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-3xl p-4" data-testid="weekly-total">
          <div className="text-[11px] text-ink/55">週合計 / 17–20h</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {formatHours(total)}
            <span className="ml-0.5 text-sm text-ink/50">h</span>
          </div>
          <div className="relative mt-2 h-2 rounded-full bg-white/70">
            <div
              className="absolute inset-y-0 rounded-full bg-ink/10"
              style={{ left: `${(WEEKLY_GOAL_MIN_H / 24) * 100}%`, width: `${((WEEKLY_GOAL_MAX_H - WEEKLY_GOAL_MIN_H) / 24) * 100}%` }}
            />
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-input to-output"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (totalH / 24) * 100)}%` }}
              transition={{ type: "spring", stiffness: 80, damping: 18 }}
            />
          </div>
          <div className="mt-1.5 text-[11px] font-medium text-ink/60">{goalState}</div>
        </div>

        <div className="glass flex items-center gap-3 rounded-3xl p-4" data-testid="output-ratio">
          <Ring value={ratio} ok={ratioOk} />
          <div>
            <div className="text-[11px] text-ink/55">Output比率</div>
            <div className="text-2xl font-semibold tabular-nums">
              {Math.round(ratio * 100)}
              <span className="text-sm text-ink/50">%</span>
            </div>
            <div className={`text-[11px] font-medium ${ratioOk ? "text-emerald-500" : "text-ink/60"}`}>
              {ratioOk ? "50% 達成" : "目標 50%"}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Ring({ value, ok }: { value: number; ok: boolean }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" className="-rotate-90 shrink-0">
      <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="6" />
      <motion.circle
        cx="26"
        cy="26"
        r={r}
        fill="none"
        stroke={ok ? "#34d399" : "#ff8fb8"}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - Math.min(1, value)) }}
        transition={{ type: "spring", stiffness: 70, damping: 16 }}
      />
      {/* 50% goal tick */}
      <line x1="26" y1="2" x2="26" y2="10" stroke="#1f2440" strokeOpacity="0.35" strokeWidth="1.5" transform="rotate(180 26 26)" />
    </svg>
  );
}
