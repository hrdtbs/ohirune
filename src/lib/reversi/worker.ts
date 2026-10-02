import { analyze, type Analysis } from "./search"

type Incoming =
  | {
      type: "analyze"
      id: number
      black: string
      white: string
      side: 0 | 1
      timeMs: number
      maxDepth: number
    }
  | { type: "stop" }

type Outgoing = {
  type: "progress" | "done"
  id: number
  analysis: Analysis
}

let cancelled = false
let activeId = 0

globalThis.onmessage = (event: MessageEvent<Incoming>) => {
  const message = event.data
  if (!message) return
  if (message.type === "stop") {
    cancelled = true
    return
  }
  if (message.type !== "analyze") return

  cancelled = false
  activeId = message.id
  const result = analyze({
    black: BigInt(message.black),
    white: BigInt(message.white),
    side: message.side,
    timeMs: message.timeMs,
    maxDepth: message.maxDepth,
    onProgress: (analysis) => {
      if (!cancelled && activeId === message.id) {
        const payload: Outgoing = { type: "progress", id: message.id, analysis }
        globalThis.postMessage(payload)
      }
    },
  })
  if (!cancelled && activeId === message.id) {
    const payload: Outgoing = { type: "done", id: message.id, analysis: result }
    globalThis.postMessage(payload)
  }
}
