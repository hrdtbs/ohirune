export const WP = 1
export const WN = 2
export const WB = 3
export const WR = 4
export const WQ = 5
export const WK = 6
export const BP = 9
export const BN = 10
export const BB = 11
export const BR = 12
export const BQ = 13
export const BK = 14

export type Pub = {
  sq: number[]
  side: number
  castle: number
  ep: number
  half: number
}

export type Move = {
  from: number
  to: number
  promo: number
  kind: number
}

export type Pos = {
  sq: Uint8Array
  side: number
  castle: number
  ep: number
  half: number
}

export type Undo = {
  captured: number
  castle: number
  ep: number
  half: number
  epCap: number
  rookFrom: number
  rookTo: number
}

const ROOK = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const
const BISHOP = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
] as const
const KNIGHT = [
  [1, 2],
  [2, 1],
  [-1, 2],
  [-2, 1],
  [1, -2],
  [2, -1],
  [-1, -2],
  [-2, -1],
] as const
const KING = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
] as const

export function startPub(): Pub {
  const sq = Array.from({ length: 64 }, () => 0)
  const back = [WR, WN, WB, WQ, WK, WB, WN, WR]
  for (let file = 0; file < 8; file += 1) {
    sq[file] = back[file] ?? 0
    sq[8 + file] = WP
    sq[48 + file] = BP
    sq[56 + file] = (back[file] ?? 0) + 8
  }
  return { sq, side: 0, castle: 15, ep: -1, half: 0 }
}

export function toPos(pub: Pub): Pos {
  return {
    sq: Uint8Array.from(pub.sq),
    side: pub.side,
    castle: pub.castle,
    ep: pub.ep,
    half: pub.half,
  }
}

export function fromPos(pos: Pos): Pub {
  return {
    sq: Array.from(pos.sq),
    side: pos.side,
    castle: pos.castle,
    ep: pos.ep,
    half: pos.half,
  }
}

export function playMove(pub: Pub, move: Move): Pub {
  const pos = toPos(pub)
  make(pos, move)
  return fromPos(pos)
}

export function colorOf(piece: number): number {
  if (piece === 0) return -1
  return piece < 9 ? 0 : 1
}

export function sqName(sq: number): string {
  return "abcdefgh"[sq % 8] + String(Math.floor(sq / 8) + 1)
}

export function sameMove(a: Move, b: Move): boolean {
  return a.from === b.from && a.to === b.to && a.promo === b.promo && a.kind === b.kind
}

function step(from: number, df: number, dr: number): number {
  const file = (from % 8) + df
  const rank = Math.floor(from / 8) + dr
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return -1
  return rank * 8 + file
}

function findKing(pos: Pos, side: number): number {
  const king = side === 0 ? WK : BK
  for (let sq = 0; sq < 64; sq += 1) if (pos.sq[sq] === king) return sq
  return -1
}

function slideHits(pos: Pos, from: number, dirs: readonly (readonly [number, number])[], attacker: number): boolean {
  for (const [df, dr] of dirs) {
    let sq = from
    for (;;) {
      sq = step(sq, df, dr)
      if (sq < 0) break
      const piece = pos.sq[sq] ?? 0
      if (piece === 0) continue
      if (piece === attacker) return true
      break
    }
  }
  return false
}

export function isAttacked(pos: Pos, sq: number, bySide: number): boolean {
  const pawn = bySide === 0 ? WP : BP
  const pawnDir = bySide === 0 ? -1 : 1
  for (const df of [-1, 1]) {
    const from = step(sq, df, pawnDir)
    if (from >= 0 && pos.sq[from] === pawn) return true
  }
  const knight = bySide === 0 ? WN : BN
  for (const [df, dr] of KNIGHT) {
    const from = step(sq, df, dr)
    if (from >= 0 && pos.sq[from] === knight) return true
  }
  const king = bySide === 0 ? WK : BK
  for (const [df, dr] of KING) {
    const from = step(sq, df, dr)
    if (from >= 0 && pos.sq[from] === king) return true
  }
  if (slideHits(pos, sq, BISHOP, bySide === 0 ? WB : BB)) return true
  if (slideHits(pos, sq, ROOK, bySide === 0 ? WR : BR)) return true
  if (slideHits(pos, sq, BISHOP, bySide === 0 ? WQ : BQ)) return true
  if (slideHits(pos, sq, ROOK, bySide === 0 ? WQ : BQ)) return true
  return false
}

function pushQuiet(list: Move[], from: number, to: number, promo = 0, kind = 0) {
  list.push({ from, to, promo, kind })
}

function addSlider(pos: Pos, list: Move[], from: number, dirs: readonly (readonly [number, number])[], side: number) {
  for (const [df, dr] of dirs) {
    let sq = from
    for (;;) {
      sq = step(sq, df, dr)
      if (sq < 0) break
      const piece = pos.sq[sq] ?? 0
      if (piece === 0) {
        pushQuiet(list, from, sq)
        continue
      }
      if (colorOf(piece) !== side) pushQuiet(list, from, sq, 0, 1)
      break
    }
  }
}

