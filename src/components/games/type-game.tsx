"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Frame, Stat } from "@/components/frame"
import { saveIfBetter, useRecord } from "@/lib/storage"
import {
  isReadingPrefix,
  matchesReading,
  pickWord,
  readingOf,
  resultBand,
  TYPE_SECONDS,
} from "@/lib/type/words"

type Phase = "idle" | "play" | "over"

export function TypeGame() {
  const [phase, setPhase] = useState<Phase>("idle")
  const [word, setWord] = useState("")
  const [buffer, setBuffer] = useState("")
  const [chars, setChars] = useState(0)
  const [words, setWords] = useState(0)
  const [misses, setMisses] = useState(0)
  const [left, setLeft] = useState(TYPE_SECONDS)
  const best = useRecord("ohirune.type")
  const charsRef = useRef(0)
  const leftRef = useRef(TYPE_SECONDS)
  const inputRef = useRef<HTMLInputElement>(null)
  const reading = word ? readingOf(word) : ""

  useEffect(() => {
    if (phase !== "play") return
    const id = window.setInterval(() => {
      if (leftRef.current <= 0) return
      leftRef.current -= 1
      setLeft(leftRef.current)
      if (leftRef.current === 0) {
        setPhase("over")
        saveIfBetter("ohirune.type", charsRef.current, (next, prev) => next > prev)
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (phase === "play") inputRef.current?.focus()
  }, [phase, word])

  const start = useCallback(() => {
    charsRef.current = 0
    setChars(0)
    setWords(0)
    setMisses(0)
    setBuffer("")
    leftRef.current = TYPE_SECONDS
    setLeft(TYPE_SECONDS)
    setWord(pickWord(Math.random))
    setPhase("play")
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.code !== "Space" || phase === "play") return
      event.preventDefault()
      start()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [phase, start])

  function onValue(value: string) {
    if (phase !== "play" || !reading) return
    const letters = value.toLowerCase()
    if (matchesReading(letters, reading)) {
      const nextChars = charsRef.current + word.length
      charsRef.current = nextChars
      setChars(nextChars)
      setWords((count) => count + 1)
      setBuffer("")
      setWord(pickWord(Math.random))
      return
    }
    if (isReadingPrefix(letters, reading)) {
      setBuffer(letters)
      return
    }
    setMisses((count) => count + 1)
  }

  return (
    <Frame index="07" name="TYPE">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
        <div className="flex gap-6">
          <Stat label="文字" value={String(chars)} />
          <Stat label="語" value={String(words)} />
          <Stat label="ミス" value={String(misses)} />
          <Stat label="残り" value={String(left)} />
          <Stat label="最高" value={best === null ? "—" : String(best)} />
        </div>
        <Button type="button" variant="outline" className="h-10 px-4" onClick={start}>
          {phase === "idle" ? "開始" : "新規"}
        </Button>
      </div>

      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6">
        <div className="h-px w-full bg-white/10">
          <div className="h-px bg-primary" style={{ width: `${(left / TYPE_SECONDS) * 100}%` }} />
        </div>
        <div className="text-center">
          <p className="text-6xl tracking-tight sm:text-8xl">{phase === "idle" ? "" : word}</p>
          <p className="mt-3 font-mono text-sm tracking-[0.28em] text-muted-foreground">
            {phase === "play" ? reading : ""}
          </p>
        </div>
        <Input
          ref={inputRef}
          value={buffer}
          onChange={(event) => onValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.code === "Space") event.preventDefault()
          }}
          disabled={phase !== "play"}
          lang="en"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          aria-label="ローマ字"
          className="h-14 text-center font-mono text-2xl tracking-[0.28em] md:text-2xl"
        />
        <p className="text-center font-mono text-xs tracking-[0.28em] text-primary">
          {phase === "over" ? `${resultBand(chars)} ${chars}/分` : ""}
        </p>
      </div>
    </Frame>
  )
}
