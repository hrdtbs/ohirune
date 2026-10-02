export const REVERSI_LEVELS = [
  { id: "short", label: "短", timeMs: 220, maxDepth: 3 },
  { id: "mid", label: "中", timeMs: 480, maxDepth: 5 },
  { id: "deep", label: "深", timeMs: 1100, maxDepth: 7 },
] as const

export type ReversiLevelId = (typeof REVERSI_LEVELS)[number]["id"]
