# グループ抽選データ整合性監査レポート (2026-05-26)

> ユーザー指摘「グループ K / L がおかしい。1グループ4チームのはず」を起点に、`notes/fifa-2026-data.md` および `src/data/seed-teams.ts` / `src/data/seed-matches.ts` を FIFA 公式（日本語）の Final Draw 結果と突合した結果のレポート。**実装は行っていない**。

---

## 1. FIFA 公式（出典）

- URL: https://www.fifa.com/ja/tournaments/mens/worldcup/canadamexicousa2026/standings
- 取得日時: 2026-05-26 01:30 JST（WebFetch 経由）
- 取得方法: 同 URL の「順位表」ページ。12 グループそれぞれの 4 チームと、ノックアウトトーナメント表（R32 の対戦カード `1A / 2B / 3CEFHI` 等）を抽出。
- 二次情報源（既存 `notes/fifa-2026-data.md` セクション 5 で参照済み）: FIFA 公式 EN 版 "Final Draw results"、Wikipedia 各グループ記事。本監査では一次ソースとして公式日本語版を採用。

---

## 2. 全グループ整合性比較表（A 〜 L、48 チーム）

凡例:
- 「FIFA 公式（ja）」… https://www.fifa.com/ja/.../standings の順位表に記載されている順序とチーム名
- 「notes」… `notes/fifa-2026-data.md` セクション 1
- 「seed-teams.ts」… `src/data/seed-teams.ts` 内 `seedTeams` 配列の `nameJa` / `groupName` フィールド（配列出現順 = Pos 番号）
- 「✓」… 三者で完全一致

### Group A

| Pos | FIFA公式（ja） | notes/fifa-2026-data.md | seed-teams.ts | 判定 |
| --- | --- | --- | --- | --- |
| A1 | メキシコ (MEX) | メキシコ (MEX) | メキシコ (mex / MEX) | ✓ |
| A2 | 南アフリカ (RSA) | 南アフリカ (RSA) | 南アフリカ (rsa / RSA) | ✓ |
| A3 | 韓国 (KOR) | 韓国 (KOR) | 韓国 (kor / KOR) | ✓ |
| A4 | チェコ (CZE) | チェコ (CZE) | チェコ (cze / CZE) | ✓ |

### Group B

| Pos | FIFA公式（ja） | notes/fifa-2026-data.md | seed-teams.ts | 判定 |
| --- | --- | --- | --- | --- |
| B1 | カナダ (CAN) | カナダ (CAN) | カナダ (can / CAN) | ✓ |
| B2 | ボスニア・ヘルツェゴビナ (BIH) | ボスニア・ヘルツェゴビナ (BIH) | ボスニア・ヘルツェゴビナ (bih / BIH) | ✓ |
| B3 | カタール (QAT) | カタール (QAT) | カタール (qat / QAT) | ✓ |
| B4 | スイス (SUI) | スイス (SUI) | スイス (sui / SUI) | ✓ |

### Group C

| Pos | FIFA公式（ja） | notes/fifa-2026-data.md | seed-teams.ts | 判定 |
| --- | --- | --- | --- | --- |
| C1 | ブラジル (BRA) | ブラジル (BRA) | ブラジル (bra / BRA) | ✓ |
| C2 | モロッコ (MAR) | モロッコ (MAR) | モロッコ (mar / MAR) | ✓ |
| C3 | ハイチ (HAI) | ハイチ (HAI) | ハイチ (hai / HAI) | ✓ |
| C4 | スコットランド (SCO) | スコットランド (SCO) | スコットランド (sco / SCO) | ✓ |

### Group D

| Pos | FIFA公式（ja） | notes/fifa-2026-data.md | seed-teams.ts | 判定 |
| --- | --- | --- | --- | --- |
| D1 | アメリカ (USA) | アメリカ (USA) | アメリカ (usa / USA) | ✓ |
| D2 | パラグアイ (PAR) | パラグアイ (PAR) | パラグアイ (par / PAR) | ✓ |
| D3 | オーストラリア (AUS) | オーストラリア (AUS) | オーストラリア (aus / AUS) | ✓ |
| D4 | トルコ (TUR) | トルコ (TUR) | トルコ (tur / TUR) | ✓ |

