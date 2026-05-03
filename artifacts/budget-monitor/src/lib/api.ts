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

/** Short form: "Ksh 500M", "Ksh 1.2B", "−Ksh 485M", "Ksh 42K" */
export function formatCompact(n: number): string {
  const sign = n < 0 ? '−' : '';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${sign}Ksh ${(abs / 1e9).toFixed(1).replace(/\.0$/, '')}B`;
  if (abs >= 1e6) return `${sign}Ksh ${(abs / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  if (abs >= 1e3) return `${sign}Ksh ${(abs / 1e3).toFixed(0)}K`;
  return `${sign}Ksh ${abs.toFixed(0)}`;
}
