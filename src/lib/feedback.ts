import type { DayTotal, Task } from "./types";
import { OUTPUT_RATIO_GOAL, WEEKLY_GOAL_MAX_H, WEEKLY_GOAL_MIN_H } from "./types";

// llama-3-8b-instruct has been retired on Workers AI; these are the current Llama successors, tried in order.
export const MODELS = ["@cf/meta/llama-3.3-70b-instruct-fp8-fast", "@cf/meta/llama-3.1-8b-instruct-fp8"] as const;

export type WeekStats = {
  totalH: number;
  inputH: number;
  outputH: number;
  outputRatio: number;
  activeDays: number;
  bestDay: string | null;
  tasks: { todo: number; doing: number; done: number };
};

export function summarize(days: DayTotal[], tasks: Pick<Task, "status">[]): WeekStats {
  const input = days.reduce((s, d) => s + d.input, 0);
  const output = days.reduce((s, d) => s + d.output, 0);
  const total = input + output;
  const best = [...days].sort((a, b) => b.input + b.output - (a.input + a.output))[0];
  const count = (s: string) => tasks.filter((t) => t.status === s).length;
  return {
    totalH: +(total / 3600).toFixed(1),
    inputH: +(input / 3600).toFixed(1),
    outputH: +(output / 3600).toFixed(1),
    outputRatio: total ? +(output / total).toFixed(2) : 0,
    activeDays: days.filter((d) => d.input + d.output > 0).length,
    bestDay: best && best.input + best.output > 0 ? best.date : null,
    tasks: { todo: count("todo"), doing: count("doing"), done: count("done") },
  };
}

export function buildPrompt(s: WeekStats) {
  return [
    {
      role: "system",
      content:
        "あなたはUSCPA受験生専属の学習コーチです。必ず日本語で、結論から書きます。" +
        "出力は厳密に3行以内。各行は60文字以内の1文。前置き・挨拶・箇条書き記号・番号・見出しは禁止。" +
        "翌週の努力のベクトルを最大化する、具体的で実行可能な行動だけを示してください。" +
        "1行目は「結論：」で始め、最も効果の大きい1手を書く。各行に必ず具体的な数値（1日あたり時間、比率、問題数、曜日など）を入れる。" +
        "「頑張る」「増やす」だけの抽象的な表現は禁止。",
    },
    {
      role: "user",
      content:
        `今週の学習データ: 合計${s.totalH}時間（目標${WEEKLY_GOAL_MIN_H}〜${WEEKLY_GOAL_MAX_H}時間）、` +
        `インプット${s.inputH}時間、アウトプット${s.outputH}時間、アウトプット比率${Math.round(s.outputRatio * 100)}%` +
        `（目標${OUTPUT_RATIO_GOAL * 100}%以上）、学習日数${s.activeDays}/7日。` +
        `タスク: 未着手${s.tasks.todo}件、進行中${s.tasks.doing}件、完了${s.tasks.done}件。` +
        `来週の必達ペース: 1日${(WEEKLY_GOAL_MIN_H / 7).toFixed(1)}時間以上（週${WEEKLY_GOAL_MIN_H}時間以上）、` +
        `そのうちアウトプット（MCQ/TBS演習）を半分以上。この基準と矛盾する数値は書かないこと。` +
        "翌週へのアドバイスを3行以内で。",
    },
  ];
}

/** Keeps the model honest to the "3 lines, conclusion first" contract. */
export function toLines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((l) => l.replace(/^\s*(?:[-*・•]|\d+[.)．、]|#+)\s*/, "").trim())
    .filter((l) => l.length > 0 && !/^(はい|了解|以下|アドバイス[:：]?$)/.test(l))
    .slice(0, 3)
    .map((l) => (l.length > 80 ? `${l.slice(0, 79)}…` : l));
}

/** Deterministic advice used when Workers AI is unavailable. */
export function fallbackLines(s: WeekStats): string[] {
  const lines: string[] = [];
  if (s.totalH < WEEKLY_GOAL_MIN_H) {
    const perDay = ((WEEKLY_GOAL_MIN_H - s.totalH) / 7 + s.totalH / 7).toFixed(1);
    lines.push(`結論：来週は1日${perDay}時間を固定枠で確保し、週${WEEKLY_GOAL_MIN_H}時間を必達に。`);
  } else {
    lines.push(`結論：週${s.totalH}時間は目標圏内。量は維持し、質の改善に集中。`);
  }
  if (s.outputRatio < OUTPUT_RATIO_GOAL) {
    lines.push(`アウトプット比率${Math.round(s.outputRatio * 100)}%→50%へ。講義の後は即MCQ/TBSを解く。`);
  } else {
    lines.push("アウトプット比率は達成。間違えたMCQの復習ノートで定着率を上げる。");
  }
  lines.push(
    s.tasks.doing > 2
      ? `進行中${s.tasks.doing}件は多すぎ。2件に絞って完了まで走り切る。`
      : "月曜朝に今週の完了タスクを3つ決め、毎晩進捗を確認する。",
  );
  return lines;
}
