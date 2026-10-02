"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Frame } from "@/components/frame"
import { POSITIONS, drawThree, type DrawnCard } from "@/lib/tarot/deck"

function CardBack() {
  return (
    <svg viewBox="0 0 100 172" className="h-full w-full" aria-hidden>
      <rect width="100" height="172" fill="#efe4cf" />
      <rect x="3.5" y="3.5" width="93" height="165" fill="none" stroke="#8a6b2f" strokeWidth="1.1" />
      <rect x="6.5" y="6.5" width="87" height="159" fill="none" stroke="#8a6b2f" strokeWidth="0.4" />
      <path
        d="M50 68 L54.2 82.2 H69 L57 91 L61.6 105.4 L50 96.6 L38.4 105.4 L43 91 L31 82.2 H45.8 Z"
        fill="none"
        stroke="#8a6b2f"
        strokeWidth="1.1"
      />
    </svg>
  )
}

export function TarotGame() {
  const [spread, setSpread] = useState<DrawnCard[] | null>(null)
  const [shown, setShown] = useState(0)
  const timers = useRef<number[]>([])

  useEffect(() => {
    return () => {
      for (const id of timers.current) window.clearTimeout(id)
    }
  }, [])

  function draw() {
    for (const id of timers.current) window.clearTimeout(id)
    setSpread(drawThree())
    setShown(0)
    timers.current = [0, 1, 2].map((index) =>
      window.setTimeout(() => setShown(index + 1), 180 + index * 240),
    )
  }

  return (
    <Frame index="11" name="TAROT">
      <div className="flex flex-1 flex-col justify-center py-6">
        <div className="mx-auto grid w-full max-w-3xl grid-cols-3 gap-2 sm:gap-8">
          {POSITIONS.map((position, index) => {
            const drawCard = spread?.[index]
            const face = shown > index && drawCard !== undefined
            return (
              <figure key={position.id} className="min-w-0">
                <figcaption className="pb-2 text-center font-mono text-[10px] tracking-[0.22em] text-muted-foreground sm:text-xs">
                  {position.label}
                </figcaption>
                <div className="[perspective:1000px]">
                  <div
                    className={`relative aspect-[720/1240] w-full transition-transform duration-500 motion-reduce:transition-none [transform-style:preserve-3d] ${
                      face ? "[transform:rotateY(180deg)]" : ""
                    }`}
                  >
                    <div className="absolute inset-0 overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.35)] [backface-visibility:hidden]">
                      <CardBack />
                    </div>
                    <div className="absolute inset-0 overflow-hidden bg-[#efe4cf] shadow-[0_12px_40px_rgba(0,0,0,0.35)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                      {drawCard ? (
                        <Image
                          src={drawCard.card.src}
                          alt={face ? drawCard.card.name : ""}
                          fill
                          quality={90}
                          sizes="(max-width: 640px) 33vw, 280px"
                          className={`object-contain ${drawCard.reversed ? "rotate-180" : ""}`}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
                <figcaption className="min-h-16 pt-3 text-center">
                  {face && drawCard ? (
                    <>
                      <p className="text-xs sm:text-sm">{drawCard.card.name}</p>
                      <p className="pt-1 text-[11px] leading-snug text-muted-foreground sm:text-xs">
                        {drawCard.reversed ? "逆" : "正"} {drawCard.reversed ? drawCard.card.reversed : drawCard.card.upright}
                      </p>
                    </>
                  ) : null}
                </figcaption>
              </figure>
            )
          })}
        </div>
        <div className="flex justify-center pt-4">
          <Button type="button" variant="outline" className="h-10 px-5" onClick={draw}>
            {spread ? "引き直す" : "引く"}
          </Button>
        </div>
      </div>
    </Frame>
  )
}
