import assert from "node:assert/strict"
import test from "node:test"
import { apply, cardName, deal, legalMoves, won, type Game } from "./freecell"
import { analyze } from "./search"

function card(suit: number, rank: number) {
  return { suit, rank }
}

test("a deal uses each card once", () => {
  const game = deal(() => 0.5)
  const names = game.columns.flat().map(cardName)
  assert.equal(names.length, 52)
  assert.equal(new Set(names).size, 52)
  assert.equal(game.free.length, 4)
  assert.deepEqual(game.found, [0, 0, 0, 0])
})

test("an ace can leave for the foundation and a suited build stacks down", () => {
  const game: Game = {
    columns: [[card(1, 2), card(0, 1)], [card(0, 3)], [], [], [], [], [], []],
    free: [null, null, null, null],
    found: [0, 0, 0, 0],
  }
  const moves = legalMoves(game)
  const toFound = moves.find((move) => move.to === "found" && move.col === 0 && move.index === 1)
  assert.ok(toFound)
  const built = apply(game, toFound)
  assert.equal(built.found[0], 1)
  const onto = legalMoves(built).find((move) => move.from === "column" && move.col === 0 && move.index === 0 && move.to === "column" && move.target === 1)
  assert.ok(onto)
  const stacked = apply(built, onto)
  assert.equal(stacked.columns[1]?.map(cardName).join(","), "S3,H2")
})

test("the same color cannot stack and four cells fill up", () => {
  const game: Game = {
    columns: [[card(0, 5)], [card(3, 6)], [], [], [], [], [], []],
    free: [card(0, 9), card(1, 9), card(2, 9), card(3, 9)],
    found: [0, 0, 0, 0],
  }
  const moves = legalMoves(game)
  assert.equal(moves.some((move) => move.to === "free"), false)
  assert.equal(moves.some((move) => move.from === "column" && move.col === 0 && move.to === "column" && move.target === 1), false)
})

test("a finished foundation is a win and the search stays on a legal move", () => {
  const game: Game = {
    columns: [[], [], [], [], [], [], [], []],
    free: [null, null, null, null],
    found: [13, 13, 13, 13],
  }
  assert.equal(won(game), true)
  const open = deal(() => 0.2)
  const analysis = analyze({ game: open, timeMs: 200, maxDepth: 2 })
  assert.ok(analysis.best)
  assert.ok(legalMoves(open).some((move) => move.col === analysis.best?.col && move.to === analysis.best?.to && move.target === analysis.best?.target))
})