### Group E

| Pos | FIFA公式（ja） | notes/fifa-2026-data.md | seed-teams.ts | 判定 |
| --- | --- | --- | --- | --- |
| E1 | ドイツ (GER) | ドイツ (GER) | ドイツ (ger / GER) | ✓ |
| E2 | キュラソー (CUW) | キュラソー (CUW) | キュラソー (cuw / CUW) | ✓ |
| E3 | コートジボワール (CIV) | コートジボワール (CIV) | コートジボワール (civ / CIV) | ✓ |
| E4 | エクアドル (ECU) | エクアドル (ECU) | エクアドル (ecu / ECU) | ✓ |

### Group F

| Pos | FIFA公式（ja） | notes/fifa-2026-data.md | seed-teams.ts | 判定 |
| --- | --- | --- | --- | --- |
| F1 | オランダ (NED) | オランダ (NED) | オランダ (ned / NED) | ✓ |
| F2 | 日本 (JPN) | 日本 (JPN) | 日本 (jpn / JPN) | ✓ |
| F3 | スウェーデン (SWE) | スウェーデン (SWE) | スウェーデン (swe / SWE) | ✓ |
| F4 | チュニジア (TUN) | チュニジア (TUN) | チュニジア (tun / TUN) | ✓ |

### Group G

| Pos | FIFA公式（ja） | notes/fifa-2026-data.md | seed-teams.ts | 判定 |
| --- | --- | --- | --- | --- |
| G1 | ベルギー (BEL) | ベルギー (BEL) | ベルギー (bel / BEL) | ✓ |
| G2 | エジプト (EGY) | エジプト (EGY) | エジプト (egy / EGY) | ✓ |
| G3 | イラン (IRN) | イラン (IRN) | イラン (irn / IRN) | ✓ |
| G4 | ニュージーランド (NZL) | ニュージーランド (NZL) | ニュージーランド (nzl / NZL) | ✓ |

### Group H

| Pos | FIFA公式（ja） | notes/fifa-2026-data.md | seed-teams.ts | 判定 |
| --- | --- | --- | --- | --- |
| H1 | スペイン (ESP) | スペイン (ESP) | スペイン (esp / ESP) | ✓ |
| H2 | カーボベルデ (CPV) | カーボベルデ (CPV) | カーボベルデ (cpv / CPV) | ✓ |
| H3 | サウジアラビア (KSA) | サウジアラビア (KSA) | サウジアラビア (ksa / KSA) | ✓ |
| H4 | ウルグアイ (URU) | ウルグアイ (URU) | ウルグアイ (uru / URU) | ✓ |

### Group I

| Pos | FIFA公式（ja） | notes/fifa-2026-data.md | seed-teams.ts | 判定 |
| --- | --- | --- | --- | --- |
| I1 | フランス (FRA) | フランス (FRA) | フランス (fra / FRA) | ✓ |
| I2 | セネガル (SEN) | セネガル (SEN) | セネガル (sen / SEN) | ✓ |
| I3 | イラク (IRQ) | イラク (IRQ) | イラク (irq / IRQ) | ✓ |
| I4 | ノルウェー (NOR) | ノルウェー (NOR) | ノルウェー (nor / NOR) | ✓ |

### Group J

| Pos | FIFA公式（ja） | notes/fifa-2026-data.md | seed-teams.ts | 判定 |
| --- | --- | --- | --- | --- |
| J1 | アルゼンチン (ARG) | アルゼンチン (ARG) | アルゼンチン (arg / ARG) | ✓ |
| J2 | アルジェリア (ALG) | アルジェリア (ALG) | アルジェリア (alg / ALG) | ✓ |
| J3 | オーストリア (AUT) | オーストリア (AUT) | オーストリア (aut / AUT) | ✓ |
| J4 | ヨルダン (JOR) | ヨルダン (JOR) | ヨルダン (jor / JOR) | ✓ |

