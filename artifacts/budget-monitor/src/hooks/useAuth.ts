import { getGetMeQueryKey, getMe } from '@workspace/api-client-react';
import { useQuery } from '@tanstack/react-query';
import { withPerformanceTracking } from './usePerformanceMonitoring';

export function useAuth(enabled = true) {
  const { data: user, isLoading, isError } = useQuery({
    queryKey: getGetMeQueryKey(),
    enabled,
    retry: false,
    staleTime: 30000,
    queryFn: withPerformanceTracking(['auth', 'me'], async () => {
      try {
        return await getMe();
      } catch (error) {
        const status =
          typeof error === 'object' && error !== null && 'status' in error
            ? Number((error as { status?: unknown }).status)
            : undefined;

        // Unauthenticated is a normal state for first app load and logout.
        if (status === 401) return null;
        throw error;
      }
    }),
  });

  return {
    user,
    isLoading,
    isError,
    isLoggedIn: !!user && !isError,
    role: user?.role,
    isSuperAdmin: user?.role === 'super_admin',
    isCeo: user?.role === 'ceo',
    isMinistryHead: user?.role === 'ministry_head',
    isDepartmentHead: user?.role === 'department_head',
    isViewer: user?.role === 'viewer',
  };
}
