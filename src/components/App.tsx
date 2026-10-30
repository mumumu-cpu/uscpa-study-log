"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ListChecks, LogOut, Sparkles, Timer } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { localDate, weekStart as getWeekStart } from "@/lib/date";
import type { Dashboard, Task, TaskCategory, TaskStatus } from "@/lib/types";
import Background from "./Background";
import FeedbackPanel from "./FeedbackPanel";
import ModeToggle from "./ModeToggle";
import FullScreenSkeleton from "./Skeleton";
import TaskBoard from "./TaskBoard";
import TimerCard from "./TimerCard";
import { useStudyTimer, type Segment } from "./useStudyTimer";
import WeeklyChart from "./WeeklyChart";

type Tab = "timer" | "tasks" | "ai";
const TABS: { id: Tab; label: string; Icon: typeof Timer }[] = [
  { id: "timer", label: "Timer", Icon: Timer },
  { id: "tasks", label: "Tasks", Icon: ListChecks },
  { id: "ai", label: "AI", Icon: Sparkles },
];

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  if (res.status === 401) {
    window.location.reload();
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json() as Promise<T>;
}

export default function App({ signOutAction }: { signOutAction?: () => Promise<void> }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [tab, setTab] = useState<Tab>("timer");
  const [[direction], setDirection] = useState<[number]>([0]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api<Dashboard>(`/api/dashboard?weekStart=${getWeekStart()}`));
    } catch (e) {
      setError("データの取得に失敗しました");
      console.error(e);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onSegment = useCallback((seg: Segment) => {
    setData((d) =>
      d && {
        ...d,
        days: d.days.map((day) => (day.date === seg.date ? { ...day, [seg.mode]: day[seg.mode] + seg.seconds } : day)),
      },
    );
    api("/api/sessions", { method: "POST", body: JSON.stringify(seg) }).catch(() => setError("記録の保存に失敗しました"));
  }, []);

  const timer = useStudyTimer(onSegment);

  const today = localDate();
  const todayIndex = data?.days.findIndex((d) => d.date === today) ?? -1;
  const todayRow = todayIndex >= 0 ? data!.days[todayIndex] : { input: 0, output: 0 };
  const liveInput = timer.mode === "input" ? timer.segmentSeconds : 0;
  const liveOutput = timer.mode === "output" ? timer.segmentSeconds : 0;

  const changeTab = (next: Tab) => {
    setDirection([TABS.findIndex((t) => t.id === next) - TABS.findIndex((t) => t.id === tab)]);
    setTab(next);
  };

  const pending = useRef(new Map<string, Promise<unknown>>());

  const addTask = async (title: string, category: TaskCategory) => {
    const id = crypto.randomUUID();
    setData((d) => d && { ...d, tasks: [...d.tasks, { id, title, category, status: "todo" }] });
    const req = api<Task>("/api/tasks", { method: "POST", body: JSON.stringify({ id, title, category }) });
    pending.current.set(id, req);
    try {
      await req;
    } catch {
      setData((d) => d && { ...d, tasks: d.tasks.filter((t) => t.id !== id) });
      setError("タスクの追加に失敗しました");
    } finally {
      pending.current.delete(id);
    }
  };

  const moveTask = async (id: string, status: TaskStatus) => {
    const before = data?.tasks.find((t) => t.id === id)?.status;
    setData((d) => d && { ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, status } : t)) });
    try {
      await pending.current.get(id);
      await api(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    } catch {
      if (before) setData((d) => d && { ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, status: before } : t)) });
      setError("ステータスの更新に失敗しました");
    }
  };

  const deleteTask = async (id: string) => {
    const snapshot = data?.tasks;
    setData((d) => d && { ...d, tasks: d.tasks.filter((t) => t.id !== id) });
    try {
      await pending.current.get(id);
      await api(`/api/tasks/${id}`, { method: "DELETE" });
    } catch {
      if (snapshot) setData((d) => d && { ...d, tasks: snapshot });
      setError("削除に失敗しました");
    }
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const fb = await api<{ lines: string[]; createdAt: string }>("/api/feedback", {
        method: "POST",
        body: JSON.stringify({ weekStart: data?.weekStart ?? getWeekStart() }),
      });
      setData((d) => d && { ...d, feedback: { lines: fb.lines, createdAt: fb.createdAt } });
    } catch {
      setError("AIフィードバックの生成に失敗しました");
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(null), 3500);
    return () => clearTimeout(id);
  }, [error]);

  const variants = useMemo(
    () => ({
      enter: (dir: number) => ({ x: dir >= 0 ? 60 : -60, opacity: 0, filter: "blur(6px)" }),
      center: { x: 0, opacity: 1, filter: "blur(0px)" },
      exit: (dir: number) => ({ x: dir >= 0 ? -60 : 60, opacity: 0, filter: "blur(6px)" }),
    }),
    [],
  );

  const loading = !data && !error;

  return (
    <div className="min-h-dvh">
      <Background />
      <AnimatePresence>
        {loading && <FullScreenSkeleton label="読み込み中" />}
        {generating && <FullScreenSkeleton label="AIフィードバック生成中" />}
      </AnimatePresence>

      {data && (
        <motion.main
          className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-[max(env(safe-area-inset-top),1.25rem)] pb-32"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <header className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-input to-output" />
              USCPA
            </div>
            <form action={signOutAction} className="flex items-center gap-2">
              {data.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.user.image} alt="" className="h-8 w-8 rounded-full border border-white/70 shadow" referrerPolicy="no-referrer" />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white/70 text-xs font-semibold">{data.user.name.slice(0, 1)}</span>
              )}
              {signOutAction && (
                <button type="submit" aria-label="ログアウト" className="grid h-8 w-8 place-items-center rounded-full bg-white/50 text-ink/50">
                  <LogOut size={14} />
                </button>
              )}
            </form>
          </header>

          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={tab}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex flex-col gap-4"
            >
              {tab === "timer" && (
                <>
                  <TimerCard
                    elapsed={timer.elapsed}
                    running={timer.running}
                    mode={timer.mode}
                    todayInput={todayRow.input + liveInput}
                    todayOutput={todayRow.output + liveOutput}
                    onToggle={timer.toggle}
                    onReset={timer.reset}
                  />
                  <ModeToggle mode={timer.mode} onChange={timer.setMode} />
                  <WeeklyChart days={data.days} liveInput={liveInput} liveOutput={liveOutput} todayIndex={todayIndex} />
                </>
              )}
              {tab === "tasks" && <TaskBoard tasks={data.tasks} onAdd={addTask} onMove={moveTask} onDelete={deleteTask} />}
              {tab === "ai" && <FeedbackPanel feedback={data.feedback} onGenerate={generate} busy={generating} />}
            </motion.div>
          </AnimatePresence>
        </motion.main>
      )}

      {data && (
        <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
          <div className="glass relative grid w-full max-w-xs grid-cols-3 rounded-full p-1.5">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                data-testid={`tab-${id}`}
                aria-current={tab === id ? "page" : undefined}
                onClick={() => changeTab(id)}
                className="relative flex h-12 flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-semibold"
              >
                {tab === id && <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-full bg-white shadow-md" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <span className={`relative flex flex-col items-center gap-0.5 ${tab === id ? "text-ink" : "text-ink/45"}`}>
                  <Icon size={18} />
                  {label}
                  {id === "timer" && timer.running && tab !== "timer" && (
                    <motion.i className="absolute -top-0.5 right-1 h-1.5 w-1.5 rounded-full bg-output" animate={{ scale: [1, 1.6, 1] }} transition={{ duration: 1, repeat: Infinity }} />
                  )}
                </span>
              </button>
            ))}
          </div>
        </nav>
      )}

      <AnimatePresence>
        {error && (
          <motion.div
            role="alert"
            className="glass fixed inset-x-4 top-4 z-[60] mx-auto max-w-sm rounded-2xl px-4 py-3 text-center text-sm"
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
          >
            {error}
            {!data && (
              <button className="ml-3 font-semibold text-input" onClick={() => { setError(null); load(); }}>
                再試行
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
