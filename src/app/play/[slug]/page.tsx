import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { GameScreen } from "@/components/game-screen"
import { findGame, GAMES, type GameSlug } from "@/lib/catalog"

export function generateStaticParams() {
  return GAMES.map((game) => ({ slug: game.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const game = findGame(slug)
  if (!game) return { title: "OHIRUNE" }
  return { title: `${game.name} — OHIRUNE` }
}

export default async function PlayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const game = findGame(slug)
  if (!game) notFound()
  return <GameScreen slug={game.slug as GameSlug} />
}
