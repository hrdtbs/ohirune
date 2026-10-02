import assert from "node:assert/strict"
import test from "node:test"
import {
  addBond,
  addPerson,
  bendFrom,
  bondDraw,
  commit,
  control,
  diagramSvg,
  history,
  parseDiagram,
  removePerson,
  sampleDiagram,
  undo,
} from "./model"

test("a sample is a triangle with a cluster and a note", () => {
  const diagram = sampleDiagram()
  assert.equal(diagram.people.length, 3)
  assert.equal(diagram.bonds.length, 3)
  assert.equal(diagram.clusters[0]?.members.length, 2)
  assert.equal(diagram.margins[0]?.links[0]?.kind, "bond")
  const svg = diagramSvg(diagram, "#1c1a16").svg
  assert.match(svg, /甲/)
  assert.match(svg, /好き/)
})

test("removing a person drops their bonds", () => {
  const diagram = sampleDiagram()
  const next = removePerson(diagram, "p1")
  assert.equal(next.people.length, 2)
  assert.equal(next.bonds.some((bond) => bond.from === "p1" || bond.to === "p1"), false)
})

test("a bend pulls the curve off the straight line", () => {
  const straight = control({ x: 0, y: 0 }, { x: 100, y: 0 }, 0)
  const bent = control({ x: 0, y: 0 }, { x: 100, y: 0 }, 1)
  assert.equal(straight.y, 0)
  assert.ok(Math.abs(bent.y) > 40)
  const draw = bondDraw({ x: 0, y: 0 }, { x: 200, y: 0 }, 0.8, "wave")
  assert.match(draw.d, /^M/)
  assert.ok(bendFrom({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 80 }) > 0)
})

test("undo restores the diagram before the commit", () => {
  let hist = history(sampleDiagram())
  const added = addPerson(hist.present, { x: 10, y: 10 })
  hist = commit(hist, added)
  assert.equal(hist.present.people.length, 4)
  hist = undo(hist)
  assert.equal(hist.present.people.length, 3)
})

test("a second bond between the same pair is refused", () => {
  const diagram = sampleDiagram()
  assert.equal(addBond(diagram, "p1", "p2"), null)
  const next = addBond(diagram, "p2", "p1")
  assert.ok(next)
  assert.equal(next?.bonds.length, 4)
})

test("a saved file can be read back", () => {
  const diagram = sampleDiagram()
  const parsed = parseDiagram(JSON.stringify(diagram))
  assert.equal(parsed?.people[0]?.name, "甲")
  assert.equal(parseDiagram("nope"), null)
})
