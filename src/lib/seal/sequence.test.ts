import assert from "node:assert/strict"
import test from "node:test"
import { certificateSvg, extendSequence, prefixMatches, SEAL_PADS } from "./sequence"

test("sequences grow by one pad", () => {
  const next = extendSequence([], () => 0.99)
  assert.deepEqual(next, [SEAL_PADS.length - 1])
  assert.deepEqual(extendSequence(next, () => 0), [SEAL_PADS.length - 1, 0])
})

test("input must follow the shown prefix", () => {
  assert.equal(prefixMatches([1, 2], [1, 2, 3]), true)
  assert.equal(prefixMatches([1, 0], [1, 2, 3]), false)
})

test("the certificate names the seal and its length", () => {
  const svg = certificateSvg(8)
  assert.match(svg, /OHIRUNE/)
  assert.match(svg, /SEAL/)
  assert.match(svg, /LENGTH 08/)
})
