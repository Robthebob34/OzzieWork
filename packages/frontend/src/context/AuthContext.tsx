import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';

import {
  AuthUser,
  RegisterPayload,
  LoginPayload,
  UpdateProfilePayload,
  PasswordChangePayload,
  fetchCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  setAuthTokens,
  clearAuthTokens,
  getStoredTokens,
  updateUserProfile,
  changePassword,
} from '../lib/api';

interface AuthContextValue {
  user: AuthUser | null;
  initializing: boolean;
  employerSuspended: boolean;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<AuthUser | null>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<AuthUser>;
  updatePassword: (payload: PasswordChangePayload) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function parseErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | undefined;
    if (!data) {
      return 'Something went wrong. Please try again.';
    }
    if (typeof data.detail === 'string') {
      return data.detail;
    }
    const nonFieldErrors = data.non_field_errors as string[] | undefined;
    if (Array.isArray(nonFieldErrors) && nonFieldErrors.length) {
      return nonFieldErrors[0];
    }
    const firstKey = Object.keys(data)[0];
    const value = data[firstKey];
    if (Array.isArray(value) && value.length) {
      return String(value[0]);
    }
  }
  return 'Unable to complete the request. Please try again.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [employerSuspended, setEmployerSuspended] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      const tokens = getStoredTokens();
      if (!tokens) {
        if (mounted) {
          setInitializing(false);
        }
        return;
      }
      setAuthTokens(tokens);
      try {
        const profile = await fetchCurrentUser();
        if (mounted) {
          setUser(profile);
          setEmployerSuspended(Boolean(profile.employer_profile?.is_suspended));
        }
      } catch (error) {
        clearAuthTokens();
      } finally {
        if (mounted) {
          setInitializing(false);
        }
      }
    }
    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (payload: LoginPayload) => {
    try {
      const response = await loginUser(payload);
      setAuthTokens(response.tokens);
      setUser(response.user);
      setEmployerSuspended(Boolean(response.user.employer_profile?.is_suspended));
      return response.user;
    } catch (error) {
      throw new Error(parseErrorMessage(error));
    }
  };

  const register = async (payload: RegisterPayload) => {
    try {
      const response = await registerUser(payload);
      setAuthTokens(response.tokens);
      setUser(response.user);
      setEmployerSuspended(Boolean(response.user.employer_profile?.is_suspended));
      return response.user;
    } catch (error) {
      throw new Error(parseErrorMessage(error));
    }
  };

  const logout = async () => {
    const tokens = getStoredTokens();
    try {
      if (tokens?.refresh) {
        await logoutUser(tokens.refresh);
      }
    } catch (error) {
      // Best-effort logout; ignore network failures.
    } finally {
      clearAuthTokens();
      setUser(null);
    }
  };

  const refreshProfile = async () => {
    try {
      const profile = await fetchCurrentUser();
      setUser(profile);
      setEmployerSuspended(Boolean(profile.employer_profile?.is_suspended));
      return profile;
    } catch (error) {
      clearAuthTokens();
      setUser(null);
      return null;
    }
  };

  const updateProfile = async (payload: UpdateProfilePayload) => {
    try {
      const updated = await updateUserProfile(payload);
      setUser(updated);
      setEmployerSuspended(Boolean(updated.employer_profile?.is_suspended));
      return updated;
    } catch (error) {
      throw new Error(parseErrorMessage(error));
    }
  };

  const updatePassword = async (payload: PasswordChangePayload) => {
    try {
      await changePassword(payload);
    } catch (error) {
      throw new Error(parseErrorMessage(error));
    }
  };

  const value = useMemo(
    () => ({ user, initializing, employerSuspended, login, register, logout, refreshProfile, updateProfile, updatePassword }),
    [user, initializing, employerSuspended]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
