"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Frame, Stat } from "@/components/frame"
import { arcanaScore, dealSeven, flashMs, type ArcanaCard } from "@/lib/arcana/deck"
import { saveIfBetter, useRecord } from "@/lib/storage"

const ROUNDS = 5

type Phase = "boot" | "flash" | "play" | "open" | "done"

function Mark({ id }: { id: number }) {
  const spokes = (id % 6) + 3
  const rings = Math.floor(id / 6) + 1
  return (
    <svg viewBox="0 0 80 80" className="h-14 w-14" aria-hidden>
      {Array.from({ length: rings }, (_, index) => (
        <circle
          key={index}
          cx="40"
          cy="40"
          r={12 + index * 8}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      ))}
      {Array.from({ length: spokes }, (_, index) => {
        const angle = (Math.PI * 2 * index) / spokes - Math.PI / 2
        const x = 40 + Math.cos(angle) * 28
        const y = 40 + Math.sin(angle) * 28
        return <line key={index} x1="40" y1="40" x2={x} y2={y} stroke="currentColor" strokeWidth="1.2" />
      })}
      {id % 2 === 0 ? <rect x="33" y="33" width="14" height="14" fill="none" stroke="currentColor" /> : null}
    </svg>
  )
}

export function ArcanaGame() {
  const [round, setRound] = useState(1)
  const [phase, setPhase] = useState<Phase>("boot")
  const [cards, setCards] = useState<ArcanaCard[]>(() => dealSeven())
  const [gone, setGone] = useState<number[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [total, setTotal] = useState(0)
  const [gained, setGained] = useState<number | null>(null)
  const best = useRecord("ohirune.arcana")

  const live = cards.filter((card) => !gone.includes(card.id))

  useEffect(() => {
    if (phase !== "boot") return
    const id = requestAnimationFrame(() => setPhase("flash"))
    return () => cancelAnimationFrame(id)
  }, [phase])

  useEffect(() => {
    if (phase !== "flash") return
    const timer = window.setTimeout(() => setPhase("play"), flashMs(round))
    return () => window.clearTimeout(timer)
  }, [phase, round, cards])

  function discard() {
    if (phase !== "play" || selected === null || live.length <= 1) return
    setGone((prev) => [...prev, selected])
    setSelected(null)
  }

  function openCard(id = selected) {
    if (phase !== "play" || id === null) return
    const card = cards.find((item) => item.id === id)
    if (!card || gone.includes(card.id)) return
    const points = arcanaScore(card.id, card.reversed)
    setSelected(id)
    setGained(points)
    setTotal((value) => value + points)
    setPhase("open")
  }

  function nextRound() {
    if (round >= ROUNDS) {
      saveIfBetter("ohirune.arcana", total, (value, prev) => value > prev)
      setPhase("done")
      return
    }
    setRound((value) => value + 1)
    setCards(dealSeven())
    setGone([])
    setSelected(null)
    setGained(null)
    setPhase("flash")
  }

  function restart() {
    setRound(1)
    setCards(dealSeven())
    setGone([])
    setSelected(null)
    setTotal(0)
    setGained(null)
    setPhase("flash")
  }

  return (
    <Frame index="03" name="ARCANA">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-5">
        <div className="flex gap-6">
          <Stat label="回" value={`${round}/${ROUNDS}`} />
          <Stat label="得点" value={String(total)} />
          <Stat label="最高" value={best === null ? "—" : String(best)} />
        </div>
        <div className="flex gap-2">
          {phase === "play" ? (
            <>
              <Button type="button" variant="outline" className="h-10 px-4" onClick={discard} disabled={selected === null || live.length <= 1}>
                捨てる
              </Button>
              <Button type="button" className="h-10 px-4" onClick={() => openCard()} disabled={selected === null}>
                開く
              </Button>
            </>
          ) : null}
          {phase === "open" ? (
            <Button type="button" className="h-10 px-4" onClick={nextRound}>
              {round >= ROUNDS ? "結果" : "次"}
            </Button>
          ) : null}
          {phase === "done" ? (
            <Button type="button" variant="outline" className="h-10 px-4" onClick={restart}>
              新規
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        {phase === "done" ? (
          <p className="font-mono text-5xl tabular-nums tracking-tight">{total}</p>
        ) : (
          <ul className="flex max-w-full flex-wrap items-center justify-center gap-3">
            {live.map((card) => {
              const face = phase === "flash" || (phase === "open" && card.id === selected)
              const active = selected === card.id
              return (
                <li key={card.id}>
                  <button
                    type="button"
                    aria-label={face ? `${card.id} ${card.name}` : "札"}
                    disabled={phase !== "play"}
                    onClick={() => setSelected(card.id)}
                    onDoubleClick={() => openCard(card.id)}
                    className={`h-44 w-[6.6rem] border text-[#f4f0e6] sm:h-52 sm:w-32 ${
                      active ? "border-primary" : "border-white/15"
                    }`}
                    style={{
                      backgroundColor: face ? "#17150f" : "#1a1814",
                      backgroundImage: face
                        ? undefined
                        : "linear-gradient(45deg, transparent 47%, rgba(228,177,90,0.75) 48%, rgba(228,177,90,0.75) 52%, transparent 53%), linear-gradient(-45deg, transparent 47%, rgba(228,177,90,0.45) 48%, rgba(228,177,90,0.45) 52%, transparent 53%)",
                      backgroundSize: "14px 14px",
                    }}
                  >
                    {face ? (
                      <span className="flex h-full flex-col items-center justify-between px-2 py-3">
                        <span className="flex w-full items-center justify-between font-mono text-xs tabular-nums">
                          <span>{String(card.id).padStart(2, "0")}</span>
                          <span className={card.reversed ? "text-primary" : "text-muted-foreground"}>
                            {card.reversed ? "逆" : "正"}
                          </span>
                        </span>
                        <span className={card.reversed ? "rotate-180" : ""}>
                          <Mark id={card.id} />
                        </span>
                        <span className="text-sm tracking-widest">{card.name}</span>
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <p className="h-8 pt-4 text-center font-mono text-xs tracking-[0.28em] text-primary">
          {phase === "open" && gained !== null ? `+${gained}` : ""}
        </p>
      </div>
    </Frame>
  )
}
