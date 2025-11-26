import { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AuthProvider, useAuth } from '../AuthContext';
import {
  loginUser,
  logoutUser,
  fetchCurrentUser,
  setAuthTokens,
  clearAuthTokens,
  getStoredTokens,
} from '../../lib/api';

jest.mock('../../lib/api', () => ({
  registerUser: jest.fn(),
  loginUser: jest.fn(),
  logoutUser: jest.fn(),
  fetchCurrentUser: jest.fn(),
  setAuthTokens: jest.fn(),
  clearAuthTokens: jest.fn(),
  getStoredTokens: jest.fn(),
}));

const mockLoginUser = loginUser as jest.MockedFunction<typeof loginUser>;
const mockLogoutUser = logoutUser as jest.MockedFunction<typeof logoutUser>;
const mockFetchCurrentUser = fetchCurrentUser as jest.MockedFunction<typeof fetchCurrentUser>;
const mockSetAuthTokens = setAuthTokens as jest.MockedFunction<typeof setAuthTokens>;
const mockClearAuthTokens = clearAuthTokens as jest.MockedFunction<typeof clearAuthTokens>;
const mockGetStoredTokens = getStoredTokens as jest.MockedFunction<typeof getStoredTokens>;

function renderWithProvider(children: ReactNode) {
  return render(<AuthProvider>{children}</AuthProvider>);
}

function TestConsumer() {
  const { user, login, logout, initializing } = useAuth();

  if (initializing) {
    return <p>loading...</p>;
  }

  return (
    <div>
      <span data-testid="user-email">{user?.email ?? 'anonymous'}</span>
      <button onClick={() => login({ email: ' person@example.com ', password: 'pass' })}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetStoredTokens.mockReturnValue(null);
  mockFetchCurrentUser.mockResolvedValue(null as never);
});

describe('AuthContext', () => {
  it('logs in and stores user data', async () => {
    const fakeUser = { id: 1, email: 'person@example.com', username: 'person', is_traveller: true, is_employer: false };
    mockLoginUser.mockResolvedValue({ user: fakeUser, tokens: { access: 'token', refresh: 'refresh' } });

    renderWithProvider(<TestConsumer />);

    const loginButton = await screen.findByText('login');
    await userEvent.click(loginButton);

    await waitFor(() => {
      expect(mockSetAuthTokens).toHaveBeenCalledWith({ access: 'token', refresh: 'refresh' });
      expect(screen.getByTestId('user-email').textContent).toBe('person@example.com');
    });
  });

  it('clears session on logout', async () => {
    const fakeUser = { id: 1, email: 'person@example.com', username: 'person', is_traveller: true, is_employer: false };
    mockLoginUser.mockResolvedValue({ user: fakeUser, tokens: { access: 'token', refresh: 'refresh' } });
    mockLogoutUser.mockResolvedValue(undefined as never);

    renderWithProvider(<TestConsumer />);

    await userEvent.click(await screen.findByText('login'));
    await waitFor(() => expect(screen.getByTestId('user-email').textContent).toBe('person@example.com'));

    await userEvent.click(screen.getByText('logout'));

    await waitFor(() => {
      expect(mockClearAuthTokens).toHaveBeenCalled();
      expect(screen.getByTestId('user-email').textContent).toBe('anonymous');
    });
  });
});
