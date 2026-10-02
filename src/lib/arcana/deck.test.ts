import assert from "node:assert/strict"
import test from "node:test"
import { ARCANA, arcanaScore, dealSeven, flashMs } from "./deck"

test("reversed arcana scores from the far end", () => {
  assert.equal(arcanaScore(0, false), 0)
  assert.equal(arcanaScore(0, true), 21)
  assert.equal(arcanaScore(21, true), 0)
  assert.equal(arcanaScore(6, false), 6)
  assert.equal(arcanaScore(6, true), 15)
})

test("a deal is seven distinct major arcana", () => {
  let seed = 3
  const rng = () => {
    seed = (seed * 48271) % 2147483647
    return seed / 2147483647
  }
  const hand = dealSeven(rng)
  assert.equal(hand.length, 7)
  assert.equal(new Set(hand.map((card) => card.id)).size, 7)
  for (const card of hand) {
    assert.ok(ARCANA.some((entry) => entry.id === card.id))
  }
})

test("later rounds flash for less time", () => {
  assert.ok(flashMs(1) > flashMs(2))
  assert.ok(flashMs(5) > flashMs(8))
  assert.equal(flashMs(20), 900)
})
