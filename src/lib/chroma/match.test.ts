import assert from "node:assert/strict"
import test from "node:test"
import { matchScore, randomTarget } from "./match"

test("an exact mix scores 100", () => {
  const color = { h: 200, s: 60, l: 48 }
  assert.equal(matchScore(color, color), 100)
})

test("hue wraps around the wheel", () => {
  const near = matchScore({ h: 2, s: 50, l: 50 }, { h: 358, s: 50, l: 50 })
  const far = matchScore({ h: 2, s: 50, l: 50 }, { h: 180, s: 50, l: 50 })
  assert.ok(near > 90)
  assert.ok(far < near)
})

test("targets stay in a readable range", () => {
  let seed = 11
  const rng = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  for (let i = 0; i < 30; i += 1) {
    const color = randomTarget(rng)
    assert.ok(color.h >= 0 && color.h < 360)
    assert.ok(color.s >= 42 && color.s <= 89)
    assert.ok(color.l >= 32 && color.l <= 67)
  }
})