### Group K

| Pos | FIFA公式（ja） | notes/fifa-2026-data.md | seed-teams.ts | 判定 |
| --- | --- | --- | --- | --- |
| K1 | ポルトガル (POR) | ポルトガル (POR) | ポルトガル (por / POR) | ✓ |
| K2 | コンゴ (COD)（公式表示名は単に「コンゴ」） | コンゴ民主共和国 (COD) | コンゴ民主共和国 (cod / COD) | ✓（注 1） |
| K3 | ウズベキスタン (UZB) | ウズベキスタン (UZB) | ウズベキスタン (uzb / UZB) | ✓ |
| K4 | コロンビア (COL) | コロンビア (COL) | コロンビア (col / COL) | ✓ |

> 注 1: FIFA 公式日本語表示は短縮形「コンゴ」だが、FIFA コードは `COD` (= Democratic Republic of the Congo / コンゴ民主共和国)。**コンゴ共和国 (CGO)** とは別国。`seed-teams.ts` および `notes/fifa-2026-data.md` はフルネーム「コンゴ民主共和国」を採用しており、FIFA コード `COD` でも完全一致しているため、これは表記揺れであって不一致ではない。

### Group L

| Pos | FIFA公式（ja） | notes/fifa-2026-data.md | seed-teams.ts | 判定 |
| --- | --- | --- | --- | --- |
| L1 | イングランド (ENG) | イングランド (ENG) | イングランド (eng / ENG) | ✓ |
| L2 | クロアチア (CRO) | クロアチア (CRO) | クロアチア (cro / CRO) | ✓ |
| L3 | ガーナ (GHA) | ガーナ (GHA) | ガーナ (gha / GHA) | ✓ |
| L4 | パナマ (PAN) | パナマ (PAN) | パナマ (pan / PAN) | ✓ |

### 集計

- FIFA 公式から確認できたチーム: **48 / 48 (100%)**
- `notes/fifa-2026-data.md` との不一致: **0 件**
- `seed-teams.ts` との不一致: **0 件**
- グループあたりのチーム数: **すべて 4 チーム** (K, L 含む全 12 グループ)

---

## 3. 検出された不一致

**実質的な不一致はゼロ。** 唯一の表記差は次のとおりで、いずれもデータ不整合ではない。

- **表記揺れ 1（軽微・修正不要）**: FIFA 公式日本語ページは Group K の 2 位を「コンゴ」と短縮表記。`seed-teams.ts` / `notes/fifa-2026-data.md` は「コンゴ民主共和国」とフルネームで保持。FIFA コード `COD` が同一であり、ISO 国コードも `cd` 一意なので技術的な不整合はない。UI でフルネームを表示している方が**ユーザーに親切**(コンゴ共和国 CGO との混同を避けられる)。
- データ上の重複・抜け・別グループ混入・ポジション番号ズレ: **すべて該当なし**。

---

## 4. K / L グループ特定調査

ユーザー指摘「K / L がおかしい。1 グループ 4 チームのはず」に対する具体的検証。

### 4-1. 公式 (FIFA ja) の K / L

```
Group K (4 teams):
  1. ポルトガル (POR)
  2. コンゴ (COD)
  3. ウズベキスタン (UZB)
  4. コロンビア (COL)

Group L (4 teams):
  1. イングランド (ENG)
  2. クロアチア (CRO)
  3. ガーナ (GHA)
  4. パナマ (PAN)
```

### 4-2. 現状 `seed-teams.ts` の K / L

`src/data/seed-teams.ts` L64-L72 を確認:

