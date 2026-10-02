import assert from "node:assert/strict"
import test from "node:test"
import { hintFor, missEnds, pickAnswer, timeRank } from "./round"

test("the answer is one of 1 through 20", () => {
  assert.equal(pickAnswer(() => 0), 1)
  assert.equal(pickAnswer(() => 0.999), 20)
})

test("the fourth miss ends the round", () => {
  assert.equal(missEnds(2), false)
  assert.equal(missEnds(3), true)
})

test("a low guess is small and a high guess is large", () => {
  assert.equal(hintFor(4, 10), "small")
  assert.equal(hintFor(12, 10), "large")
})

test("clear time is banded at 5, 8, and 20 seconds", () => {
  assert.equal(timeRank(4.9), "速")
  assert.equal(timeRank(5), "良")
  assert.equal(timeRank(8), "可")
  assert.equal(timeRank(20), "遅")
})
