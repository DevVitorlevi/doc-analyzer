import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/http';

export interface User {
  id: string;
  name: string;
  email: string;
  picture: string | null;
}

export const SESSION_QUERY_KEY = ['me'] as const;

export function useSession() {
  return useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: () => apiRequest<User>('/me'),
    retry: false,
  });
}