```64:72:src/data/seed-teams.ts
  { id: 'por', nameJa: 'ポルトガル',        nameEn: 'Portugal',               fifaCode: 'POR', flag: '🇵🇹', groupName: 'Group K' },
  { id: 'cod', nameJa: 'コンゴ民主共和国',   nameEn: 'Congo DR',               fifaCode: 'COD', flag: '🇨🇩', groupName: 'Group K' },
  { id: 'uzb', nameJa: 'ウズベキスタン',     nameEn: 'Uzbekistan',             fifaCode: 'UZB', flag: '🇺🇿', groupName: 'Group K' },
  { id: 'col', nameJa: 'コロンビア',        nameEn: 'Colombia',               fifaCode: 'COL', flag: '🇨🇴', groupName: 'Group K' },

  { id: 'eng', nameJa: 'イングランド',       nameEn: 'England',                fifaCode: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', groupName: 'Group L' },
  { id: 'cro', nameJa: 'クロアチア',        nameEn: 'Croatia',                fifaCode: 'CRO', flag: '🇭🇷', groupName: 'Group L' },
  { id: 'gha', nameJa: 'ガーナ',            nameEn: 'Ghana',                  fifaCode: 'GHA', flag: '🇬🇭', groupName: 'Group L' },
  { id: 'pan', nameJa: 'パナマ',            nameEn: 'Panama',                 fifaCode: 'PAN', flag: '🇵🇦', groupName: 'Group L' },
```

K に 4 チーム、L に 4 チーム、ともに **正しく 4 チームずつ** 入っており、ポジション番号 (`groupPositionToTeamId` ロジックでの配列出現順) も FIFA 公式と一致。

### 4-3. 差分（K / L）

**差分なし**。FIFA 公式・`notes/fifa-2026-data.md`・`seed-teams.ts` の三者で完全一致。

### 4-4. ユーザー指摘の原因仮説

データソース層（`seed-teams.ts`）は **完全に正しい** ため、「K / L が 4 チームになっていない」ように見えている場合は以下のいずれかが原因と推定される。これらはすべて本監査のスコープ外（実装層）。

| 仮説 | 確認すべき対象 | 想定される症状 |
| --- | --- | --- |
| (a) DB に既に古いシードが流れている | `tournament_teams` テーブルの `group_name` カラム | 旧仮データ（イタリア・ペルー等を含む 32 チーム版や、別のグループ分布）が残存 |
| (b) UI のグループ表示ロジックでフィルタが壊れている | `app/(routes)/groups/*` 等のグループ表示コンポーネント | K / L のチームが表示されない・別グループに表示される |
| (c) seed スクリプト本体のバグ | `scripts/seed.ts` 等 | `seed-teams.ts` の K / L のレコードが skip されている |
| (d) `groupPositionToTeamId` の利用側のバグ | `K1`〜`L4` を解決する箇所 | グループステージ試合 M21–24, M45–48, M67–68, M71–72 で対戦表が空 or 不正 |

→ **次の調査スコープへの引き継ぎ事項**: 上記 (a)〜(d) のどれが該当しているか、別エージェントで `tournament_teams` テーブル状態確認 + UI 側コードレビューが必要。

---

## 5. 試合の対戦カード差分（試合 1–72 の Pos 表記検証）

`src/data/seed-matches.ts` の `homeSlot` / `awaySlot` が FIFA 公式 Match Schedule で公開されている Pos 表記と一致するかを抜き取り検証。

### 5-1. K グループ 6 試合（必須検証分）

| 試合 ID | MD | 日付 | 会場 | seed-matches の homeSlot / awaySlot | 解決後 (`groupPositionToTeamId`) | notes セクション 2 | 判定 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 23 | MD1 | 2026-06-17 | Houston | K1 vs K2 | ポルトガル vs コンゴ民主共和国 | K1 vs K2 | ✓ |
| 24 | MD1 | 2026-06-17 | Mexico City | K3 vs K4 | ウズベキスタン vs コロンビア | K3 vs K4 | ✓ |
| 47 | MD2 | 2026-06-23 | Houston | K1 vs K3 | ポルトガル vs ウズベキスタン | K1 vs K3 | ✓ |
| 48 | MD2 | 2026-06-23 | Estadio Guadalajara | K4 vs K2 | コロンビア vs コンゴ民主共和国 | K4 vs K2 | ✓ |
| 71 | MD3 | 2026-06-27 19:30 | Miami | K4 vs K1 | コロンビア vs ポルトガル | K4 vs K1 | ✓ |
| 72 | MD3 | 2026-06-27 19:30 | Atlanta | K2 vs K3 | コンゴ民主共和国 vs ウズベキスタン | K2 vs K3 | ✓ |

