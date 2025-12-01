import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

type Role = 'employer' | 'traveller';

interface Options {
  redirectIfFound?: boolean;
  requiredRole?: Role;
  unauthorizedRedirectTo?: string;
}

export function useAuthRedirect(redirectTo = '/auth/login', options: Options = {}) {
  const { redirectIfFound = false, requiredRole, unauthorizedRedirectTo } = options;
  const router = useRouter();
  const { user, initializing } = useAuth();
  const { employerSuspended } = useAuth();
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    if (initializing) return;

    if (!user && !redirectIfFound) {
      const nextParam = router.asPath ? `?next=${encodeURIComponent(router.asPath)}` : '';
      router.replace(`${redirectTo}${nextParam}`);
      return;
    }

    if (user && redirectIfFound) {
      const next = (router.query.next as string) || '/';
      router.replace(next);
      return;
    }

    if (user && requiredRole) {
      const hasRole = requiredRole === 'employer' ? user.is_employer : user.is_traveller;
      if (!hasRole) {
        setUnauthorized(true);
        if (unauthorizedRedirectTo) {
          router.replace(unauthorizedRedirectTo);
        }
      } else {
        setUnauthorized(false);
      }
    } else {
      setUnauthorized(false);
    }
  }, [initializing, user, router, redirectIfFound, redirectTo, requiredRole, unauthorizedRedirectTo]);

  return { user, initializing, unauthorized, employerSuspended };
}
