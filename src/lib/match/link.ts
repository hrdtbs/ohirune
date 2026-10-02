import type { Seat, Signal } from "@/lib/match/room"

export type { Seat }

const ICE: RTCConfiguration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] }

type Handlers = {
  onMessage: (text: string) => void
  onDown: () => void
}

export type MatchLink = {
  code: string
  color: 0 | 1
  ready: Promise<void>
  send: (text: string) => void
  close: () => void
}

async function post(body: unknown, signal?: AbortSignal) {
  const res = await fetch("/api/match", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  })
  const data = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new Error(data.error ?? "失敗")
  return data
}

export async function takeSeat(
  input: { game: string; op: "create" | "join" | "wait"; code?: string },
  signal: AbortSignal,
): Promise<Seat> {
  if (input.op !== "wait") {
    return (await post({ op: input.op, game: input.game, code: input.code }, signal)) as Seat
  }
  let token = ""
  let seated = false
  try {
    while (!signal.aborted) {
      if (!token) {
        const data = (await post({ op: "wait", game: input.game }, signal)) as Seat & { token?: string }
        if (data.code) {
          seated = true
          return data
        }
        token = data.token ?? ""
      }
      const res = await fetch(`/api/match?wait=${encodeURIComponent(token)}`, { signal })
      const data = (await res.json()) as Seat & { waiting?: boolean }
      if (data.code) {
        seated = true
        return data
      }
    }
    throw new DOMException("aborted", "AbortError")
  } finally {
    if (!seated && token) void post({ op: "leave", token }).catch(() => undefined)
  }
}

export function startLink(seat: Seat, handlers: Handlers, signal: AbortSignal): MatchLink {
  let since = 0
  let peer = false
  let sawPeer = false
  let unlocked = false
  let offered = false
  let pc: RTCPeerConnection | null = null
  let channel: RTCDataChannel | null = null
  let channelOpen = false
  let quiet = false
  let down = false
  const ice: RTCIceCandidateInit[] = []
  let resolveReady!: () => void
  let rejectReady!: (error: Error) => void
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve
    rejectReady = reject
  })
  ready.catch(() => undefined)

  function finish() {
    if (down || unlocked || !sawPeer) return
    unlocked = true
    resolveReady()
  }

  function peerArrived() {
    if (sawPeer) return
    sawPeer = true
    window.setTimeout(finish, 4500)
  }

  function fail() {
    if (quiet || down) return
    down = true
    pc?.close()
    handlers.onDown()
    rejectReady(new Error("切断"))
  }

  function stop() {
    quiet = true
    down = true
    signal.removeEventListener("abort", stop)
    pc?.close()
    rejectReady(new Error("切断"))
    if (seat.code) void post({ op: "leave", code: seat.code, token: seat.token }).catch(() => undefined)
  }

  signal.addEventListener("abort", stop)

  async function sendSignal(body: Signal) {
    if (signal.aborted || quiet) return
    await post({ op: "signal", code: seat.code, token: seat.token, signal: body }).catch(() => undefined)
  }

  function flushIce() {
    if (!pc?.remoteDescription) return
    for (const candidate of ice.splice(0)) void pc.addIceCandidate(candidate).catch(() => undefined)
  }

  function bind(next: RTCDataChannel) {
    channel = next
    next.onopen = () => {
      channelOpen = true
      finish()
    }
    next.onmessage = (event) => handlers.onMessage(String(event.data))
    next.onclose = () => {
      if (channelOpen) fail()
    }
  }

  async function offer() {
    if (offered || down) return
    offered = true
    pc = new RTCPeerConnection(ICE)
    bind(pc.createDataChannel("play"))
    pc.onicecandidate = (event) => {
      if (event.candidate) void sendSignal({ kind: "ice", data: JSON.stringify(event.candidate.toJSON()) })
    }
    const desc = await pc.createOffer()
    await pc.setLocalDescription(desc)
    await sendSignal({ kind: "offer", data: desc.sdp ?? "" })
  }

  async function answer(sdp: string) {
    if (pc || down) return
    pc = new RTCPeerConnection(ICE)
    pc.ondatachannel = (event) => bind(event.channel)
    pc.onicecandidate = (event) => {
      if (event.candidate) void sendSignal({ kind: "ice", data: JSON.stringify(event.candidate.toJSON()) })
    }
    await pc.setRemoteDescription({ type: "offer", sdp })
    flushIce()
    const desc = await pc.createAnswer()
    await pc.setLocalDescription(desc)
    await sendSignal({ kind: "answer", data: desc.sdp ?? "" })
  }

  async function onSignal(body: Signal) {
    if (body.kind === "move") handlers.onMessage(body.data)
    if (body.kind === "bye") fail()
    if (body.kind === "offer") await answer(body.data)
    if (body.kind === "answer" && pc) {
      await pc.setRemoteDescription({ type: "answer", sdp: body.data })
      flushIce()
    }
    if (body.kind === "ice") {
      const candidate = JSON.parse(body.data) as RTCIceCandidateInit
      if (!pc?.remoteDescription) ice.push(candidate)
      else await pc.addIceCandidate(candidate).catch(() => undefined)
    }
  }

  if (seat.role === "guest") peerArrived()

  void (async () => {
    while (!signal.aborted && !down) {
      const controller = new AbortController()
      const onParent = () => controller.abort()
      signal.addEventListener("abort", onParent)
      const timer = window.setTimeout(() => controller.abort(), 20_000)
      try {
        const need = seat.role === "host" && !peer ? "1" : "0"
        const res = await fetch(
          `/api/match?code=${seat.code}&token=${encodeURIComponent(seat.token)}&since=${since}&need=${need}`,
          { signal: controller.signal },
        )
        const data = (await res.json()) as {
          since?: number
          peer?: boolean
          gone?: boolean
          events?: { signal: Signal }[]
        }
        if (!res.ok) {
          fail()
          return
        }
        if (typeof data.since === "number") since = data.since
        if (data.peer) {
          peer = true
          peerArrived()
        }
        if (data.gone) {
          fail()
          return
        }
        for (const event of data.events ?? []) await onSignal(event.signal)
        if (seat.role === "host" && peer) await offer()
      } catch {
        if (signal.aborted || down) return
      } finally {
        window.clearTimeout(timer)
        signal.removeEventListener("abort", onParent)
      }
    }
  })()

  return {
    code: seat.code,
    color: seat.color,
    ready,
    send(text: string) {
      if (channel?.readyState === "open") channel.send(text)
      else void sendSignal({ kind: "move", data: text })
    },
    close() {
      void sendSignal({ kind: "bye", data: "" })
      stop()
    },
  }
}
