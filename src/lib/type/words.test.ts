import assert from "node:assert/strict"
import test from "node:test"
import { kanaToRomaji, matchesReading, resultBand, TYPE_SECONDS, WORDS } from "./words"

test("a round lasts one minute", () => {
  assert.equal(TYPE_SECONDS, 60)
})

test("long marks and small tsu follow the kana", () => {
  assert.equal(kanaToRomaji("ねこ"), "neko")
  assert.equal(kanaToRomaji("はむすたー"), "hamusutaa")
  assert.equal(kanaToRomaji("くっきー"), "kukkii")
  assert.equal(kanaToRomaji("ちょこれーと"), "chokoreeto")
  assert.equal(kanaToRomaji("きゃんでぃ"), "kyandi")
  assert.equal(kanaToRomaji("ぱきゅぱきゅ"), "pakyupakyu")
})

test("kunrei completes a shown reading", () => {
  assert.equal(matchesReading("tyokoreeto", "chokoreeto"), true)
  assert.equal(matchesReading("huwahuwa", "fuwafuwa"), true)
})

test("character count sets the result band", () => {
  assert.equal(resultBand(360), "上")
  assert.equal(resultBand(240), "中")
  assert.equal(resultBand(239), "下")
})

test("every word is kana with a reading", () => {
  assert.equal(WORDS.length, 40)
  assert.equal(WORDS[0], "うさぎ")
  for (const word of WORDS) assert.ok(kanaToRomaji(word).length > 0)
})
