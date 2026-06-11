# #38 ファクトチェック findings への対応結果（データ担当）

対応日: 2026-06-11 / 対象: `findings.md` の要対応2件（AUT/ARG の名簿欠落）

## 1. AUT（オーストリア）= 25名 → **修正済み・26名**

- **原因**: 取得元パーサー（`scripts/fetch-squads.ts` の `parsePlayers`）のバグ。
  年齢テンプレートの表記揺れを正規表現が取りこぼしていた:
  - 先頭が大文字の `{{Birth date and age2|…}}`（小文字のみ想定だった）
  - 生年月日の後ろの追加引数 `|df=y`（テンプレ即閉じを前提にしていた）
- **修正**: 大小文字許容＋末尾引数を吸収するよう正規表現を改修。
  あわせて国指定の引数を追加（`tsx scripts/fetch-squads.ts AUT`）。
- **結果**: Dejan Ljubičić(#19, MF, Schalke 04, 1997-10-08) を回収し **AUT=26名**。
  `fetch-clubs AUT` でクラブも再リンク（26/26）。
- 恒久性: 根本修正のため、今後の全件再取得でも落ちない。

## 2. ARG（アルゼンチン）= 25名 → **据え置きが正しい（25名が現状の正）**

当初「欠番 #2 を Web で特定して追加」する方針で調査したが、**追加すると誤りになる**ことが判明:

- Wikipedia squads ページで欠けている26人目は **Leonardo Balerdi**（DF, #2, Marseille,
  1999-01-26）。Goal.com の26名一覧との差分で特定。
- しかし **Balerdi は 2026-06-06 にふくらはぎ（ヒラメ筋）負傷で代表を辞退**（ESPN 等）。
  → Wikipedia が25名なのは**辞退を正しく反映**した結果であり、欠落ではない。
- **代替選手は 2026-06-11（本日）時点で未発表**。Scaloni は Guido Rodríguez を有力視と
  報じられるが正式決定なし（World Soccer Talk / Mundo Albiceleste 等）。
- 結論: **現在のアルゼンチン代表は実際に25名**。Balerdi（辞退済み）も未確定の代替候補も
  載せるべきでない。**25名のままが 2026-06-11 時点の正確な状態**。

### フォローアップ（補充が発表されたら）
- アルゼンチンが正式に26人目を発表し Wikipedia squads に反映され次第、
  `tsx scripts/fetch-squads.ts ARG` → `tsx scripts/fetch-clubs.ts ARG` で自動回収できる。
- それまでは25名で正。

### 出典（ARG）
- ESPN: Argentina defender Leonardo Balerdi suffers calf injury, out of World Cup
- World Soccer Talk: Scaloni eyes Guido Rodriguez as Balerdi's replacement（"reportedly"・未確定）
- Mundo Albiceleste（2026-06-09）: Scaloni says he will wait before naming replacement
- Goal.com: Argentina squad World Cup 2026（26名一覧・差分特定に使用）
- en.wikipedia.org/wiki/Leonardo_Balerdi（DOB・辞退の記載）

## まとめ

- 機械検出できる取り込み誤りは AUT の1件のみで、**パーサーの根本バグとして修正**。
- ARG は「データの欠落」ではなく「現実の負傷辞退＋補充未定」を正しく反映した25名。
- 総選手数 **1247名**（48×26=1248 のうち、ARG が現実に25名のため −1）。club_id 未設定 0。
