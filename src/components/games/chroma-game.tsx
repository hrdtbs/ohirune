"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Frame, Stat } from "@/components/frame"
import { hslCss, matchScore, randomTarget, type Hsl } from "@/lib/chroma/match"
import { saveIfBetter, useRecord } from "@/lib/storage"

const ROUNDS = 5

export function ChromaGame() {
  const [round, setRound] = useState(1)
  const [target, setTarget] = useState<Hsl>(() => randomTarget())
  const [guess, setGuess] = useState<Hsl>({ h: 180, s: 50, l: 50 })
  const [locked, setLocked] = useState(false)
  const [shown, setShown] = useState(false)
  const [scores, setScores] = useState<number[]>([])
  const best = useRecord("ohirune.chroma")

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [])
  const done = scores.length >= ROUNDS
  const total = scores.reduce((sum, score) => sum + score, 0)
  const current = matchScore(target, guess)

  function lock() {
    if (locked || done) return
    const nextScores = [...scores, current]
    setScores(nextScores)
    setLocked(true)
    if (nextScores.length >= ROUNDS) {
      const sum = nextScores.reduce((acc, score) => acc + score, 0)
      saveIfBetter("ohirune.chroma", sum, (value, prev) => value > prev)
    }
  }

  function next() {
    if (done) {
      setRound(1)
      setScores([])
      setTarget(randomTarget())
      setGuess({ h: 180, s: 50, l: 50 })
      setLocked(false)
      return
    }
    setRound((value) => value + 1)
    setTarget(randomTarget())
    setLocked(false)
  }

  function setChannel(key: keyof Hsl, value: number) {
    if (locked) return
    setGuess((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Frame index="05" name="CHROMA">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
        <div className="flex gap-6">
          <Stat label="回" value={done ? `${ROUNDS}/${ROUNDS}` : `${round}/${ROUNDS}`} />
          <Stat label="得点" value={String(total)} />
          <Stat label="最高" value={best === null ? "—" : String(best)} />
        </div>
        <Button type="button" className="h-10 px-4" onClick={locked || done ? next : lock}>
          {done ? "新規" : locked ? "次" : "決定"}
        </Button>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8">
        <div className="flex items-center justify-center gap-8">
          <div className="text-center">
            <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">見本</div>
            <div
              className="mt-2 size-28 rounded-full border border-white/10 sm:size-36"
              style={{ background: shown ? hslCss(target) : "#1c1a16" }}
            />
          </div>
          <div className="text-center">
            <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">調色</div>
            <div className="mt-2 size-28 rounded-full border border-white/10 sm:size-36" style={{ background: hslCss(guess) }} />
          </div>
        </div>

        <div className="space-y-4">
          {(
            [
              ["色相", "h", 0, 360],
              ["彩度", "s", 0, 100],
              ["明度", "l", 0, 100],
            ] as const
          ).map(([label, key, min, max]) => (
            <label key={key} className="grid grid-cols-[3rem_1fr_2.5rem] items-center gap-3 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <Slider
                min={min}
                max={max}
                step={1}
                value={[guess[key]]}
                disabled={locked || done}
                onValueChange={(value) => setChannel(key, value[0] ?? min)}
              />
              <span className="text-right font-mono text-xs tabular-nums">{guess[key]}</span>
            </label>
          ))}
        </div>
        <p className="text-center font-mono text-xs tracking-[0.28em] text-primary">
          {locked || done ? String(done ? total : scores[scores.length - 1]) : ""}
        </p>
      </div>
    </Frame>
  )
}
