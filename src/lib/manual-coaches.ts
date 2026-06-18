/**
 * 監督を「手動メンテ」にロックする FIFA コード集合（監督交代のイレギュラー対応）。
 *
 * Wikipedia「2026 FIFA World Cup squads」の `Coach:` 行は大会中の交代を併記することがある
 * （例: TUN = "Sabri Lamouchi (first match) / Hervé Renard (remaining matches)"）。
 * ルールベースのパーサは「どちらが現任か」を確実に判別できない（非構造の自由記述）ため、
 * ここに登録した国は `scripts/fetch-squads.ts` が `coaches` 行を**上書きしない**
 * （手動で設定した正規の監督値を保持する）。選手名簿は通常どおり更新される。
 *
 * 頻度が低いのでコード定数で管理する（DB マイグレーションはしない）。[[squad-notes]] と同じ流儀。
 * 運用: 監督交代に気づいたら ①本番DBの `coaches` を手動更新 ②ここに FIFA コードを追加。
 * 交代が落ち着き squads ページが単一表記に戻ったら、行を削除して自動取得へ戻してよい。
 */
export const MANUAL_COACH_LOCK: ReadonlySet<string> = new Set<string>([
  // チュニジア: 初戦(スウェーデン1-5)後に Lamouchi 解任→Renard 就任。
  // squads ページが両監督を併記しており自動パースが前任を拾うため手動ロック（2026-06-18）。
  'TUN',
]);