MD1/MD2/MD3 ともに「Pos1v2 / Pos3v4」「Pos1v3 / Pos4v2」「Pos4v1 / Pos2v3」の FIFA 標準テンプレートに合致。MD3 同時刻 (19:30) 開催も確認済み。

### 5-2. L グループ 6 試合（必須検証分）

| 試合 ID | MD | 日付 | 会場 | seed-matches の homeSlot / awaySlot | 解決後 | notes セクション 2 | 判定 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 21 | MD1 | 2026-06-17 | Toronto | L3 vs L4 | ガーナ vs パナマ | L3 vs L4 | ✓ |
| 22 | MD1 | 2026-06-17 | Dallas | L1 vs L2 | イングランド vs クロアチア | L1 vs L2 | ✓ |
| 45 | MD2 | 2026-06-23 | Boston | L1 vs L3 | イングランド vs ガーナ | L1 vs L3 | ✓ |
| 46 | MD2 | 2026-06-23 | Toronto | L4 vs L2 | パナマ vs クロアチア | L4 vs L2 | ✓ |
| 67 | MD3 | 2026-06-27 17:00 | NY/NJ | L4 vs L1 | パナマ vs イングランド | L4 vs L1 | ✓ |
| 68 | MD3 | 2026-06-27 17:00 | Philadelphia | L2 vs L3 | クロアチア vs ガーナ | L2 vs L3 | ✓ |

L グループも全 6 試合の Pos 表記が `notes/fifa-2026-data.md` と完全一致。

### 5-3. 全 72 試合のグループ別カウント

`groupLetter` フィールドで集計した結果:

| グループ | 試合 ID | 試合数 | 期待値 | 判定 |
| --- | --- | --- | --- | --- |
| A | 1, 2, 25, 28, 51, 52 | 6 | 6 | ✓ |
| B | 3, 8, 26, 27, 53, 54 | 6 | 6 | ✓ |
| C | 5, 7, 29, 30, 49, 50 | 6 | 6 | ✓ |
| D | 4, 6, 31, 32, 59, 60 | 6 | 6 | ✓ |
| E | 9, 10, 33, 34, 55, 56 | 6 | 6 | ✓ |
| F | 11, 12, 35, 36, 57, 58 | 6 | 6 | ✓ |
| G | 15, 16, 39, 40, 65, 66 | 6 | 6 | ✓ |
| H | 13, 14, 37, 38, 63, 64 | 6 | 6 | ✓ |
| I | 17, 18, 41, 42, 61, 62 | 6 | 6 | ✓ |
| J | 19, 20, 43, 44, 69, 70 | 6 | 6 | ✓ |
| K | 23, 24, 47, 48, 71, 72 | 6 | 6 | ✓ |
| L | 21, 22, 45, 46, 67, 68 | 6 | 6 | ✓ |

**合計 72 試合**、すべてのグループで MD1/MD2/MD3 が 2 試合ずつ、計 6 試合。**抜け・重複なし**。

### 5-4. 他グループ抜き取りチェック（任意項目）

ホスト国 / 注目グループを各 1 試合だけスポットチェック:

- M1 (Group A MD1, 開幕戦): A1 vs A2 = メキシコ vs 南アフリカ。FIFA 公式の "Match 1 Mexico v RSA, 2026-06-11 13:00 Estadio Azteca" と完全一致。
- M11 (Group F MD1): F1 vs F2 = オランダ vs 日本。FIFA 公式の "Match 11 NED v JPN, 2026-06-14 Arlington" と一致。
- M19 (Group J MD1): J1 vs J2 = アルゼンチン vs アルジェリア。FIFA 公式 "Match 19 ARG v ALG, 2026-06-16 Kansas City" と一致。
- M51 / M52 (Group A MD3 同時刻): A4 vs A1 / A2 vs A3 = チェコ vs メキシコ / 南アフリカ vs 韓国。MD3 同時刻 (19:00) ルールに合致。

