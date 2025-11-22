import Head from 'next/head';
import Link from 'next/link';
import { ReactNode } from 'react';
import clsx from 'clsx';

interface LayoutProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Layout({ title = 'Working Holiday Jobs', children, className }: LayoutProps) {
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
          <nav className="flex gap-4 text-sm">
            <Link href="/jobs" className="hover:text-brand-500">
              Browse Jobs
            </Link>
            <Link href="/apply" className="hover:text-brand-500">
              Apply
            </Link>
            <Link href="/employer/dashboard" className="hover:text-brand-500">
              Employer Dashboard
            </Link>
            <Link href="/auth/login" className="hover:text-brand-500">
              Login
            </Link>
          </nav>
        </div>
      </header>
      <main className={clsx('mx-auto max-w-6xl px-4 py-10', className)}>{children}</main>
      <footer className="text-center text-sm text-slate-500 py-6">
        © {new Date().getFullYear()} Working Holiday Jobs
      </footer>
    </>
  );
}
