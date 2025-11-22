import Link from 'next/link';
import { Layout } from '../components/Layout';

export default function NotFoundPage() {
  return (
    <Layout title="Page not found">
      <div className="text-center space-y-4 py-20">
        <p className="text-sm uppercase tracking-wide text-brand-600">404</p>
        <h1 className="text-4xl font-bold">Page not found</h1>
        <p className="text-slate-600">The resource you are looking for may be on another visa run.</p>
        <Link href="/" className="text-brand-600">
          Back home
        </Link>
      </div>
    </Layout>
  );
}
