import assert from "node:assert/strict"
import test from "node:test"
import { advance, apex, collides, nextGap, speedFor, stepBody, takePassed, type Obstacle } from "./world"

test("a jump rises and returns to the ground", () => {
  let body = stepBody({ y: 0, vy: 0 }, 0.016, true)
  assert.ok(body.y > 0)
  assert.ok(body.vy > 0)
  let peak = body.y
  for (let i = 0; i < 200; i += 1) {
    body = stepBody(body, 0.016, false)
    peak = Math.max(peak, body.y)
  }
  assert.ok(peak > 100)
  assert.ok(peak < apex() + 5)
  assert.equal(body.y, 0)
  assert.equal(body.vy, 0)
})

test("air time does not accept another jump", () => {
  const rising = stepBody({ y: 40, vy: 200 }, 0.016, true)
  assert.ok(rising.vy < 200)
})

test("speed rises with cleared obstacles and then holds", () => {
  assert.equal(speedFor(0), 260)
  assert.ok(speedFor(4) > speedFor(0))
  assert.equal(speedFor(100), 560)
})

test("gaps shrink as the score rises but stay playable", () => {
  assert.equal(nextGap(0, () => 0), 240)
  assert.ok(nextGap(0, () => 1) > nextGap(10, () => 1))
  assert.ok(nextGap(40, () => 1) >= 320)
})

test("obstacles move with speed and score once they pass the player", () => {
  const moved = advance([{ id: 1, x: 200, kind: "small", scored: false }], 0.1, 100)
  assert.equal(moved[0]?.x, 190)
  const passed = takePassed([{ id: 2, x: 30, kind: "small", scored: false }], 56)
  assert.equal(passed.gained, 1)
  assert.equal(passed.obstacles[0]?.scored, true)
  assert.equal(takePassed(passed.obstacles, 56).gained, 0)
})

test("a standing player hits an obstacle and a high jump clears it", () => {
  const obstacle: Obstacle = { id: 1, x: 70, kind: "large", scored: false }
  assert.equal(collides(240, 0, [obstacle]), true)
  assert.equal(collides(240, 120, [obstacle]), false)
  assert.equal(collides(240, 0, [{ id: 2, x: 400, kind: "small", scored: false }]), false)
})
