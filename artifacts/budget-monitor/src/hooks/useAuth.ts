import { useGetMe, getGetMeQueryKey } from '@workspace/api-client-react';

export function useAuth() {
  const { data: user, isLoading, isError } = useGetMe({
    query: {
      retry: false,
      staleTime: 30000,
      queryKey: getGetMeQueryKey(),
    }
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
