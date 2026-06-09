import { Center } from '@mantine/core';

/**
 * 認証画面（sign-in / sign-up）共通のレイアウト。
 * Clerk のカードを縦中央に寄せるだけの薄いラッパ。配色や globals.css には触れず、
 * Mantine の Center でレイアウトのみ担当する（CSS の正本は B レーン）。
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Center mih="70vh" p="md">
      {children}
    </Center>
  );
}
