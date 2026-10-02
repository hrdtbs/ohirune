import assert from "node:assert/strict"
import test from "node:test"
import {
  BLACK,
  afterMove,
  flipsAt,
  legalMoves,
  mineOf,
  perft,
  play,
  popcnt,
  squaresOf,
  startPosition,
} from "./board"
import { parseSquare, squareName } from "./notation"
import { analyze } from "./search"

test("opening moves and the first capture match standard reversi", () => {
  const start = startPosition()
  const opening = squaresOf(legalMoves(start.black, start.white))
    .map(squareName)
    .sort()
    .join(",")
  assert.equal(popcnt(legalMoves(start.black, start.white)), 4)
  assert.equal(opening, "C4,D3,E6,F5")

  const c4 = parseSquare("C4")
  assert.ok(c4 !== null)
  assert.equal(popcnt(flipsAt(c4, start.black, start.white)), 1)
  const played = play(start.black, start.white, c4)
  assert.ok(played)
  const [black, white] = played
  assert.equal(popcnt(black), 4)
  assert.equal(popcnt(white), 1)
  const replies = squaresOf(legalMoves(white, black)).map(squareName).sort().join(",")
  assert.equal(replies, "C3,C5,E3")
})

test("perft counts the opening tree", () => {
  const start = startPosition()
  const counts = [0, 4, 12, 56, 244]
  for (let depth = 1; depth <= 4; depth += 1) {
    assert.equal(perft(start.black, start.white, depth), counts[depth])
  }
})

test("the search stays on a legal opening move", () => {
  const start = startPosition()
  const analysis = analyze({
    black: start.black,
    white: start.white,
    side: BLACK,
    timeMs: 400,
    maxDepth: 4,
  })
  assert.ok(analysis.bestName)
  assert.ok(["C4", "D3", "E6", "F5"].includes(analysis.bestName ?? ""))
  assert.equal(analysis.candidates[0]?.name, analysis.bestName)
  for (let i = 1; i < analysis.candidates.length; i += 1) {
    assert.ok((analysis.candidates[i - 1]?.score ?? 0) >= (analysis.candidates[i]?.score ?? 0))
  }
  assert.equal(analysis.pv[0], analysis.bestName)

  const depths: number[] = []
  analyze({
    black: start.black,
    white: start.white,
    side: BLACK,
    timeMs: 400,
    maxDepth: 3,
    onProgress: (step) => depths.push(step.depth),
  })
  assert.ok(depths.length > 4)
  assert.ok(depths.some((depth, index) => index > 0 && depth >= depths[index - 1]))
  const c4 = parseSquare("C4")
  assert.ok(c4 !== null)
  const next = afterMove(start.black, start.white, BLACK, c4)
  assert.ok(next)
  assert.equal(mineOf(next.black, next.white, next.side), next.white)
})
