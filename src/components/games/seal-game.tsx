"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Frame, Stat } from "@/components/frame"
import { certificateSvg, extendSequence, prefixMatches, SEAL_PADS } from "@/lib/seal/sequence"
import { saveIfBetter, useRecord } from "@/lib/storage"

type Phase = "show" | "input" | "over"

function Shape({ id }: { id: number }) {
  if (id === 0) return <circle cx="32" cy="32" r="14" fill="none" stroke="currentColor" strokeWidth="1.6" />
  if (id === 1) return <rect x="18" y="18" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" />
  if (id === 2) return <path d="M32 16 L48 46 H16 Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
  if (id === 3) return <path d="M32 14 L50 32 L32 50 L14 32 Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
  if (id === 4) {
    return (
      <polygon
        points="32,14 46,22 46,42 32,50 18,42 18,22"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    )
  }
  return <path d="M32 16 V48 M16 32 H48" fill="none" stroke="currentColor" strokeWidth="1.6" />
}

export function SealGame() {
  const [sequence, setSequence] = useState<number[]>(() => extendSequence([]))
  const [phase, setPhase] = useState<Phase>("show")
  const [lit, setLit] = useState<number | null>(null)
  const [pressed, setPressed] = useState<number | null>(null)
  const [cursor, setCursor] = useState(0)
  const best = useRecord("ohirune.seal")
  const reached = sequence.length - 1

  useEffect(() => {
    if (phase !== "show") return
    const timers: number[] = []
    sequence.forEach((pad, index) => {
      timers.push(window.setTimeout(() => setLit(pad), index * 680))
      timers.push(window.setTimeout(() => setLit(null), index * 680 + 380))
    })
    timers.push(
      window.setTimeout(() => {
        setLit(null)
        setPhase("input")
      }, sequence.length * 680 + 180),
    )
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [phase, sequence])

  function tap(id: number) {
    if (phase !== "input") return
    setPressed(id)
    window.setTimeout(() => setPressed((value) => (value === id ? null : value)), 160)
    const next = [...sequence.slice(0, cursor), id]
    if (!prefixMatches(next, sequence)) {
      saveIfBetter("ohirune.seal", sequence.length - 1, (value, prev) => value > prev)
      setPhase("over")
      return
    }
    if (next.length === sequence.length) {
      setCursor(0)
      setSequence((current) => extendSequence(current))
      setPhase("show")
      return
    }
    setCursor(next.length)
  }

  function restart() {
    setCursor(0)
    setPressed(null)
    setLit(null)
    setSequence(extendSequence([]))
    setPhase("show")
  }

  function download() {
    const svg = certificateSvg(sequence.length - 1)
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }))
    const link = document.createElement("a")
    link.href = url
    link.download = "ohirune-seal.svg"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Frame index="06" name="SEAL">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
        <div className="flex gap-6">
          <Stat label="到達" value={String(Math.max(0, reached))} />
          <Stat label="最高" value={best === null ? "—" : String(best)} />
        </div>
        <div className="flex gap-2">
          {phase === "over" && sequence.length - 1 >= 6 ? (
            <Button type="button" className="h-10 px-4" onClick={download}>
              証
            </Button>
          ) : null}
          <Button type="button" variant="outline" className="h-10 px-4" onClick={restart}>
            新規
          </Button>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-md flex-1 grid-cols-3 content-center gap-3 sm:gap-4">
        {SEAL_PADS.map((pad) => {
          const on = lit === pad.id || pressed === pad.id
          return (
            <button
              key={pad.id}
              type="button"
              aria-label={pad.name}
              onClick={() => tap(pad.id)}
              className={`grid aspect-square place-items-center border transition-colors ${
                on ? "border-primary bg-primary text-primary-foreground" : "border-white/15 bg-card text-foreground"
              }`}
            >
              <svg viewBox="0 0 64 64" className="size-16">
                <Shape id={pad.id} />
              </svg>
            </button>
          )
        })}
      </div>
      <p className="pt-4 text-center font-mono text-xs tracking-[0.28em] text-primary">
        {phase === "over" ? "BREAK" : ""}
      </p>
    </Frame>
  )
}
