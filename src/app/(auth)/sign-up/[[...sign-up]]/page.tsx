import { SignUp } from '@clerk/nextjs';

/**
 * サインアップ画面。catch-all（[[...sign-up]]）で /sign-up 配下のサブパスを同一ページで処理する。
 * ソーシャルログイン（Google 等）は Clerk ダッシュボード側で有効化する。
 */
export default function SignUpPage() {
  return <SignUp />;
}
