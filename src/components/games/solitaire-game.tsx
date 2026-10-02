"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Frame, Stat } from "@/components/frame"
import { apply, cardName, deal, isRed, legalMoves, moveName, won, type Card, type Game, type Move } from "@/lib/solitaire/freecell"
import { formatSolitaireScore, type SolitaireAnalysis } from "@/lib/solitaire/search"

type Mode = "play" | "read"
type LevelId = "short" | "mid" | "deep"
type Sel = { from: Move["from"]; col: number; index: number }
type Note = { type: "progress" | "done"; id: number; analysis: SolitaireAnalysis }

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), state | 1)
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const LEVELS = [
  { id: "short", label: "短", timeMs: 400, maxDepth: 3 },
  { id: "mid", label: "中", timeMs: 1000, maxDepth: 5 },
  { id: "deep", label: "深", timeMs: 1800, maxDepth: 7 },
] as const

function Suit({ suit }: { suit: number }) {
  const common = { viewBox: "0 0 16 16", className: "h-3 w-3", "aria-hidden": true as const }
  if (suit === 0) return <svg {...common}><path d="M8 2 L14 13 H2 Z" fill="currentColor" /></svg>
  if (suit === 1) return <svg {...common}><circle cx="5.5" cy="6" r="3" fill="currentColor" /><circle cx="10.5" cy="6" r="3" fill="currentColor" /><path d="M8 14 L4 7 H12 Z" fill="currentColor" /></svg>
  if (suit === 2) return <svg {...common}><path d="M8 1 L15 8 L8 15 L1 8 Z" fill="currentColor" /></svg>
  return <svg {...common}><circle cx="8" cy="5" r="2.4" fill="currentColor" /><circle cx="4.6" cy="9" r="2.4" fill="currentColor" /><circle cx="11.4" cy="9" r="2.4" fill="currentColor" /></svg>
}

function Face({ card, mark }: { card: Card; mark?: { rank: number; score: number } | null }) {
  return (
    <span className={`relative flex h-14 w-full flex-col items-start justify-between rounded-[2px] border bg-[#1a1914] px-1 py-1 ${isRed(card) ? "border-primary/80 text-primary" : "border-[#f4f0e6]/50 text-[#f4f0e6]"}`}>
      <span className="font-mono text-[10px] leading-none">{cardName(card).slice(1)}</span>
      <Suit suit={card.suit} />
      {mark ? <span className="absolute top-0.5 right-0.5 font-mono text-[9px] leading-none text-primary">{mark.rank}</span> : null}
    </span>
  )
}

