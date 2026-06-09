import { SignIn } from '@clerk/nextjs';

/**
 * サインイン画面。catch-all（[[...sign-in]]）にすることで、Clerk が必要とする
 * /sign-in 配下のサブパス（検証ステップ等）を同一ページで処理できる。
 * Google などのソーシャルログインは Clerk ダッシュボード側で有効化する。
 */
export default function SignInPage() {
  return <SignIn />;
}
