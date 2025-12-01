import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ReactNode, useState } from 'react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

function NavLink({ href, label, currentPath }: { href: string; label: string; currentPath: string }) {
  const isActive = currentPath === href || currentPath.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={clsx(
        'hover:text-brand-500',
        isActive ? 'text-brand-600 font-semibold' : 'text-slate-600'
      )}
    >
      {label}
    </Link>
  );
}

export function Layout({ title = 'Working Holiday Jobs', children, className }: LayoutProps) {
  const { user, logout, initializing, employerSuspended } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      router.push('/');
    } finally {
      setLoggingOut(false);
    }
  };

  const showSuspensionNotice = Boolean(user?.is_employer && employerSuspended);
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta
          name="description"
          content="Find seasonal and short-term working holiday jobs in Australia."
        />
      </Head>
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-semibold text-brand-700">
            Working Holiday Jobs
          </Link>
          <nav className="flex gap-4 text-sm items-center">
            {user?.is_employer ? (
              <>
                <NavLink href="/employer/dashboard" label="Dashboard" currentPath={router.pathname} />
                <NavLink href="/profile" label="Profile" currentPath={router.pathname} />
                <NavLink href="/employer/applications" label="Applications" currentPath={router.pathname} />
                <NavLink href="/employer/workers" label="My Workers" currentPath={router.pathname} />
                <NavLink href="/employer/post-job" label="Post a Job" currentPath={router.pathname} />
              </>
            ) : (
              <>
                <NavLink href="/profile" label="Profile" currentPath={router.pathname} />
                <NavLink href="/jobs" label="Browse Jobs" currentPath={router.pathname} />
                <NavLink href="/traveller/my-jobs" label="My Jobs" currentPath={router.pathname} />
                <NavLink href="/traveller/documents" label="My Documents" currentPath={router.pathname} />
              </>
            )}
            <NavLink href="/messages" label="Messages" currentPath={router.pathname} />
            {initializing ? (
              <span className="text-slate-400">Loading...</span>
            ) : user ? (
              <div className="flex items-center gap-2">
                <span className="text-slate-600 hidden sm:inline">
                  Hi, {user.first_name || user.username || user.email}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  {loggingOut ? 'Logging out...' : 'Logout'}
                </button>
              </div>
            ) : (
              <Link href="/auth/login" className="hover:text-brand-500">
                Login
              </Link>
            )}
          </nav>
        </div>
        {showSuspensionNotice && (
          <div className="border-t border-amber-200 bg-amber-50">
            <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-medium">
                Votre accès à certaines fonctionnalités est suspendu en raison d'un paiement en attente. Veuillez confirmer les virements en retard.
              </p>
              <Link
                href="/employer/workers"
                className="inline-flex items-center justify-center rounded-full border border-amber-300 px-4 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100"
              >
                Consulter mes travailleurs
              </Link>
            </div>
          </div>
        )}
      </header>
      <main className={clsx('mx-auto max-w-6xl px-4 py-10', className)}>{children}</main>
      <footer className="text-center text-sm text-slate-500 py-6">
        © {new Date().getFullYear()} Working Holiday Jobs
      </footer>
    </>
  );
}
