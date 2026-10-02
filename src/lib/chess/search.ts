import { inCheck, legalMoves, make, moveName, outcome, toPos, unmake, type Move, type Pos, type Pub } from "./game"

export type ChessCandidate = {
  from: number
  to: number
  promo: number
  kind: number
  name: string
  score: number
}

export type ChessAnalysis = {
  best: Move | null
  score: number
  depth: number
  nodes: number
  candidates: ChessCandidate[]
  done: boolean
}

export const PIECE_VALUE = [0, 100, 320, 330, 500, 900, 0]
const MATE = 100000

export const PIECE_SQUARE = [
  [],
  [0, 0, 0, 0, 0, 0, 0, 0, 8, 8, 8, 8, 8, 8, 8, 8, 2, 2, 4, 6, 6, 4, 2, 2, 1, 1, 2, 5, 5, 2, 1, 1, 0, 0, 0, 4, 4, 0, 0, 0, 1, -1, -2, 0, 0, -2, -1, 1, 1, 2, 2, -4, -4, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [-10, -4, -2, -2, -2, -2, -4, -10, -4, -2, 0, 0, 0, 0, -2, -4, -2, 0, 2, 3, 3, 2, 0, -2, -2, 1, 3, 4, 4, 3, 1, -2, -2, 0, 3, 4, 4, 3, 0, -2, -2, 1, 2, 3, 3, 2, 1, -2, -4, -2, 0, 1, 1, 0, -2, -4, -10, -4, -2, -2, -2, -2, -4, -10],
  [-4, -2, -2, -2, -2, -2, -2, -4, -2, 0, 0, 0, 0, 0, 0, -2, -2, 0, 1, 2, 2, 1, 0, -2, -2, 1, 1, 2, 2, 1, 1, -2, -2, 0, 2, 2, 2, 2, 0, -2, -2, 2, 2, 2, 2, 2, 2, -2, -2, 1, 0, 0, 0, 0, 1, -2, -4, -2, -2, -2, -2, -2, -2, -4],
  [0, 0, 1, 2, 2, 1, 0, 0, -1, 0, 0, 0, 0, 0, 0, -1, -1, 0, 0, 0, 0, 0, 0, -1, -1, 0, 0, 0, 0, 0, 0, -1, -1, 0, 0, 0, 0, 0, 0, -1, -1, 0, 0, 0, 0, 0, 0, -1, 1, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [-4, -2, -2, -1, -1, -2, -2, -4, -2, 0, 0, 0, 0, 0, 0, -2, -2, 0, 1, 1, 1, 1, 0, -2, -1, 0, 1, 1, 1, 1, 0, -1, 0, 0, 1, 1, 1, 1, 0, -1, -2, 1, 1, 1, 1, 1, 0, -2, -2, 0, 1, 0, 0, 0, 0, -2, -4, -2, -2, -1, -1, -2, -2, -4],
  [-6, -8, -8, -10, -10, -8, -8, -6, -6, -8, -8, -10, -10, -8, -8, -6, -6, -8, -8, -10, -10, -8, -8, -6, -6, -8, -8, -10, -10, -8, -8, -6, -4, -6, -6, -8, -8, -6, -6, -4, -2, -4, -4, -4, -4, -4, -4, -2, 4, 4, 0, 0, 0, 0, 4, 4, 4, 6, 2, 0, 0, 2, 6, 4],
]

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now()
}

function mirror(sq: number, side: number): number {
  return side === 0 ? sq : sq ^ 56
}

export function evaluate(pos: Pos): number {
  let score = 0
  for (let sq = 0; sq < 64; sq += 1) {
    const piece = pos.sq[sq] ?? 0
    if (piece === 0) continue
    const type = piece & 7
    const side = piece < 9 ? 0 : 1
    const sign = side === pos.side ? 1 : -1
    const table = PIECE_SQUARE[type] ?? []
    score += sign * ((PIECE_VALUE[type] ?? 0) + (table[mirror(sq, side)] ?? 0))
  }
  return score
}

function orderMoves(pos: Pos, moves: Move[]): Move[] {
  return moves
    .map((move) => {
      const victim = move.kind === 2 ? 1 : (pos.sq[move.to] ?? 0) & 7
      const rank = (move.promo ? 800 : 0) + victim * 10 - ((pos.sq[move.from] ?? 0) & 7)
      return { move, rank }
    })
    .sort((a, b) => b.rank - a.rank)
    .map((item) => item.move)
}

export type AnalyzeInput = {
  pub: Pub
  timeMs: number
  maxDepth: number
  onProgress?: (analysis: ChessAnalysis) => void
}

export function analyze(input: AnalyzeInput): ChessAnalysis {
  const pos = toPos(input.pub)
  const deadline = now() + Math.max(80, input.timeMs)
  const maxDepth = Math.max(1, Math.min(8, input.maxDepth))
  let nodes = 0
  let timedOut = false
  let best: Move | null = null
  let bestScore = 0
  let depthReached = 0
  let last: ChessCandidate[] = legalMoves(pos).map((move) => ({
    ...move,
    name: "",
    score: 0,
  }))

  function timeout(): boolean {
    if (timedOut) return true
    if ((nodes & 1023) === 0 && now() >= deadline) timedOut = true
    return timedOut
  }

  function search(depth: number, alpha0: number, beta: number, ply: number): number {
    nodes += 1
    if (timeout()) return 0
    if (pos.half >= 100) return 0
    if (depth === 0) return evaluate(pos)
    const moves = legalMoves(pos)
    if (moves.length === 0) return inCheck(pos) ? -MATE + ply : 0
    let alpha = alpha0
    let bestLocal = -MATE
    for (const move of orderMoves(pos, moves)) {
      const undo = make(pos, move)
      const score = -search(depth - 1, -beta, -alpha, ply + 1)
      unmake(pos, move, undo)
      if (timedOut) return 0
      if (score > bestLocal) bestLocal = score
      if (score > alpha) alpha = score
      if (alpha >= beta) break
    }
    return bestLocal
  }

  const root = legalMoves(pos)
  if (root.length === 0) {
    const over = outcome(pos)
    return {
      best: null,
      score: over === "mate" ? -MATE : 0,
      depth: 0,
      nodes,
      candidates: [],
      done: true,
    }
  }

  function named(moves: { move: Move; score: number }[]): ChessCandidate[] {
    const raw = moves.map((item) => item.move)
    return moves
      .map((item) => ({
        ...item.move,
        name: moveLabel(pos, item.move, raw),
        score: item.score,
      }))
      .sort((a, b) => b.score - a.score)
  }

  for (let depth = 1; depth <= maxDepth; depth += 1) {
    timedOut = false
    const scored: { move: Move; score: number }[] = []
    let localBest = -MATE * 2
    let localMove = root[0] ?? null
    const ordered = [...root].sort((a, b) => {
      const sa = last.find((item) => item.from === a.from && item.to === a.to && item.promo === a.promo)?.score ?? 0
      const sb = last.find((item) => item.from === b.from && item.to === b.to && item.promo === b.promo)?.score ?? 0
      return sb - sa
    })
    for (const move of ordered) {
      const undo = make(pos, move)
      const score = -search(depth - 1, -MATE, MATE, 1)
      unmake(pos, move, undo)
      if (timedOut) break
      scored.push({ move, score })
      if (score > localBest) {
        localBest = score
        localMove = move
      }
      const pending = named([
        ...scored,
        ...last
          .filter((item) => !scored.some((done) => done.move.from === item.from && done.move.to === item.to && done.move.promo === item.promo))
          .map((item) => ({ move: item, score: item.score })),
      ])
      input.onProgress?.({
        best: localMove,
        score: localBest,
        depth,
        nodes,
        candidates: pending,
        done: false,
      })
    }
    if (timedOut && scored.length === 0) break
    if (timedOut) break
    last = named(scored)
    best = localMove
    bestScore = localBest
    depthReached = depth
    input.onProgress?.({
      best,
      score: bestScore,
      depth,
      nodes,
      candidates: last,
      done: false,
    })
    if (now() >= deadline) break
    if (Math.abs(bestScore) > MATE - 100) break
  }

  return {
    best,
    score: bestScore,
    depth: depthReached,
    nodes,
    candidates: last,
    done: true,
  }
}

function moveLabel(pos: Pos, move: Move, all: Move[]): string {
  return moveName(pos, move, all)
}

export function formatChessScore(score: number): string {
  if (score > 90000) return "詰"
  if (score < -90000) return "負"
  const value = score / 100
  if (Math.abs(value) < 0.05) return "0"
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`
}
