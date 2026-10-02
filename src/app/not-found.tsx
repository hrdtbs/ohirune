import Link from "next/link"

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="text-center">
        <p className="font-mono text-xs tracking-[0.28em] text-muted-foreground">404</p>
        <Link href="/" className="mt-4 block font-mono text-sm tracking-[0.32em]">
          OHIRUNE
        </Link>
      </div>
    </main>
  )
}
