import { Suspense } from 'react';
import AccountDetailClient from './AccountDetailClient';

export function generateStaticParams() {
  // Generate a placeholder for static export
  return [{ id: '_' }];
}

export default function AccountDetailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AccountDetailClient />
    </Suspense>
  );
}
