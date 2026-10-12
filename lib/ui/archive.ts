// The court's own filing cabinet — held in the browser. Case files never
// leave the device: the archive is localStorage only, and it stores the
// verdict record, not the message. Ranks are earned by judging; the Daily
// Docket gives one case a day to keep the bench sharp.

export interface CaseRecord {
  id: string;
  judgedAt: string;
  messagePreview: string;
  verdict: "guilty" | "acquitted" | "hung";
  recommendation: "guilty" | "acquitted" | "hung";
  score: number;
  exhibits: number;
  overruled: boolean;
}

export interface ArchiveStats {
  total: number;
  guilty: number;
  acquitted: number;
  hung: number;
  overruled: number;
  streak: number;
  lastJudgedDay: string | null;
  rank: Rank;
  nextRankAt: number | null;
}

export interface Rank {
  title: string;
  at: number;
}

export const RANKS: Rank[] = [
  { title: "Clerk", at: 0 },
  { title: "Junior Counsel", at: 3 },
  { title: "Senior Counsel", at: 10 },
  { title: "Judge", at: 25 },
  { title: "Presiding Justice", at: 60 },
  { title: "Chief Justice", at: 120 },
];

const KEY = "gavel.cases.v1";

export function loadCases(): CaseRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CaseRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveCase(record: CaseRecord): CaseRecord[] {
  const all = loadCases();
  all.unshift(record);
  const trimmed = all.slice(0, 500);
  try {
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    /* storage full or private mode: judging still works, the archive just forgets */
  }
  return trimmed;
}

export function clearCases(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export function rankFor(total: number): { rank: Rank; next: Rank | null } {
  let rank = RANKS[0];
  let next: Rank | null = null;
  for (const r of RANKS) {
    if (total >= r.at) rank = r;
    else {
      next = r;
      break;
    }
  }
  return { rank, next };
}

export function computeStats(cases: CaseRecord[]): ArchiveStats {
  const stats: ArchiveStats = {
    total: cases.length,
    guilty: 0,
    acquitted: 0,
    hung: 0,
    overruled: 0,
    streak: 0,
    lastJudgedDay: null,
    rank: RANKS[0],
    nextRankAt: RANKS[1]?.at ?? null,
  };
  for (const c of cases) {
    if (c.verdict === "guilty") stats.guilty++;
    else if (c.verdict === "acquitted") stats.acquitted++;
    else stats.hung++;
    if (c.overruled) stats.overruled++;
  }
  const { rank, next } = rankFor(stats.total);
  stats.rank = rank;
  stats.nextRankAt = next ? next.at : null;

  const days = [...new Set(cases.map((c) => dayKey(c.judgedAt)))].sort().reverse();
  stats.lastJudgedDay = days[0] ?? null;
  let streak = 0;
  if (days.length > 0) {
    const cursor = new Date(`${days[0]}T00:00:00Z`);
    for (const day of days) {
      const expected = cursor.toISOString().slice(0, 10);
      if (day === expected) {
        streak++;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      } else {
        break;
      }
    }
  }
  stats.streak = streak;
  return stats;
}

export function newCaseId(): string {
  const now = new Date();
  const y = now.getFullYear();
  const n = String(now.getMonth() * 31 + now.getDate()).padStart(3, "0");
  const r = String(Math.floor(Math.random() * 900) + 100);
  return `CASE-${y}-${n}${r}`;
}
