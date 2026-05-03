import { setBaseUrl } from '@workspace/api-client-react';
import { QueryClient } from '@tanstack/react-query';

// Generated hooks already use /api/* paths — no base URL prefix needed
setBaseUrl('');

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 1;
      },
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

export function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(n);
}
