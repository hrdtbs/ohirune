import assert from "node:assert/strict"
import test from "node:test"
import { callPoints, drawWeighted, parseGroups } from "./draw"

test("blank lines and duplicate names are dropped", () => {
  const entries = parseGroups([
    { name: "甲", weight: 2, text: "青\n\n朱\n青" },
    { name: "乙", weight: 1, text: "朱\n灰" },
  ])
  assert.deepEqual(
    entries.map((entry) => entry.name),
    ["青", "朱", "灰"],
  )
  assert.equal(entries[0]?.weight, 2)
  assert.equal(entries[2]?.group, "乙")
})

test("a correct call pays more for a lighter group", () => {
  assert.equal(callPoints(1), 12)
  assert.equal(callPoints(2), 6)
  assert.equal(callPoints(0), 0)
})

test("weights decide the draw and winners leave the pool", () => {
  const entries = parseGroups([
    { name: "甲", weight: 1, text: "青" },
    { name: "乙", weight: 3, text: "朱" },
  ])
  assert.equal(drawWeighted(entries, new Set(), () => 0.1)?.name, "青")
  assert.equal(drawWeighted(entries, new Set(), () => 0.9)?.name, "朱")
  assert.equal(drawWeighted(entries, new Set(["青", "朱"]), () => 0.2), null)
  assert.equal(drawWeighted([], new Set(), () => 0.2), null)
})
