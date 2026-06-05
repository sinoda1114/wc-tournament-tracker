import { redirect } from 'next/navigation';
import { Container, Stack, Text, Title } from '@mantine/core';

import { AdminLoginForm } from '@/components/AdminLoginForm';
import { isAdminAuthenticated } from '@/lib/auth';

export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) {
    redirect('/admin');
  }

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={1}>管理画面ログイン</Title>
          <Text c="dimmed">
            環境変数 `ADMIN_PASSWORD` で設定したパスワードを入力してください。
          </Text>
        </Stack>
        <AdminLoginForm />
      </Stack>
    </Container>
  );
}
