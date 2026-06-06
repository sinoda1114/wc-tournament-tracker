import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';
import reactHooks from 'eslint-plugin-react-hooks';

// eslint-config-next 16 は flat config（配列）を直接エクスポートする。
// 旧 FlatCompat 経由だと循環参照エラーになるため、スプレッドで合成する。
const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**'],
  },
  {
    // SSR + client hydration 設計上、mount 後の effect で localStorage や現在時刻などの
    // クライアント専用値を読み込んで setState する箇所が多い（hydration mismatch 回避の定石・
    // React 公式も認める「外部システム同期」）。React 19 の新ルールが過剰検知するため warn に下げる。
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];

export default eslintConfig;
