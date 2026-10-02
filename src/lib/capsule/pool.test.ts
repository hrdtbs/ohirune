import assert from "node:assert/strict"
import test from "node:test"
import { applyPull, dayKey, decodeCapsule, drawFigure, FIGURES, pullPoints, recordOwned } from "./pool"

test("a zero roll lands on the first figure and a full roll on the last", () => {
  assert.equal(drawFigure(() => 0).id, FIGURES[0]?.id)
  assert.equal(drawFigure(() => 0.999999).id, FIGURES[FIGURES.length - 1]?.id)
})

test("a new day restores one ticket and keeps the catalog", () => {
  const raw = JSON.stringify({ day: "2020-01-01", tickets: 0, owned: ["en", "hoshi"] })
  const next = decodeCapsule(raw, "2026-09-29")
  assert.equal(next.tickets, 1)
  assert.deepEqual(next.owned, ["en", "hoshi"])
  assert.equal(decodeCapsule(raw, "2020-01-01").tickets, 0)
})

test("a pull spends a ticket and records a new figure once", () => {
  const state = { day: dayKey(new Date(2026, 8, 29)), tickets: 1, owned: ["en"] }
  const again = applyPull(state, FIGURES[0]!)
  assert.equal(again.known, true)
  assert.deepEqual(again.save.owned, ["en"])
  assert.equal(again.save.tickets, 0)
  const fresh = applyPull(state, FIGURES[10]!)
  assert.equal(fresh.known, false)
  assert.deepEqual(fresh.save.owned, ["en", "juuji"])
})

test("a round pays rarer figures more, and a repeat pays half", () => {
  assert.equal(pullPoints("common", false), 1)
  assert.equal(pullPoints("legend", false), 20)
  assert.equal(pullPoints("rare", true), 4)
  assert.deepEqual(recordOwned(["en"], "en"), ["en"])
  assert.deepEqual(recordOwned(["en"], "hoshi"), ["en", "hoshi"])
})

test("figures are geometric names", () => {
  assert.deepEqual(
    FIGURES.map((figure) => figure.name),
    ["円", "方", "三角", "菱", "棒", "点", "環", "格子", "波", "弧", "十字", "星", "六角", "渦", "日輪", "月輪"],
  )
})
