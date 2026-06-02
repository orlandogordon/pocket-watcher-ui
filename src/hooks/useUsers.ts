import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { UserCreate } from '@/types/users';
import type { UserResponse } from '@/types/auth';

/**
 * POST /users/ — admin-only. Creates a non-admin user (admins are minted only
 * by the bootstrap job). No cache to invalidate: there is no user-list query.
 */
export function useCreateUser() {
  return useMutation({
    mutationFn: (body: UserCreate) =>
      apiFetch<UserResponse>('/users/', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  });
}