function addPawn(pos: Pos, list: Move[], from: number, side: number) {
  const dir = side === 0 ? 1 : -1
  const startRank = side === 0 ? 1 : 6
  const promoRank = side === 0 ? 7 : 0
  const one = step(from, 0, dir)
  if (one >= 0 && pos.sq[one] === 0) {
    if (Math.floor(one / 8) === promoRank) {
      for (const promo of [WQ, WR, WB, WN]) pushQuiet(list, from, one, promo & 7)
    } else {
      pushQuiet(list, from, one)
      if (Math.floor(from / 8) === startRank) {
        const two = step(one, 0, dir)
        if (two >= 0 && pos.sq[two] === 0) pushQuiet(list, from, two)
      }
    }
  }
  for (const df of [-1, 1]) {
    const to = step(from, df, dir)
    if (to < 0) continue
    const piece = pos.sq[to] ?? 0
    if (piece !== 0 && colorOf(piece) !== side) {
      if (Math.floor(to / 8) === promoRank) {
        for (const promo of [WQ, WR, WB, WN]) pushQuiet(list, from, to, promo & 7, 1)
      } else {
        pushQuiet(list, from, to, 0, 1)
      }
    }
    if (to === pos.ep) pushQuiet(list, from, to, 0, 2)
  }
}

function castleMoves(pos: Pos, list: Move[], side: number) {
  if (isAttacked(pos, findKing(pos, side), 1 - side)) return
  if (side === 0) {
    if ((pos.castle & 1) !== 0 && pos.sq[5] === 0 && pos.sq[6] === 0 && !isAttacked(pos, 5, 1) && !isAttacked(pos, 6, 1)) {
      pushQuiet(list, 4, 6, 0, 3)
    }
    if ((pos.castle & 2) !== 0 && pos.sq[1] === 0 && pos.sq[2] === 0 && pos.sq[3] === 0 && !isAttacked(pos, 3, 1) && !isAttacked(pos, 2, 1)) {
      pushQuiet(list, 4, 2, 0, 3)
    }
  } else {
    if ((pos.castle & 4) !== 0 && pos.sq[61] === 0 && pos.sq[62] === 0 && !isAttacked(pos, 61, 0) && !isAttacked(pos, 62, 0)) {
      pushQuiet(list, 60, 62, 0, 3)
    }
    if ((pos.castle & 8) !== 0 && pos.sq[57] === 0 && pos.sq[58] === 0 && pos.sq[59] === 0 && !isAttacked(pos, 59, 0) && !isAttacked(pos, 58, 0)) {
      pushQuiet(list, 60, 58, 0, 3)
    }
  }
}

export function pseudoMoves(pos: Pos): Move[] {
  const list: Move[] = []
  const side = pos.side
  for (let sq = 0; sq < 64; sq += 1) {
    const piece = pos.sq[sq] ?? 0
    if (piece === 0 || colorOf(piece) !== side) continue
    const type = piece & 7
    if (type === 1) addPawn(pos, list, sq, side)
    else if (type === 2) {
      for (const [df, dr] of KNIGHT) {
        const to = step(sq, df, dr)
        if (to < 0) continue
        const hit = pos.sq[to] ?? 0
        if (hit === 0) pushQuiet(list, sq, to)
        else if (colorOf(hit) !== side) pushQuiet(list, sq, to, 0, 1)
      }
    } else if (type === 3) addSlider(pos, list, sq, BISHOP, side)
    else if (type === 4) addSlider(pos, list, sq, ROOK, side)
    else if (type === 5) {
      addSlider(pos, list, sq, BISHOP, side)
      addSlider(pos, list, sq, ROOK, side)
    } else if (type === 6) {
      for (const [df, dr] of KING) {
        const to = step(sq, df, dr)
        if (to < 0) continue
        const hit = pos.sq[to] ?? 0
        if (hit === 0) pushQuiet(list, sq, to)
        else if (colorOf(hit) !== side) pushQuiet(list, sq, to, 0, 1)
      }
    }
  }
  castleMoves(pos, list, side)
  return list
}

