import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Guide } from "@/components/guides/guide"
import { findGame } from "@/lib/catalog"

const GUIDES = ["reversi", "chess", "solitaire"] as const

export function generateStaticParams() {
  return GUIDES.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const game = findGame(slug)
  if (!game || !GUIDES.includes(slug as (typeof GUIDES)[number])) return { title: "OHIRUNE" }
  return { title: `解説 — ${game.name}` }
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const game = findGame(slug)
  if (!game || !GUIDES.includes(slug as (typeof GUIDES)[number])) notFound()
  return <Guide slug={slug} index={game.index} />
}
