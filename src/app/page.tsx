import Link from "next/link"
import { Mark } from "@/components/marks"
import { GAMES } from "@/lib/catalog"

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between">
        <p className="font-mono text-[11px] tracking-[0.32em]">OHIRUNE</p>
        <p className="font-mono text-[11px] tracking-[0.22em] text-muted-foreground">
          {GAMES[0].index}—{GAMES[GAMES.length - 1].index}
        </p>
      </header>
      <nav className="flex flex-1 flex-col justify-center py-10" aria-label="ゲーム">
        <ul>
          {GAMES.map((game) => (
            <li key={game.slug} className="border-t border-white/10 last:border-b">
              <Link
                href={`/play/${game.slug}`}
                className="group grid grid-cols-[2.4rem_minmax(0,1fr)_auto] items-center gap-3 py-4 sm:grid-cols-[3.2rem_minmax(0,1fr)_8rem_auto] sm:py-5"
              >
                <span className="font-mono text-xs text-primary">{game.index}</span>
                <span className="text-4xl tracking-tight sm:text-6xl">
                  {game.name}
                  <span className="mt-1 block text-xs tracking-[0.22em] text-muted-foreground sm:hidden">
                    {game.kicker}
                  </span>
                </span>
                <span className="hidden text-sm text-muted-foreground sm:block">{game.kicker}</span>
                <Mark
                  slug={game.slug}
                  className="size-8 text-foreground/80 transition-transform duration-200 group-hover:scale-110 sm:size-10"
                />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  )
}
