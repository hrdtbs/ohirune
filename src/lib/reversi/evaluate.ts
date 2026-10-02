import {
  CORNERS,
  SHIFTS,
  emptyBits,
  legalMoves,
  popcnt,
} from "./board"

export const SQUARE_VALUE = [
  120, -20, 20, 5, 5, 20, -20, 120,
  -20, -40, -5, -5, -5, -5, -40, -20,
  20, -5, 15, 3, 3, 15, -5, 20,
  5, -5, 3, 3, 3, 3, -5, 5,
  5, -5, 3, 3, 3, 3, -5, 5,
  20, -5, 15, 3, 3, 15, -5, 20,
  -20, -40, -5, -5, -5, -5, -40, -20,
  120, -20, 20, 5, 5, 20, -20, 120,
]

export const CORNER_EXTRA = 250
export const X_EXTRA = 80
export const C_EXTRA = 25
export const X_LIST = [9, 14, 49, 54]
export const C_LIST = [1, 6, 8, 15, 48, 55, 57, 62]

const X_SQUARES = X_LIST.reduce((mask, sq) => mask | (1n << BigInt(sq)), 0n)
const C_SQUARES = C_LIST.reduce((mask, sq) => mask | (1n << BigInt(sq)), 0n)

function weightedSquares(board: bigint): number {
  let score = 0
  let bits = board
  let index = 0
  while (bits && index < 64) {
    if (bits & 1n) score += SQUARE_VALUE[index] ?? 0
    bits >>= 1n
    index += 1
  }
  return score
}

function frontierCount(discs: bigint, empty: bigint): number {
  let adj = 0n
  for (const shift of SHIFTS) adj |= shift(empty)
  return popcnt(adj & discs)
}

export function evaluate(mine: bigint, enemy: bigint): number {
  const empties = popcnt(emptyBits(mine, enemy))
  const myMoves = legalMoves(mine, enemy)
  const oppMoves = legalMoves(enemy, mine)
  const myMoveCount = popcnt(myMoves)
  const oppMoveCount = popcnt(oppMoves)

  if (myMoveCount === 0 && oppMoveCount === 0) {
    return (popcnt(mine) - popcnt(enemy)) * 10000
  }

  const empty = emptyBits(mine, enemy)
  let score = weightedSquares(mine) - weightedSquares(enemy)

  const myCorners = popcnt(mine & CORNERS)
  const oppCorners = popcnt(enemy & CORNERS)
    score += (myCorners - oppCorners) * CORNER_EXTRA

  const openCorners = CORNERS & empty
  if (openCorners) {
    score -= popcnt(mine & X_SQUARES) * X_EXTRA
    score += popcnt(enemy & X_SQUARES) * X_EXTRA
    score -= popcnt(mine & C_SQUARES) * C_EXTRA
    score += popcnt(enemy & C_SQUARES) * C_EXTRA
  }

  const mobilityWeight = empties > 40 ? 18 : empties > 20 ? 14 : 8
  score += (myMoveCount - oppMoveCount) * mobilityWeight

  const frontierWeight = empties > 16 ? 6 : 3
  score -=
    (frontierCount(mine, empty) - frontierCount(enemy, empty)) * frontierWeight

  if (empties <= 16) {
    score += (popcnt(mine) - popcnt(enemy)) * (18 - empties)
  }

  return score
}

export function squareOrderValue(sq: number): number {
  return SQUARE_VALUE[sq] ?? 0
}