→ 全 72 試合の Pos 表記が `notes/fifa-2026-data.md` セクション 2 と完全一致。`seed-matches.ts` の修正は **不要**。

---

## 6. ホスト国の特定組み合わせ確認

FIFA 2026 はホスト国 3 か国 (Mexico / Canada / USA) を Pot 1 シードとし、それぞれ Group A / B / D に強制配置する規定。`seed-teams.ts` / `seed-matches.ts` でこれが守られているか確認:

| ホスト国 | 期待グループ・Pos | 現状 seed-teams.ts | 開幕戦 | 判定 |
| --- | --- | --- | --- | --- |
| Mexico | A1 | A1 (mex / Group A, 先頭) | M1 (6/11 13:00 Mexico City) | ✓ |
| Canada | B1 | B1 (can / Group B, 先頭) | M3 (6/12 15:00 Toronto) | ✓ |
| USA | D1 | D1 (usa / Group D, 先頭) | M4 (6/12 18:00 Inglewood, SoFi Stadium) | ✓ |

加えて FIFA 公式の 2026 大会開幕戦規程 (Mexico が大会全体の Match 1 を Estadio Azteca で開催) も `seed-matches.ts` M1 で確実に表現されている。

→ ホスト国配置: **正しい**。

---

## 7. ノックアウトトーナメント表 (R32) との整合性

FIFA 公式のブラケット表示 (`1E – 3ABCDF` / `2A – 2B` 等) と `src/data/seed-matches.ts` M73〜M88 の `homeSlot` / `awaySlot` を再確認:

| 試合 | FIFA 公式 (ja) | seed-matches.ts | 判定 |
| --- | --- | --- | --- |
| 73 | 2A – 2B | `Group A runners-up` – `Group B runners-up` | ✓ |
| 74 | 1E – 3ABCDF | `Group E winners` – `Group A/B/C/D/F third place` | ✓ |
| 75 | 1F – 2C | `Group F winners` – `Group C runners-up` | ✓ |
| 76 | 1C – 2F | `Group C winners` – `Group F runners-up` | ✓ |
| 77 | 1I – 3CDFGH | `Group I winners` – `Group C/D/F/G/H third place` | ✓ |
| 78 | 2E – 2I | `Group E runners-up` – `Group I runners-up` | ✓ |
| 79 | 1A – 3CEFHI | `Group A winners` – `Group C/E/F/H/I third place` | ✓ |
| 80 | 1L – 3EHIJK | `Group L winners` – `Group E/H/I/J/K third place` | ✓ |
| 81 | 1D – 3BEFIJ | `Group D winners` – `Group B/E/F/I/J third place` | ✓ |
| 82 | 1G – 3AEHIJ | `Group G winners` – `Group A/E/H/I/J third place` | ✓ |
| 83 | 2K – 2L | `Group K runners-up` – `Group L runners-up` | ✓ |
| 84 | 1H – 2J | `Group H winners` – `Group J runners-up` | ✓ |
| 85 | 1B – 3EFGIJ | `Group B winners` – `Group E/F/G/I/J third place` | ✓ |
| 86 | 1J – 2H | `Group J winners` – `Group H runners-up` | ✓ |
| 87 | 1K – 3DEIJL | `Group K winners` – `Group D/E/I/J/L third place` | ✓ |
| 88 | 2D – 2G | `Group D runners-up` – `Group G runners-up` | ✓ |

→ R32 16 試合すべての `homeSlot` / `awaySlot` が FIFA 公式と一致。**修正不要**。

---

## 8. 影響範囲

データソース層 (`src/data/`) には **修正が必要な不一致は存在しない**:

