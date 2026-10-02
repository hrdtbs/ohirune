import assert from "node:assert/strict"
import test from "node:test"
import { RoomBook } from "./room"

function rng(seed: number) {
  let state = seed
  return () => {
    state = (state * 48271) % 2147483647
    return state / 2147483647
  }
}

test("a guest receives the host signal and not their own", () => {
  const book = new RoomBook(() => 0, rng(3))
  const host = book.create("reversi")
  const guest = book.join("reversi", host.code)
  assert.equal(guest !== "missing" && guest !== "full" && guest !== "closed" && guest.role, "guest")
  if (guest === "missing" || guest === "full" || guest === "closed") return
  assert.equal(book.signal(host.code, host.token, { kind: "offer", data: "sdp" }), "ok")
  assert.equal(book.signal(host.code, guest.token, { kind: "answer", data: "back" }), "ok")
  const seen = book.read(host.code, guest.token, 0)
  assert.notEqual(seen, "missing")
  assert.notEqual(seen, "forbidden")
  if (seen === "missing" || seen === "forbidden") return
  assert.deepEqual(seen.events.map((event) => event.signal.kind), ["offer"])
  assert.equal(seen.peer, true)
  const echoed = book.read(host.code, host.token, 0)
  if (echoed === "missing" || echoed === "forbidden") return
  assert.deepEqual(echoed.events.map((event) => event.signal.kind), ["answer"])
})

test("a second guest is turned away and a bad code is missing", () => {
  const book = new RoomBook(() => 0, rng(5))
  const host = book.create("reversi")
  assert.equal(book.join("reversi", "nope"), "missing")
  assert.notEqual(book.join("reversi", host.code.toLowerCase()), "missing")
  assert.equal(book.join("reversi", host.code), "full")
})

test("two people waiting are seated on opposite colors", () => {
  const book = new RoomBook(() => 0, rng(7))
  const first = book.wait("reversi")
  assert.ok("token" in first && !("code" in first))
  if (!("token" in first)) return
  const second = book.wait("reversi")
  assert.ok("code" in second && second.role === "guest" && second.color === 1)
  const host = book.claim(first.token)
  assert.ok(host)
  assert.equal(host?.role, "host")
  assert.equal(host?.color, 0)
  assert.equal(host?.code, "code" in second ? second.code : "")
})

test("leaving closes the room for the other seat", () => {
  const book = new RoomBook(() => 0, rng(9))
  const host = book.create("reversi")
  const guest = book.join("reversi", host.code)
  if (guest === "missing" || guest === "full" || guest === "closed") return
  book.leave(host.code, host.token)
  const poll = book.read(host.code, guest.token, 0)
  assert.notEqual(poll, "missing")
  assert.notEqual(poll, "forbidden")
  if (poll === "missing" || poll === "forbidden") return
  assert.equal(poll.gone, true)
})
