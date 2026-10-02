export type Card = {
  suit: number
  rank: number
}

export type Game = {
  columns: Card[][]
  free: (Card | null)[]
  found: number[]
}

export type Move = {
  from: "column" | "free"
  col: number
  index: number
  count: number
  to: "column" | "free" | "found"
  target: number
}

const RED = new Set([1, 2])

export function isRed(card: Card): boolean {
  return RED.has(card.suit)
}

export function deal(rng: () => number = Math.random): Game {
  const cards: Card[] = []
  for (let suit = 0; suit < 4; suit += 1) {
    for (let rank = 1; rank <= 13; rank += 1) cards.push({ suit, rank })
  }
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    const swap = cards[i]
    cards[i] = cards[j] as Card
    cards[j] = swap as Card
  }
  const columns = Array.from({ length: 8 }, () => [] as Card[])
  cards.forEach((card, index) => columns[index % 8]?.push(card))
  return { columns, free: [null, null, null, null], found: [0, 0, 0, 0] }
}

export function clone(game: Game): Game {
  return {
    columns: game.columns.map((column) => column.map((card) => ({ ...card }))),
    free: game.free.map((card) => (card ? { ...card } : null)),
    found: game.found.slice(),
  }
}

function sequenceOk(column: Card[], index: number): boolean {
  for (let i = index; i < column.length - 1; i += 1) {
    const card = column[i]
    const next = column[i + 1]
    if (!card || !next) return false
    if (card.rank !== next.rank + 1 || isRed(card) === isRed(next)) return false
  }
  return index >= 0 && index < column.length
}

export function emptyColumns(game: Game): number {
  return game.columns.filter((column) => column.length === 0).length
}

export function freeLeft(game: Game): number {
  return game.free.filter((card) => card === null).length
}

export function canMoveCount(game: Game, count: number, toEmpty: boolean): boolean {
  const empties = toEmpty ? emptyColumns(game) - 1 : emptyColumns(game)
  if (empties < 0) return count === 1
  return count <= (freeLeft(game) + 1) * 2 ** empties
}

function fitsColumn(card: Card, column: Card[]): boolean {
  if (column.length === 0) return true
  const top = column[column.length - 1]
  return !!top && top.rank === card.rank + 1 && isRed(top) !== isRed(card)
}

export function legalMoves(game: Game): Move[] {
  const moves: Move[] = []
  const pushCard = (from: Move["from"], col: number, index: number, card: Card) => {
    if (game.found[card.suit] === card.rank - 1) {
      moves.push({ from, col, index, count: 1, to: "found", target: card.suit })
    }
    if (from !== "free") {
      game.free.forEach((slot, target) => {
        if (slot === null) moves.push({ from, col, index, count: 1, to: "free", target })
      })
    }
    game.columns.forEach((column, target) => {
      if (from === "column" && target === col) return
      if (fitsColumn(card, column)) moves.push({ from, col, index, count: 1, to: "column", target })
    })
  }

  game.free.forEach((card, slot) => {
    if (card) pushCard("free", slot, 0, card)
  })

  game.columns.forEach((column, col) => {
    for (let index = 0; index < column.length; index += 1) {
      if (!sequenceOk(column, index)) continue
      const count = column.length - index
      const head = column[index]
      if (!head) continue
      if (count === 1) {
        pushCard("column", col, index, head)
        continue
      }
      game.columns.forEach((targetColumn, target) => {
        if (target === col) return
        const toEmpty = targetColumn.length === 0
        if (!canMoveCount(game, count, toEmpty)) return
        if (fitsColumn(head, targetColumn)) {
          moves.push({ from: "column", col, index, count, to: "column", target })
        }
      })
    }
  })
  return moves
}

export function apply(game: Game, move: Move): Game {
  const next = clone(game)
  let cards: Card[] = []
  if (move.from === "free") {
    const card = next.free[move.col]
    if (!card) return next
    cards = [card]
    next.free[move.col] = null
  } else {
    cards = next.columns[move.col]?.splice(move.index, move.count) ?? []
  }
  if (move.to === "free") next.free[move.target] = cards[0] ?? null
  else if (move.to === "found") {
    const card = cards[0]
    if (card) next.found[card.suit] = card.rank
  } else next.columns[move.target]?.push(...cards)
  return next
}

export function won(game: Game): boolean {
  return game.found.every((rank) => rank === 13)
}

const SUIT = ["S", "H", "D", "C"]
const RANK = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]

export function cardName(card: Card): string {
  return `${SUIT[card.suit] ?? ""}${RANK[card.rank] ?? ""}`
}

export function moveName(game: Game, move: Move): string {
  const card = move.from === "free" ? game.free[move.col] : game.columns[move.col]?.[move.index]
  const name = card ? cardName(card) : ""
  const extra = move.count > 1 ? `×${move.count}` : ""
  if (move.to === "found") return `${name}${extra} 台`
  if (move.to === "free") return `${name}${extra} 置`
  return `${name}${extra} ${move.target + 1}列`
}

export function sameMove(a: Move, b: Move): boolean {
  return a.from === b.from && a.col === b.col && a.index === b.index && a.count === b.count && a.to === b.to && a.target === b.target
}
