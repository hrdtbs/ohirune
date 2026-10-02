import type { Game } from "./freecell"
import { analyze, type SolitaireAnalysis } from "./search"

type Incoming =
  | { type: "analyze"; id: number; game: Game; timeMs: number; maxDepth: number }
  | { type: "stop" }

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
    game: message.game,
    timeMs: message.timeMs,
    maxDepth: message.maxDepth,
    onProgress: (analysis: SolitaireAnalysis) => {
      if (!cancelled && activeId === message.id) {
        globalThis.postMessage({ type: "progress", id: message.id, analysis })
      }
    },
  })
  if (!cancelled && activeId === message.id) {
    globalThis.postMessage({ type: "done", id: message.id, analysis: result })
  }
}
