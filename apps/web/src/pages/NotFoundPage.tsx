import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="section-container flex min-h-[calc(100vh-16rem)] flex-col items-center justify-center py-20 text-center">
      <p className="text-8xl font-black text-brand-200 dark:text-brand-900">404</p>
      <h1 className="mt-4 text-3xl font-bold">Page not found</h1>
      <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-md">
        Sorry, we couldn't find the page you're looking for. It may have been moved or doesn't exist.
      </p>
      <div className="mt-8 flex flex-wrap gap-3 justify-center">
        <Link to="/" className="btn-primary">
          <Home size={16} /> Go Home
        </Link>
        <Link to="/products" className="btn-secondary">
          <Search size={16} /> Browse Products
        </Link>
      </div>
    </div>
  );
}

