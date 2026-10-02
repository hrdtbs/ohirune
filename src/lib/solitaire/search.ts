import { apply, legalMoves, moveName, won, type Game, type Move } from "./freecell"

export type SolitaireCandidate = Move & {
  name: string
  score: number
}

export type SolitaireAnalysis = {
  best: Move | null
  score: number
  depth: number
  candidates: SolitaireCandidate[]
  done: boolean
}

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now()
}

export const FOUNDATION_POINT = 120
export const EMPTY_COLUMN_POINT = 18
export const NEXT_CARD_POINT = 25
export const EMPTY_FREE_POINT = 8
export const BURIED_POINT = 1

export function evaluate(game: Game): number {
  if (won(game)) return 100000
  let score = game.found.reduce((sum, rank) => sum + rank, 0) * FOUNDATION_POINT
  score += game.free.filter((card) => card === null).length * EMPTY_FREE_POINT
  score += game.columns.filter((column) => column.length === 0).length * EMPTY_COLUMN_POINT
  for (const column of game.columns) {
    for (let index = 0; index < column.length; index += 1) {
      const card = column[index]
      if (!card) continue
      if (card.rank === (game.found[card.suit] ?? 0) + 1 && index === column.length - 1) score += NEXT_CARD_POINT
      if (index < column.length - 1) score -= BURIED_POINT
    }
  }
  return score
}

function distinct(moves: Move[]): Move[] {
  const seen = new Set<string>()
  const out: Move[] = []
  for (const move of moves) {
    const key =
      move.to === "free"
        ? `${move.from}:${move.col}:${move.index}:${move.count}:free`
        : `${move.from}:${move.col}:${move.index}:${move.count}:${move.to}:${move.target}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(move)
  }
  return out
}

function ordered(game: Game, moves: Move[]): Move[] {
  return distinct(moves)
    .map((move) => ({ move, rank: move.to === "found" ? 3 : move.to === "column" ? 2 : 1 }))
    .sort((a, b) => b.rank - a.rank)
    .map((item) => item.move)
}

export function analyze(input: {
  game: Game
  timeMs: number
  maxDepth: number
  onProgress?: (analysis: SolitaireAnalysis) => void
}): SolitaireAnalysis {
  const deadline = now() + Math.max(80, input.timeMs)
  const maxDepth = Math.max(1, Math.min(10, input.maxDepth))
  let timedOut = false
  let best: Move | null = null
  let bestScore = evaluate(input.game)
  let depthReached = 0
  let last: SolitaireCandidate[] = []

  function timeout(): boolean {
    if (timedOut) return true
    if (now() >= deadline) timedOut = true
    return timedOut
  }

  function search(game: Game, depth: number): number {
    if (timeout()) return 0
    if (won(game) || depth === 0) return evaluate(game)
    const moves = ordered(game, legalMoves(game)).slice(0, 14)
    if (moves.length === 0) return evaluate(game) - 40
    let local = -100000
    for (const move of moves) {
      const score = search(apply(game, move), depth - 1)
      if (timedOut) return 0
      if (score > local) local = score
    }
    return local
  }

  const root = ordered(input.game, legalMoves(input.game))
  if (root.length === 0) {
    return { best: null, score: bestScore, depth: 0, candidates: [], done: true }
  }

  function named(items: { move: Move; score: number }[]): SolitaireCandidate[] {
    return items
      .map((item) => ({ ...item.move, name: moveName(input.game, item.move), score: item.score }))
      .sort((a, b) => b.score - a.score)
  }

  for (let depth = 1; depth <= maxDepth; depth += 1) {
    timedOut = false
    const scored: { move: Move; score: number }[] = []
    let localBest = -100000
    let localMove: Move | null = root[0] ?? null
    const orderedRoot = [...root].sort((a, b) => {
      const sa = last.find((item) => item.col === a.col && item.index === a.index && item.to === a.to && item.target === a.target && item.count === a.count)?.score ?? 0
      const sb = last.find((item) => item.col === b.col && item.index === b.index && item.to === b.to && item.target === b.target && item.count === b.count)?.score ?? 0
      return sb - sa
    })
    for (const move of orderedRoot) {
      const score = search(apply(input.game, move), depth - 1)
      if (timedOut) break
      scored.push({ move, score })
      if (score > localBest) {
        localBest = score
        localMove = move
      }
      const pending = named([
        ...scored,
        ...last
          .filter((item) => !scored.some((done) => done.move.col === item.col && done.move.index === item.index && done.move.to === item.to && done.move.target === item.target && done.move.count === item.count))
          .map((item) => ({ move: item, score: item.score })),
      ])
      input.onProgress?.({ best: localMove, score: localBest, depth, candidates: pending, done: false })
    }
    if (timedOut) break
    last = named(scored)
    best = localMove
    bestScore = localBest
    depthReached = depth
    input.onProgress?.({ best, score: bestScore, depth, candidates: last, done: false })
    if (now() >= deadline) break
    if (bestScore >= 100000) break
  }

  return { best, score: bestScore, depth: depthReached, candidates: last, done: true }
}

export function formatSolitaireScore(score: number): string {
  if (score >= 100000) return "完"
  return String(score)
}
