import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import path from "node:path"
import test from "node:test"
import { DECK, POSITIONS, drawThree } from "./deck"

function rngFrom(seed: number) {
  let state = seed
  return () => {
    state = (state * 48271) % 2147483647
    return state / 2147483647
  }
}

test("the deck is 78 distinct plates", () => {
  assert.equal(DECK.length, 78)
  assert.equal(new Set(DECK.map((card) => card.id)).size, 78)
  assert.equal(new Set(DECK.map((card) => card.src)).size, 78)
  for (const card of DECK) {
    assert.ok(card.name.length > 0)
    assert.ok(card.upright.length > 0)
    assert.notEqual(card.upright, card.reversed)
    const file = path.join(process.cwd(), "public", card.src.replace(/^\//, ""))
    assert.ok(existsSync(file), card.src)
  }
})

test("a spread is three different cards in past, present, future", () => {
  assert.deepEqual(
    POSITIONS.map((position) => position.label),
    ["過去", "現在", "未来"],
  )
  const spread = drawThree(rngFrom(11))
  assert.equal(spread.length, 3)
  assert.equal(new Set(spread.map((draw) => draw.card.id)).size, 3)
  for (const draw of spread) {
    assert.equal(typeof draw.reversed, "boolean")
  }
})

test("the same seed deals the same spread", () => {
  const left = drawThree(rngFrom(29)).map((draw) => [draw.card.id, draw.reversed])
  const right = drawThree(rngFrom(29)).map((draw) => [draw.card.id, draw.reversed])
  assert.deepEqual(left, right)
  const other = drawThree(rngFrom(31)).map((draw) => draw.card.id)
  assert.notDeepEqual(
    left.map((item) => item[0]),
    other,
  )
})
