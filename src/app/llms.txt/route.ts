import { getSiteUrl } from '@/lib/env';

// llms.txt: LLM / AI クローラ・エージェント向けのサイト要約と主要リンク。
// 通常の robots.txt / sitemap.xml と併用し、AI 検索経由の流入も意識する（SEO 標準成果物）。
// 新しい公開ページを追加したら、このリンク一覧も更新すること。

export function GET(): Response {
  const base = getSiteUrl().replace(/\/$/, '');

  const body = `# MatchFav（マッチファボ）— W杯2026 試合・優勝予想・お気に入りトラッカー（FIFA 非公認・非公式ファンサイト）

> MatchFav は、ワールドカップ2026 を「見やすさ」優先で追える非公式ファンサイト。グループリーグ／決勝トーナメント／出場国・スカッド／優勝予想（みんなの予想）／お気に入りを、日本時間（JST）で提供する。結果データは TheSportsDB（無料）。本サイトは FIFA 非公認で、公式ロゴ・エンブレム・公式名称の商標的使用は行わない。

## ブランド名
- 正式名称: MatchFav
- 日本語表記（カタカナ）: マッチファボ（「MatchFav」と「マッチファボ」は同一サービスを指す）
- 公式ドメイン: ${base}

## 主要ページ
- [グループリーグ](${base}/groups): 各グループの対戦カードと順位表（突破ライン）
- [出場国・スカッド](${base}/teams): 出場国一覧と選手・監督
- [優勝予想](${base}/prediction): 4 指標モデル（過去成績・FIFAランク・WC2026成績・みんなの予想）と投票
- [お気に入り](${base}/favorites): 応援国をアプリ全体で横断表示

## 規約・方針
- [利用規約](${base}/terms)
- [プライバシーポリシー](${base}/privacy)

## このサイトの方針
- 速報性・データ網羅では大手と正面勝負せず、「体験の引き算」（ノイズの少ない見やすさ・JST 徹底・会場情報の直感性）で差別化する。
- WC2026 限定。大会終了の数ヶ月後に提供を終了予定。
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