export function make(pos: Pos, move: Move): Undo {
  const undo: Undo = {
    captured: pos.sq[move.to] ?? 0,
    castle: pos.castle,
    ep: pos.ep,
    half: pos.half,
    epCap: -1,
    rookFrom: -1,
    rookTo: -1,
  }
  const piece = pos.sq[move.from] ?? 0
  if (move.kind === 2) {
    const capSq = move.to + (pos.side === 0 ? -8 : 8)
    undo.captured = pos.sq[capSq] ?? 0
    undo.epCap = capSq
    pos.sq[capSq] = 0
    pos.sq[move.to] = piece
  } else if (move.promo) {
    pos.sq[move.to] = pos.side === 0 ? move.promo : 8 + move.promo
  } else {
    pos.sq[move.to] = piece
  }
  pos.sq[move.from] = 0
  if (move.kind === 3) {
    const rookFrom = move.to > move.from ? move.to + 1 : move.to - 2
    const rookTo = move.to > move.from ? move.to - 1 : move.to + 1
    pos.sq[rookTo] = pos.sq[rookFrom] ?? 0
    pos.sq[rookFrom] = 0
    undo.rookFrom = rookFrom
    undo.rookTo = rookTo
  }
  let castle = pos.castle
  if (piece === WK) castle &= ~3
  if (piece === BK) castle &= ~12
  if (move.from === 7 || move.to === 7) castle &= ~1
  if (move.from === 0 || move.to === 0) castle &= ~2
  if (move.from === 63 || move.to === 63) castle &= ~4
  if (move.from === 56 || move.to === 56) castle &= ~8
  pos.castle = castle
  pos.ep = -1
  if ((piece & 7) === 1 && Math.abs(move.to - move.from) === 16) pos.ep = (move.from + move.to) >> 1
  const captured = move.kind === 2 || (pos.sq[move.to] !== 0 && move.from !== move.to)
  if ((piece & 7) === 1 || undo.captured !== 0) pos.half = 0
  else pos.half += 1
  void captured
  pos.side = 1 - pos.side
  return undo
}

export function unmake(pos: Pos, move: Move, undo: Undo) {
  pos.side = 1 - pos.side
  if (move.kind === 3 && undo.rookFrom >= 0) {
    pos.sq[undo.rookFrom] = pos.sq[undo.rookTo] ?? 0
    pos.sq[undo.rookTo] = 0
  }
  const pawn = pos.side === 0 ? WP : BP
  if (move.kind === 2) {
    pos.sq[move.to] = 0
    pos.sq[undo.epCap] = undo.captured
    pos.sq[move.from] = pawn
  } else {
    pos.sq[move.from] = move.promo ? pawn : (pos.sq[move.to] ?? 0)
    pos.sq[move.to] = undo.captured
  }
  pos.castle = undo.castle
  pos.ep = undo.ep
  pos.half = undo.half
}

export function legalMoves(pos: Pos): Move[] {
  const moves = pseudoMoves(pos)
  const out: Move[] = []
  for (const move of moves) {
    const undo = make(pos, move)
    const king = findKing(pos, 1 - pos.side)
    const safe = king >= 0 && !isAttacked(pos, king, pos.side)
    unmake(pos, move, undo)
    if (safe) out.push(move)
  }
  return out
}

export function inCheck(pos: Pos): boolean {
  const king = findKing(pos, pos.side)
  return king >= 0 && isAttacked(pos, king, 1 - pos.side)
}

export function outcome(pos: Pos): "play" | "mate" | "draw" {
  if (legalMoves(pos).length > 0) return pos.half >= 100 ? "draw" : "play"
  return inCheck(pos) ? "mate" : "draw"
}

export function perft(pos: Pos, depth: number): number {
  if (depth === 0) return 1
  let total = 0
  for (const move of legalMoves(pos)) {
    const undo = make(pos, move)
    total += depth === 1 ? 1 : perft(pos, depth - 1)
    unmake(pos, move, undo)
  }
  return total
}

export function moveName(pos: Pos, move: Move, all: readonly Move[] = []): string {
  if (move.kind === 3) return move.to > move.from ? "O-O" : "O-O-O"
  const piece = pos.sq[move.from] ?? 0
  const type = piece & 7
  const dest = sqName(move.to)
  const promo = move.promo ? `=${["", "", "N", "B", "R", "Q"][move.promo] ?? ""}` : ""
  const capture = move.kind === 1 || move.kind === 2
  if (type === 1) {
    const file = "abcdefgh"[move.from % 8] ?? ""
    return `${capture ? `${file}x` : ""}${dest}${promo}`
  }
  const letter = ["", "", "N", "B", "R", "Q", "K"][type] ?? ""
  const twins = all.filter((item) => item !== move && item.to === move.to && ((pos.sq[item.from] ?? 0) & 7) === type)
  let dis = ""
  if (twins.length > 0) {
    const fileClash = twins.some((item) => item.from % 8 === move.from % 8)
    const rankClash = twins.some((item) => Math.floor(item.from / 8) === Math.floor(move.from / 8))
    const file = "abcdefgh"[move.from % 8] ?? ""
    const rank = String(Math.floor(move.from / 8) + 1)
    dis = !fileClash ? file : !rankClash ? rank : file + rank
  }
  return `${letter}${dis}${capture ? "x" : ""}${dest}${promo}`
}