export function SolitaireGame() {
  const [mode, setMode] = useState<Mode>("play")
  const [level, setLevel] = useState<LevelId>("mid")
  const [stack, setStack] = useState<Game[]>(() => [deal(mulberry32(20261001))])
  const [sel, setSel] = useState<Sel | null>(null)
  const [reading, setReading] = useState<{ key: string; analysis: SolitaireAnalysis; busy: boolean } | null>(null)
  const game = stack[stack.length - 1] ?? deal()
  const legal = won(game) ? [] : legalMoves(game)
  const preset = LEVELS.find((item) => item.id === level) ?? LEVELS[1]
  const key = JSON.stringify({ columns: game.columns, free: game.free, found: game.found, level })
  const analysis = mode === "read" && reading?.key === key ? reading.analysis : null
  const busy = mode === "read" && (reading?.key !== key || reading.busy)

  useEffect(() => {
    if (mode !== "read" || won(game)) return
    const worker = new Worker(new URL("../../lib/solitaire/worker.ts", import.meta.url), { type: "module" })
    const id = stack.length
    let alive = true
    worker.onmessage = (event: MessageEvent<Note>) => {
      if (!alive || event.data?.id !== id) return
      setReading({ key, analysis: event.data.analysis, busy: event.data.type !== "done" })
    }
    worker.postMessage({ type: "analyze", id, game, timeMs: preset.timeMs, maxDepth: preset.maxDepth })
    return () => {
      alive = false
      worker.terminate()
    }
  }, [game, key, mode, preset.maxDepth, preset.timeMs, stack.length])

  function play(move: Move) {
    setStack((prev) => [...prev, apply(prev[prev.length - 1] ?? game, move)])
    setSel(null)
  }

  function choose(next: Sel) {
    if (sel && sel.from === next.from && sel.col === next.col && sel.index === next.index) {
      setSel(null)
      return
    }
    const hits = legal.filter((move) => move.from === next.from && move.col === next.col && move.index === next.index)
    if (hits.length === 0) {
      setSel(null)
      return
    }
    if (hits.length === 1 && hits[0]) {
      play(hits[0])
      return
    }
    setSel(next)
  }

  function aim(to: Move["to"], target: number) {
    if (!sel) return
    const move = legal.find((item) => item.from === sel.from && item.col === sel.col && item.index === sel.index && item.to === to && item.target === target)
    if (move) play(move)
    else setSel(null)
  }

  const marks = new Map<string, { rank: number; score: number }>()
  analysis?.candidates.forEach((candidate, index) => {
    const id = `${candidate.from}:${candidate.col}:${candidate.index}`
    if (!marks.has(id)) marks.set(id, { rank: index + 1, score: candidate.score })
  })
  const done = won(game)

  return (
    <Frame index="14" name="SOLITAIRE">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-5">
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <Stat label="台" value={String(game.found.reduce((sum, rank) => sum + rank, 0))} />
          <Stat label="置" value={String(game.free.filter((card) => card !== null).length)} />
          {mode === "read" ? <Stat label="最善" value={analysis?.candidates[0]?.name || (busy ? "…" : "—")} /> : null}
          {mode === "read" ? <Stat label="評価" value={analysis ? formatSolitaireScore(analysis.score) : "…"} /> : null}
          {mode === "read" ? <Stat label="深さ" value={analysis ? `${analysis.depth}${busy ? "…" : ""}` : "…"} /> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant={mode === "play" ? "default" : "outline"} className="h-10 px-3" onClick={() => setMode("play")}>
            遊ぶ
          </Button>
          <Button type="button" variant={mode === "read" ? "default" : "outline"} className="h-10 px-3" onClick={() => setMode("read")}>
            読む
          </Button>
          <Button variant="outline" className="h-10 px-3" asChild>
            <Link href="/play/solitaire/guide">解説</Link>
          </Button>
          {LEVELS.map((item) => (
            <Button key={item.id} type="button" variant={item.id === level ? "default" : "outline"} className="h-10 px-3" onClick={() => setLevel(item.id)}>
              {item.label}
            </Button>
          ))}
          <Button type="button" variant="outline" className="h-10 px-3" disabled={stack.length <= 1} onClick={() => { setStack((prev) => prev.slice(0, -1)); setSel(null) }}>
            戻す
          </Button>
          <Button type="button" variant="outline" className="h-10 px-3" onClick={() => { setStack([deal()]); setSel(null) }}>
            配る
          </Button>
        </div>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div>
          <div className="mb-4 grid grid-cols-8 gap-1">
            {game.free.map((card, index) => (
              <button key={`free-${index}`} type="button" aria-label={card ? cardName(card) : "空き"} onClick={() => (card ? choose({ from: "free", col: index, index: 0 }) : aim("free", index))} className="min-h-14">
                {card ? <Face card={card} mark={marks.get(`free:${index}:0`)} /> : <span className="block h-14 rounded-[2px] border border-dashed border-white/20" />}
              </button>
            ))}
            {game.found.map((rank, suit) => {
              const card = rank > 0 ? { suit, rank } : null
              return (
                <button key={`found-${suit}`} type="button" aria-label={`${suit} 台`} onClick={() => aim("found", suit)} className="min-h-14">
                  {card ? <Face card={card} /> : <span className="flex h-14 items-center justify-center rounded-[2px] border border-dashed border-white/20 text-white/30"><Suit suit={suit} /></span>}
                </button>
              )
            })}
          </div>
          <div className="grid grid-cols-8 gap-1">
            {game.columns.map((column, col) => (
              <div
                key={col}
                className="relative"
                style={{ height: column.length === 0 ? "3.5rem" : `${(column.length - 1) * 1.75 + 3.5}rem` }}
              >
                {column.length === 0 ? (
                  <button type="button" aria-label={`${col + 1}列`} onClick={() => aim("column", col)} className="block h-14 w-full rounded-[2px] border border-dashed border-white/20" />
                ) : (
                  column.map((card, index) => {
                    const selected = sel?.from === "column" && sel.col === col && sel.index === index
                    return (
                      <button
                        key={`${col}-${index}-${card.suit}-${card.rank}`}
                        type="button"
                        aria-label={cardName(card)}
                        onClick={() => {
                          const target = legal.find((move) => sel && move.from === sel.from && move.col === sel.col && move.index === sel.index && move.to === "column" && move.target === col)
                          if (target && !(sel?.from === "column" && sel.col === col)) play(target)
                          else choose({ from: "column", col, index })
                        }}
                        className={`absolute inset-x-0 h-14 ${selected ? "ring-2 ring-primary ring-inset" : ""}`}
                        style={{ top: `${index * 1.75}rem`, zIndex: selected ? 20 : index }}
                      >
                        <Face card={card} mark={marks.get(`column:${col}:${index}`)} />
                      </button>
                    )
                  })
                )}
              </div>
            ))}
          </div>
        </div>
        {mode === "read" ? (
          <ol className="flex max-h-[70dvh] flex-col gap-1 overflow-auto" aria-label="候補">
            {(analysis?.candidates ?? []).slice(0, 24).map((candidate, index) => (
              <li key={`${candidate.from}-${candidate.col}-${candidate.index}-${candidate.to}-${candidate.target}-${candidate.count}`}>
                <button
                  type="button"
                  onClick={() => play(candidate)}
                  className={`flex h-10 w-full items-center gap-3 px-3 font-mono text-sm tabular-nums ${index === 0 ? "bg-primary/15 text-primary" : "hover:bg-white/5"}`}
                >
                  <span className="w-4 text-muted-foreground">{index + 1}</span>
                  <span className="truncate">{candidate.name || moveName(game, candidate)}</span>
                  <span className="ml-auto">{formatSolitaireScore(candidate.score)}</span>
                </button>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
      <p className="pt-4 text-center font-mono text-xs tracking-[0.28em] text-primary">{done ? "完" : legal.length === 0 ? "止" : ""}</p>
    </Frame>
  )
}
