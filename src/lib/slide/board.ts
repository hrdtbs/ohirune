export type SlideDir = "left" | "right" | "up" | "down"

export function solvedBoard(size: number): number[] {
  const tiles: number[] = []
  const last = size * size
  for (let i = 0; i < last - 1; i += 1) tiles.push(i)
  tiles.push(-1)
  return tiles
}

export function inversionCount(tiles: number[]): number {
  let count = 0
  for (let i = 0; i < tiles.length; i += 1) {
    const a = tiles[i]
    if (a === undefined || a === -1) continue
    for (let j = i + 1; j < tiles.length; j += 1) {
      const b = tiles[j]
      if (b === undefined || b === -1) continue
      if (a > b) count += 1
    }
  }
  return count
}

/** Blank row counted from the bottom, starting at 1. */
export function blankRowFromBottom(size: number, tiles: number[]): number {
  const blank = tiles.indexOf(-1)
  const rowFromTop = Math.floor(blank / size)
  return size - rowFromTop
}

export function isSolvable(size: number, tiles: number[]): boolean {
  const inversions = inversionCount(tiles)
  if (size % 2 === 1) return inversions % 2 === 0
  const fromBottom = blankRowFromBottom(size, tiles)
  if (fromBottom % 2 === 1) return inversions % 2 === 0
  return inversions % 2 === 1
}

export function isSolved(tiles: number[]): boolean {
  for (let i = 0; i < tiles.length - 1; i += 1) {
    if (tiles[i] !== i) return false
  }
  return tiles[tiles.length - 1] === -1
}

function shuffleInPlace(tiles: number[], rng: () => number): void {
  for (let i = tiles.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    const current = tiles[i]
    tiles[i] = tiles[j] ?? -1
    tiles[j] = current ?? -1
  }
}

export function shuffledBoard(size: number, rng: () => number = Math.random): number[] {
  const tiles = solvedBoard(size)
  for (let attempt = 0; attempt < 80; attempt += 1) {
    shuffleInPlace(tiles, rng)
    if (isSolvable(size, tiles) && !isSolved(tiles)) return tiles.slice()
  }
  return tiles.slice()
}

export function sourceCell(size: number, tile: number): { row: number; col: number } {
  return { row: Math.floor(tile / size), col: tile % size }
}

/** Slide every tile between the chosen cell and the blank. One gesture. */
export function moveTile(size: number, tiles: number[], index: number): number[] | null {
  const blank = tiles.indexOf(-1)
  if (blank < 0 || index === blank || index < 0 || index >= tiles.length) return null
  const br = Math.floor(blank / size)
  const bc = blank % size
  const r = Math.floor(index / size)
  const c = index % size
  if (r !== br && c !== bc) return null

  const next = tiles.slice()
  if (r === br) {
    const step = c > bc ? 1 : -1
    for (let col = bc; col !== c; col += step) {
      next[r * size + col] = next[r * size + col + step] ?? -1
    }
  } else {
    const step = r > br ? 1 : -1
    for (let row = br; row !== r; row += step) {
      next[row * size + c] = next[(row + step) * size + c] ?? -1
    }
  }
  next[index] = -1
  return next
}

export function moveByDirection(
  size: number,
  tiles: number[],
  dir: SlideDir,
): number[] | null {
  const blank = tiles.indexOf(-1)
  const row = Math.floor(blank / size)
  const col = blank % size
  let tileRow = row
  let tileCol = col
  if (dir === "left") tileCol = col + 1
  if (dir === "right") tileCol = col - 1
  if (dir === "up") tileRow = row + 1
  if (dir === "down") tileRow = row - 1
  if (tileRow < 0 || tileCol < 0 || tileRow >= size || tileCol >= size) return null
  return moveTile(size, tiles, tileRow * size + tileCol)
}
