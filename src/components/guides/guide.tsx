import Link from "next/link"
import type { ReactNode } from "react"
import { Frame } from "@/components/frame"
import { PlaceScores, ScoreGrid } from "@/components/guides/figures"
import { PIECE_SQUARE, PIECE_VALUE } from "@/lib/chess/search"
import { C_EXTRA, C_LIST, CORNER_EXTRA, SQUARE_VALUE, X_EXTRA, X_LIST } from "@/lib/reversi/evaluate"
import { BURIED_POINT, EMPTY_COLUMN_POINT, EMPTY_FREE_POINT, FOUNDATION_POINT, NEXT_CARD_POINT } from "@/lib/solitaire/search"

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-mono text-[11px] tracking-[0.22em] text-primary">{title}</h2>
      <div className="flex flex-col gap-3 text-sm leading-7">{children}</div>
    </section>
  )
}

function Shell({
  index,
  name,
  href,
  children,
}: {
  index: string
  name: string
  href: string
  children: ReactNode
}) {
  return (
    <Frame index={index} name={name}>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-10 py-2">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[11px] tracking-[0.28em] text-muted-foreground">解説</p>
          <Link href={href} className="font-mono text-[11px] tracking-[0.22em] text-muted-foreground hover:text-foreground">
            盤へ
          </Link>
        </div>
        {children}
      </div>
    </Frame>
  )
}

const PIECES = [
  ["歩", 1],
  ["桂", 2],
  ["角", 3],
  ["飛", 4],
  ["后", 5],
  ["王", 6],
] as const

function ReversiGuide({ index }: { index: string }) {
  const marks = new Set([...X_LIST, ...C_LIST])
  return (
    <Shell index={index} name="REVERSI" href="/play/reversi">
      <Block title="基準">
        <p>自分の番では点が高い手を選ぶ。相手の番では、相手がこちらの点を下げる手を選ぶ。</p>
        <p>点は、取られない場所と、打てる手の数で付ける。空きが16以下では、石の差も足す。</p>
        <p>下の表はマスの点だけ。数手先で隅が取れるなら、低いマスを置いても先の点は上がる。</p>
      </Block>
      <Block title="マス">
        <p>石を置いたマスに、この点を付ける。大きいほど有利で、負のマスは不利。</p>
        <ScoreGrid values={SQUARE_VALUE} files="ABCDEFGH" marks={marks} scale="board" />
        <p>四隅が120で一番高い。枠付きの隣は低い。</p>
        <p>斜め隣はB2とG2、B7とG7。辺の隣はB1とG1、A2とH2。上下を逆にした側も同じ。</p>
      </Block>
      <Block title="隅">
        <p>隅の石には、表の120とは別に{CORNER_EXTRA}を足す。</p>
        <p>隅が一つでも空なら、斜め隣から{X_EXTRA}、辺の隣から{C_EXTRA}をさらに引く。隅が四つ埋まったあとは、この引き算はしない。</p>
      </Block>
    </Shell>
  )
}

function ChessGuide({ index }: { index: string }) {
  return (
    <Shell index={index} name="CHESS" href="/play/chess">
      <Block title="基準">
        <p>自分の番では点を上げる。相手の番では、相手が点を下げる手を選ぶ。</p>
        <p>主になるのは駒の損得。マスの点は位置の補正で、画面では100で割ると小さい。詰みは、駒の点より大きい点数になる。</p>
      </Block>
      <Block title="駒">
        <p>駒の点は、歩{(PIECE_VALUE[1] ?? 0) / 100}、桂{(PIECE_VALUE[2] ?? 0) / 100}、角{(PIECE_VALUE[3] ?? 0) / 100}、飛{(PIECE_VALUE[4] ?? 0) / 100}、后{(PIECE_VALUE[5] ?? 0) / 100}。王は0で、場所の点だけが付く。</p>
        <p>画面の点は、駒の点とマスの点を足して100で割った数。表は白から見たもの。黒は上下を逆にする。</p>
      </Block>
      {PIECES.map(([name, type]) => (
        <Block key={name} title={name}>
          <p>{pieceLine(name)}</p>
          <ScoreGrid values={PIECE_SQUARE[type] ?? []} files="abcdefgh" scale="piece" />
        </Block>
      ))}
    </Shell>
  )
}

function pieceLine(name: string): string {
  if (name === "歩") return "2段目が8。d3とe3が6、d4とe4が5。"
  if (name === "桂") return "d4とe4、d5とe5が4。a1とh1、a8とh8が−10。"
  if (name === "角") return "端が−4。6段目は端以外が2。"
  if (name === "飛") return "7段目が1から2。1段目のdとeも2。"
  if (name === "后") return "中央が1。四隅が−4。"
  return "b1とg1が6、a1とh1が4。中央へ出るほど下がる。"
}

function SolitaireGuide({ index }: { index: string }) {
  return (
    <Shell index={index} name="SOLITAIRE" href="/play/solitaire">
      <Block title="基準">
        <p>相手はいない。点が高い手を選べば、読みと同じ指し方になる。</p>
        <p>数字は、台に出す手がいちばん先に来るように置いてある。</p>
      </Block>
      <Block title="置き場所">
        <p>点が高い場所へ出す。台がほかより大きい。空の列は、空の置き場より{EMPTY_COLUMN_POINT - EMPTY_FREE_POINT}高い。</p>
        <PlaceScores
          rows={[
            { label: "台の1枚", value: FOUNDATION_POINT },
            { label: "台の次の札が一番上", value: NEXT_CARD_POINT },
            { label: "空の列", value: EMPTY_COLUMN_POINT },
            { label: "空の置き場", value: EMPTY_FREE_POINT },
            { label: "下に隠れた札", value: -BURIED_POINT },
          ]}
        />
        <p>台の次の札は、列の一番上にあるときだけ{NEXT_CARD_POINT}が付く。その下の札は1枚ずつ{BURIED_POINT}を引く。</p>
      </Block>
    </Shell>
  )
}

export function Guide({ slug, index }: { slug: string; index: string }) {
  if (slug === "reversi") return <ReversiGuide index={index} />
  if (slug === "chess") return <ChessGuide index={index} />
  if (slug === "solitaire") return <SolitaireGuide index={index} />
  return null
}