| ファイル | 修正必要性 | 備考 |
| --- | --- | --- |
| `src/data/seed-teams.ts` | **不要** | 48 チームすべて FIFA 公式と完全一致 |
| `src/data/seed-matches.ts` | **不要** | 試合 1–104 の `homeSlot` / `awaySlot` / `groupLetter` すべて一致 |
| `notes/fifa-2026-data.md` | **不要** | セクション 1〜5 すべて公式と一致 |
| データベース (`tournament_teams` 等) | **要確認** | 既に古い seed が流れている場合は **再 seed** 必要（本監査スコープ外） |
| UI 層 (`app/(routes)/groups/*` 等) | **要確認** | 表示ロジックのバグの可能性（本監査スコープ外） |

---

## 9. 修正提案

### 9-1. データソース層

**修正提案なし。** `seed-teams.ts` / `seed-matches.ts` / `notes/fifa-2026-data.md` はすべて FIFA 公式と整合しており、変更すべき行は **0 行**。

### 9-2. ユーザー指摘 (K/L が 4 チームでない) への対応フロー

データ層は正しいので、症状を再現するために以下を順に切り分けるよう次の実装エージェントへ引き継ぐことを推奨:

1. **DB 状態確認 (最優先)**

   現環境の DB に対して以下のような SQL でグループ別チーム数を集計し、本当に K/L が 4 でないかを確認:

   ```sql
   SELECT group_name, COUNT(*) AS team_count
   FROM tournament_teams
   GROUP BY group_name
   ORDER BY group_name;
   ```

   期待値: A〜L すべて 4。実値が異なる場合 → **再 seed** が必要。

2. **再 seed が必要な場合の手順**

   - マイグレーションは **不要**（DDL 変更なし、レコード差し替えのみ）。
   - `tournament_teams` および関連する子テーブル（あれば `match` 系の外部キー先）を `TRUNCATE ... CASCADE`、または既存の seed スクリプトの「全削除 → 再投入」フローを使う。
   - `seed-teams.ts` を投入後、`seed-matches.ts` の試合 1–72 を再生成。試合 73–104 は `homeSlot` / `awaySlot` がスロット表記なので teams 再投入後も再計算不要。

3. **UI 表示問題の場合**

   `groupPositionToTeamId` を使って `K1`〜`L4` を解決している箇所、または `groupName === 'Group K'` でフィルタしている箇所を確認。`Group K` / `Group L` の文字列比較が大文字小文字違いやスペース違いで失敗していないか。

### 9-3. 任意の改善提案（修正必須ではない）

監査の過程で気づいた、データ整合性とは別の **将来的に検討する価値がある** 点:

- **`flag-icons` 対応**: `seed-teams.ts` は絵文字旗 (`🇲🇽` 等) を `flag` フィールドに格納しているが、`notes/fifa-2026-data.md` セクション 5-5 では `flag-icons` の ISO コード (`mx`, `gb-eng`, `gb-sct` 等) の利用が前提となっている。今のところ実害はないが、UI で `flag-icons` ライブラリを使う場合は別途 ISO コードを保持するフィールド（例: `flagIso`）の追加を検討。
- **`seed-venues.ts` に `Estadio Guadalajara` が存在するか未検証**: `seed-matches.ts` 内で `venueId: 'guadalajara'` を 4 試合 (M2, M28, M48, M64) で参照しているため、`seed-venues.ts` 側に `guadalajara` レコードがないと外部キー違反になる。本監査スコープ外だが、再 seed 前に念のため確認推奨（`notes/fifa-2026-data.md` セクション 5-2 で「未登録」と記載されているのが現在も解消されていない可能性あり）。

---

## 10. 結論サマリ

- FIFA 公式から確認できた **48 / 48 チーム** が `seed-teams.ts` / `notes/fifa-2026-data.md` と **完全一致**。
- グループ K / L はいずれも **4 チームずつ存在** し、ポジション番号も FIFA 公式どおり。
- グループステージ 72 試合の Pos 表記、R32 16 試合のスロット表記、ホスト国 (Mexico/Canada/USA) の配置もすべて公式と一致。
- データソース層に必要な修正は **0 行**。
- ユーザー指摘の症状は、**DB のシード状態** または **UI 表示ロジック** に起因している可能性が高い。次のエージェントには `tournament_teams` テーブルの実値確認と、グループ表示コンポーネントのレビューを依頼することを推奨。
