"use client"

import { ArcanaGame } from "@/components/games/arcana-game"
import { CapsuleGame } from "@/components/games/capsule-game"
import { ChessGame } from "@/components/games/chess-game"
import { ChromaGame } from "@/components/games/chroma-game"
import { GuessGame } from "@/components/games/guess-game"
import { JumpGame } from "@/components/games/jump-game"
import { LotGame } from "@/components/games/lot-game"
import { ReversiGame } from "@/components/games/reversi-game"
import { SealGame } from "@/components/games/seal-game"
import { SlideGame } from "@/components/games/slide-game"
import { SolitaireGame } from "@/components/games/solitaire-game"
import { TarotGame } from "@/components/games/tarot-game"
import { TriadGame } from "@/components/games/triad-game"
import { TypeGame } from "@/components/games/type-game"
import type { GameSlug } from "@/lib/catalog"

export function GameScreen({ slug }: { slug: GameSlug }) {
  switch (slug) {
    case "slide":
      return <SlideGame />
    case "reversi":
      return <ReversiGame />
    case "arcana":
      return <ArcanaGame />
    case "lot":
      return <LotGame />
    case "chroma":
      return <ChromaGame />
    case "seal":
      return <SealGame />
    case "type":
      return <TypeGame />
    case "jump":
      return <JumpGame />
    case "capsule":
      return <CapsuleGame />
    case "guess":
      return <GuessGame />
    case "tarot":
      return <TarotGame />
    case "triad":
      return <TriadGame />
    case "chess":
      return <ChessGame />
    case "solitaire":
      return <SolitaireGame />
    default: {
      const unreachable: never = slug
      return unreachable
    }
  }
}
