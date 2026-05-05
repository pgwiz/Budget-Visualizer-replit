import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function usePerformanceMonitoring() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Log page load time
    if (typeof window !== 'undefined' && window.performance) {
      window.addEventListener('load', () => {
        const perfData = window.performance.timing;
        const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
        const connectTime = perfData.responseEnd - perfData.requestStart;
        const renderTime = perfData.domContentLoadedEventEnd - perfData.domLoading;
        
        console.log('[PERF] Page Metrics:', {
          pageLoadTime: `${pageLoadTime}ms`,
          connectTime: `${connectTime}ms`,
          renderTime: `${renderTime}ms`,
          timestamp: new Date().toISOString(),
        });
      });
    }

    // Monitor React Query requests
    const unsubscribe = queryClient.getQueryCache().subscribe(event => {
      if (event.type === 'updated' && event.action.type === 'success') {
        const query = event.query;
        const meta = query.meta as any;
        const duration = meta?.endTime ? meta.endTime - (meta?.startTime || 0) : 0;
        
        if (duration > 0) {
          console.log('[PERF] Query:', {
            queryKey: query.queryKey,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    });

    return () => unsubscribe();
  }, [queryClient]);
}

// Wrapper to add performance tracking to fetch calls
export function withPerformanceTracking<T>(
  queryKey: (string | number)[],
  queryFn: () => Promise<T>
): () => Promise<T> {
  return async () => {
    const startTime = performance.now();
    console.log('[PERF] Fetching:', { queryKey, timestamp: new Date().toISOString() });
    
    try {
      const result = await queryFn();
      const duration = performance.now() - startTime;
      console.log('[PERF] Fetched:', {
        queryKey,
        duration: `${duration.toFixed(2)}ms`,
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error('[PERF] Fetch Error:', {
        queryKey,
        duration: `${duration.toFixed(2)}ms`,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  };
}
