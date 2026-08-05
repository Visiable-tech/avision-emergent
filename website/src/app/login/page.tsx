import { Suspense } from 'react';
import type { Metadata } from 'next';
import LoginForm from '@/components/LoginForm';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your Avision Institute account.',
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 60, textAlign: 'center' }}>Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
