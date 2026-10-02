export type Role = "host" | "guest"

export type Signal = {
  kind: "offer" | "answer" | "ice" | "move" | "bye"
  data: string
}

export type Seat = {
  code: string
  token: string
  role: Role
  color: 0 | 1
}

export type Poll = {
  since: number
  peer: boolean
  gone: boolean
  events: { seq: number; signal: Signal }[]
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const ROOM_TTL = 2 * 60 * 60 * 1000
const WAIT_TTL = 3 * 60 * 1000
const MAX_EVENTS = 500
const MAX_DATA = 16_000

type Event = { seq: number; from: Role; signal: Signal }

type Room = {
  code: string
  game: string
  hostToken: string
  guestToken: string | null
  events: Event[]
  seq: number
  closed: boolean
  touched: number
}

type Waiter = { token: string; game: string; touched: number }

export class RoomBook {
  private rooms = new Map<string, Room>()
  private waiters: Waiter[] = []
  private paired = new Map<string, Seat>()
  private roomWait = new Map<string, Set<() => void>>()
  private seatWait = new Map<string, Set<() => void>>()

  constructor(
    private now: () => number = () => Date.now(),
    private random: () => number = Math.random,
  ) {}

  create(game: string): Seat {
    this.sweep()
    const room = this.make(game, this.token())
    return { code: room.code, token: room.hostToken, role: "host", color: 0 }
  }

  join(game: string, code: string): Seat | "missing" | "full" | "closed" {
    this.sweep()
    const room = this.rooms.get(code.trim().toUpperCase())
    if (!room || room.game !== game) return "missing"
    if (room.closed) return "closed"
    if (room.guestToken) return "full"
    room.guestToken = this.token()
    room.touched = this.now()
    this.wake(this.roomWait, room.code)
    return { code: room.code, token: room.guestToken, role: "guest", color: 1 }
  }

  wait(game: string): Seat | { token: string } {
    this.sweep()
    const other = this.waiters.find((waiter) => waiter.game === game)
    if (!other) {
      const token = this.token()
      this.waiters.push({ token, game, touched: this.now() })
      return { token }
    }
    this.waiters = this.waiters.filter((waiter) => waiter !== other)
    const room = this.make(game, other.token)
    const guestToken = this.token()
    room.guestToken = guestToken
    const host: Seat = { code: room.code, token: room.hostToken, role: "host", color: 0 }
    this.paired.set(other.token, host)
    this.wake(this.seatWait, other.token)
    this.wake(this.roomWait, room.code)
    return { code: room.code, token: guestToken, role: "guest", color: 1 }
  }

  claim(token: string): Seat | null {
    return this.paired.get(token) ?? null
  }

  signal(code: string, token: string, signal: Signal): "ok" | "missing" | "forbidden" | "closed" {
    const room = this.rooms.get(code)
    if (!room) return "missing"
    const role = this.roleOf(room, token)
    if (!role) return "forbidden"
    if (room.closed) return "closed"
    if (signal.data.length > MAX_DATA) return "forbidden"
    room.seq += 1
    room.events.push({ seq: room.seq, from: role, signal })
    if (room.events.length > MAX_EVENTS) room.events.splice(0, room.events.length - MAX_EVENTS)
    if (signal.kind === "bye") room.closed = true
    room.touched = this.now()
    this.wake(this.roomWait, room.code)
    return "ok"
  }

  read(code: string, token: string, since: number): Poll | "missing" | "forbidden" {
    const room = this.rooms.get(code)
    if (!room) return "missing"
    const role = this.roleOf(room, token)
    if (!role) return "forbidden"
    room.touched = this.now()
    return {
      since: room.seq,
      peer: room.guestToken !== null,
      gone: room.closed,
      events: room.events.filter((event) => event.seq > since && event.from !== role).map((event) => ({
        seq: event.seq,
        signal: event.signal,
      })),
    }
  }

  leave(code: string, token: string) {
    const room = this.rooms.get(code)
    if (!room) return
    if (!this.roleOf(room, token)) return
    room.closed = true
    room.touched = this.now()
    this.wake(this.roomWait, room.code)
  }

  cancelWait(token: string) {
    const next = this.waiters.filter((waiter) => waiter.token !== token)
    if (next.length !== this.waiters.length) {
      this.waiters = next
      return
    }
    const seat = this.paired.get(token)
    if (seat) this.leave(seat.code, seat.token)
  }

  listenRoom(code: string, fn: () => void): () => void {
    return this.listen(this.roomWait, code, fn)
  }

  listenSeat(token: string, fn: () => void): () => void {
    return this.listen(this.seatWait, token, fn)
  }

  private listen(map: Map<string, Set<() => void>>, key: string, fn: () => void) {
    let set = map.get(key)
    if (!set) map.set(key, (set = new Set()))
    set.add(fn)
    return () => set.delete(fn)
  }

  private wake(map: Map<string, Set<() => void>>, key: string) {
    for (const fn of [...(map.get(key) ?? [])]) fn()
  }

  private make(game: string, hostToken: string): Room {
    let code = this.code()
    while (this.rooms.has(code)) code = this.code()
    const room: Room = {
      code,
      game,
      hostToken,
      guestToken: null,
      events: [],
      seq: 0,
      closed: false,
      touched: this.now(),
    }
    this.rooms.set(code, room)
    return room
  }

  private roleOf(room: Room, token: string): Role | null {
    if (token === room.hostToken) return "host"
    if (token && token === room.guestToken) return "guest"
    return null
  }

  private code(): string {
    let value = ""
    for (let i = 0; i < 4; i += 1) value += ALPHABET[Math.floor(this.random() * ALPHABET.length)]
    return value
  }

  private token(): string {
    let value = ""
    for (let i = 0; i < 24; i += 1) value += ALPHABET[Math.floor(this.random() * ALPHABET.length)]
    return value
  }

  private sweep() {
    const now = this.now()
    for (const [code, room] of this.rooms) {
      if (now - room.touched > ROOM_TTL) this.rooms.delete(code)
    }
    this.waiters = this.waiters.filter((waiter) => now - waiter.touched <= WAIT_TTL)
  }
}

export function hold(ms: number, signal: AbortSignal | undefined, wake: (fn: () => void) => () => void): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(done, ms)
    const stop = wake(done)
    const onAbort = () => done()
    signal?.addEventListener("abort", onAbort)
    function done() {
      clearTimeout(timer)
      stop()
      signal?.removeEventListener("abort", onAbort)
      resolve()
    }
  })
}
