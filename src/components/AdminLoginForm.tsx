'use client';

import { useState, useTransition } from 'react';
import { Button, PasswordInput, Stack, Text } from '@mantine/core';

import { loginAdminAction } from '@/app/admin/actions';

export function AdminLoginForm() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);

    startTransition(async () => {
      const result = await loginAdminAction(password);

      if (result && !result.ok) {
        setError(result.message);
      }
    });
  }

  return (
    <Stack gap="md" maw={360}>
      <PasswordInput
        label="管理パスワード"
        value={password}
        onChange={(event) => setPassword(event.currentTarget.value)}
      />
      {error ? (
        <Text size="sm" c="red">
          {error}
        </Text>
      ) : null}
      <Button loading={pending} onClick={handleSubmit}>
        ログイン
      </Button>
    </Stack>
  );
}
