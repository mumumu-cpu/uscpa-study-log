"use client";

import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { useState } from "react";
import { CATEGORY_LABEL, STATUS_LABEL, STATUSES, type Task, type TaskCategory, type TaskStatus } from "@/lib/types";

const SWIPE_DISTANCE = 70;
const SWIPE_VELOCITY = 500;

const STATUS_STYLE: Record<TaskStatus, string> = {
  todo: "bg-slate-300",
  doing: "bg-input",
  done: "bg-emerald-400",
};
const CATEGORY_STYLE: Record<TaskCategory, string> = {
  mcq: "bg-indigo-100 text-indigo-600",
  tbs: "bg-pink-100 text-pink-600",
  lecture: "bg-sky-100 text-sky-600",
  other: "bg-amber-100 text-amber-700",
};

type Props = {
  tasks: Task[];
  onAdd: (title: string, category: TaskCategory) => void;
  onMove: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
};

export default function TaskBoard({ tasks, onAdd, onMove, onDelete }: Props) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TaskCategory>("mcq");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim(), category);
    setTitle("");
  };

  return (
    <section className="flex flex-col gap-4">
      <form onSubmit={submit} className="glass glass-sheen rounded-[2rem] p-3">
        <div className="flex gap-2">
          <input
            data-testid="task-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="新しいタスク"
            maxLength={120}
            className="h-11 min-w-0 flex-1 rounded-full bg-white/70 px-4 text-sm outline-none placeholder:text-ink/40 focus:ring-2 focus:ring-input/40"
          />
          <motion.button
            type="submit"
            data-testid="task-add"
            aria-label="タスクを追加"
            whileTap={{ scale: 0.9 }}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-input to-output text-white shadow-md"
          >
            <Plus size={20} />
          </motion.button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(Object.keys(CATEGORY_LABEL) as TaskCategory[]).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={`relative rounded-full px-3 py-1 text-xs font-medium transition-colors ${category === c ? "text-white" : "text-ink/60"}`}
            >
              {category === c && (
                <motion.span layoutId="cat-pill" className="absolute inset-0 -z-0 rounded-full bg-ink/80" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
              )}
              <span className="relative">{CATEGORY_LABEL[c]}</span>
            </button>
          ))}
        </div>
      </form>

      {/* One flat keyed list, so a status change is a layout move rather than an unmount/remount. */}
      <div className="flex flex-col gap-2" data-testid="task-list">
        <AnimatePresence initial={false} mode="popLayout">
          {STATUSES.flatMap((status) => {
            const list = tasks.filter((t) => t.status === status);
            return [
              <motion.div key={`h-${status}`} layout data-testid={`column-${status}`} className="mt-2 flex items-center gap-2 px-2 text-xs font-semibold text-ink/60 first:mt-0">
                <span className={`h-2 w-2 rounded-full ${STATUS_STYLE[status]}`} />
                {STATUS_LABEL[status]}
                <motion.span key={list.length} data-testid={`count-${status}`} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="rounded-full bg-white/70 px-2 py-0.5 tabular-nums">
                  {list.length}
                </motion.span>
              </motion.div>,
              ...list.map((task) => <SwipeCard key={task.id} task={task} onMove={onMove} onDelete={onDelete} />),
              ...(list.length === 0
                ? [
                    <motion.div
                      key={`e-${status}`}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, transition: { duration: 0.12 } }}
                      className="rounded-3xl border border-dashed border-white/80 py-4 text-center text-xs text-ink/35"
                    >
                      —
                    </motion.div>,
                  ]
                : []),
            ];
          })}
        </AnimatePresence>
      </div>
    </section>
  );
}

function SwipeCard({ task, onMove, onDelete }: { task: Task; onMove: Props["onMove"]; onDelete: Props["onDelete"] }) {
  const idx = STATUSES.indexOf(task.status);
  const next = STATUSES[idx + 1];
  const prev = STATUSES[idx - 1];
  const x = useMotionValue(0);
  const rightHint = useTransform(x, [0, SWIPE_DISTANCE], [0, 1]);
  const leftHint = useTransform(x, [-SWIPE_DISTANCE, 0], [1, 0]);
  const rotate = useTransform(x, [-200, 200], [-4, 4]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const goRight = info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY;
    const goLeft = info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY;
    if (goRight && next) onMove(task.id, next);
    else if (goLeft && prev) onMove(task.id, prev);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className="relative"
    >
      {/* Revealed behind the card while swiping. */}
      <div className="absolute inset-0 flex items-center justify-between rounded-3xl px-5 text-xs font-semibold">
        <motion.span style={{ opacity: leftHint }} className="flex items-center gap-1 text-ink/50">
          {prev && (<><ChevronLeft size={14} />{STATUS_LABEL[prev]}</>)}
        </motion.span>
        <motion.span style={{ opacity: rightHint }} className="flex items-center gap-1 text-ink/50">
          {next && (<>{STATUS_LABEL[next]}<ChevronRight size={14} /></>)}
        </motion.span>
      </div>
      <motion.div
        data-testid="task-card"
        data-task-id={task.id}
        data-status={task.status}
        drag="x"
        dragSnapToOrigin
        dragElastic={0.5}
        dragConstraints={{ left: prev ? -160 : 0, right: next ? 160 : 0 }}
        onDragEnd={onDragEnd}
        style={{ x, rotate, touchAction: "pan-y" }}
        whileDrag={{ scale: 1.03, cursor: "grabbing" }}
        className="glass relative flex cursor-grab items-center gap-3 rounded-3xl px-4 py-3.5"
      >
        <span className={`h-8 w-1 shrink-0 rounded-full ${STATUS_STYLE[task.status]}`} />
        <div className="min-w-0 flex-1">
          <div className={`truncate text-sm font-medium ${task.status === "done" ? "text-ink/40 line-through" : ""}`}>{task.title}</div>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_STYLE[task.category]}`}>
            {CATEGORY_LABEL[task.category]}
          </span>
        </div>
        <button
          type="button"
          aria-label="削除"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onDelete(task.id)}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink/30 hover:bg-white/70 hover:text-ink/60"
        >
          <X size={14} />
        </button>
      </motion.div>
    </motion.div>
  );
}
