import { RoomBook, hold, type Seat, type Signal } from "@/lib/match/room"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const globalBook = globalThis as { __ohiruneRooms?: RoomBook }

function book(): RoomBook {
  if (!globalBook.__ohiruneRooms) globalBook.__ohiruneRooms = new RoomBook()
  return globalBook.__ohiruneRooms
}

function seat(value: Seat) {
  return Response.json(value)
}

function fail(error: string, status: number) {
  return Response.json({ error }, { status })
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    op?: string
    game?: string
    code?: string
    token?: string
    signal?: Signal
  } | null
  if (!body?.op) return fail("失敗", 400)
  const game = body.game === "reversi" ? "reversi" : ""
  const rooms = book()

  if (body.op === "create") {
    if (!game) return fail("失敗", 400)
    return seat(rooms.create(game))
  }
  if (body.op === "join") {
    if (!game || !body.code) return fail("失敗", 400)
    const joined = rooms.join(game, body.code)
    if (joined === "missing" || joined === "closed") return fail("部屋がない", 404)
    if (joined === "full") return fail("満室", 409)
    return seat(joined)
  }
  if (body.op === "wait") {
    if (!game) return fail("失敗", 400)
    const waited = rooms.wait(game)
    return Response.json(waited)
  }
  if (body.op === "signal") {
    if (!body.code || !body.token || !body.signal?.kind) return fail("失敗", 400)
    const result = rooms.signal(body.code, body.token, { kind: body.signal.kind, data: String(body.signal.data ?? "") })
    if (result === "missing" || result === "closed") return fail("部屋がない", 404)
    if (result === "forbidden") return fail("失敗", 403)
    return Response.json({ ok: true })
  }
  if (body.op === "leave") {
    if (body.token && !body.code) rooms.cancelWait(body.token)
    if (body.code && body.token) rooms.leave(body.code, body.token)
    return Response.json({ ok: true })
  }
  return fail("失敗", 400)
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const rooms = book()
  const wait = url.searchParams.get("wait")
  if (wait) {
    const ready = rooms.claim(wait)
    if (ready) return seat(ready)
    await hold(20_000, req.signal, (fn) => rooms.listenSeat(wait, fn))
    if (req.signal.aborted) return Response.json({ waiting: true })
    return Response.json(rooms.claim(wait) ?? { waiting: true })
  }

  const code = (url.searchParams.get("code") ?? "").toUpperCase()
  const token = url.searchParams.get("token") ?? ""
  const since = Number(url.searchParams.get("since") ?? "0")
  const needPeer = url.searchParams.get("need") === "1"
  const first = rooms.read(code, token, Number.isFinite(since) ? since : 0)
  if (first === "missing") return fail("部屋がない", 404)
  if (first === "forbidden") return fail("失敗", 403)
  if (first.events.length > 0 || first.gone || (needPeer && first.peer)) return Response.json(first)
  await hold(20_000, req.signal, (fn) => rooms.listenRoom(code, fn))
  if (req.signal.aborted) return Response.json(first)
  const next = rooms.read(code, token, Number.isFinite(since) ? since : 0)
  if (next === "missing") return fail("部屋がない", 404)
  if (next === "forbidden") return fail("失敗", 403)
  return Response.json(next)
}
