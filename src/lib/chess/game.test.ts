import assert from "node:assert/strict"
import test from "node:test"
import { legalMoves, moveName, perft, playMove, sqName, startPub, toPos, type Move } from "./game"

function find(name: string, moves: Move[], pos = toPos(startPub())): Move {
  const found = moves.find((move) => moveName(pos, move, moves) === name || `${sqName(move.from)}${sqName(move.to)}` === name)
  assert.ok(found, name)
  return found
}

test("the opening has the twenty legal pawn and knight moves", () => {
  const pos = toPos(startPub())
  const moves = legalMoves(pos)
  assert.equal(moves.length, 20)
  assert.ok(moves.some((move) => sqName(move.from) === "e2" && sqName(move.to) === "e4"))
  assert.equal(moves.some((move) => sqName(move.from) === "e2" && sqName(move.to) === "e5"), false)
})

test("perft counts the opening tree", () => {
  const pos = toPos(startPub())
  assert.equal(perft(pos, 1), 20)
  assert.equal(perft(pos, 2), 400)
  assert.equal(perft(pos, 3), 8902)
})

test("a pawn move leaves black to play", () => {
  const moves = legalMoves(toPos(startPub()))
  const next = playMove(startPub(), find("e4", moves))
  assert.equal(next.side, 1)
  assert.equal(next.ep, 20)
})
