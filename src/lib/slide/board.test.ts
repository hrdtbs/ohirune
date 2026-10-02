import assert from "node:assert/strict"
import test from "node:test"
import {
  inversionCount,
  isSolvable,
  isSolved,
  moveByDirection,
  moveTile,
  shuffledBoard,
  solvedBoard,
} from "./board"

test("a solved board is solvable and solved", () => {
  for (const size of [3, 4, 5]) {
    const tiles = solvedBoard(size)
    assert.equal(isSolved(tiles), true)
    assert.equal(isSolvable(size, tiles), true)
  }
})

test("one inversion on an odd board is unsolvable", () => {
  const tiles = solvedBoard(3)
  const first = tiles[0]
  tiles[0] = tiles[1] ?? -1
  tiles[1] = first ?? -1
  assert.equal(inversionCount(tiles), 1)
  assert.equal(isSolvable(3, tiles), false)
})

test("shuffled boards stay solvable", () => {
  let seed = 7
  const rng = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  for (const size of [3, 4, 5]) {
    for (let i = 0; i < 20; i += 1) {
      const tiles = shuffledBoard(size, rng)
      assert.equal(tiles.length, size * size)
      assert.equal(isSolvable(size, tiles), true)
      assert.equal(isSolved(tiles), false)
    }
  }
})

test("only orthogonal tiles slide into the blank", () => {
  const tiles = solvedBoard(3)
  assert.equal(moveTile(3, tiles, 0), null)
  const moved = moveTile(3, tiles, 7)
  assert.ok(moved)
  assert.equal(moved[8], 7)
  assert.equal(moved[7], -1)
  const left = moveByDirection(3, moved, "left")
  assert.ok(left)
  assert.equal(left[8], -1)
})
