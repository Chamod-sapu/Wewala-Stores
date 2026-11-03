import { Link } from 'react-router-dom';
import { Leaf, Facebook, Instagram, Twitter, Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-slate-900 text-slate-300 dark:border-slate-800">
      <div className="section-container py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 font-bold text-white">
              <Leaf className="text-brand-400" size={22} />
              <span className="text-lg">Wewala<span className="text-brand-400">.</span></span>
            </Link>
            <p className="mt-3 text-sm text-slate-400">
              Fresh Sri Lankan groceries, premium Ceylon teas, and organic farm produce delivered to your door.
            </p>
            <div className="mt-4 flex gap-3">
              {[Facebook, Instagram, Twitter].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-400 transition hover:bg-brand-600 hover:text-white"
                  aria-label="Social link"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Shop</h3>
            <ul className="mt-4 space-y-2.5">
              {[
                { to: '/products?category=grocery-staples', label: 'Grocery & Staples' },
                { to: '/products?category=fresh-farm-produce', label: 'Fresh Produce' },
                { to: '/products?category=ceylon-teas-beverages', label: 'Ceylon Teas' },
                { to: '/products', label: 'All Products' },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-sm text-slate-400 transition hover:text-brand-400">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Company</h3>
            <ul className="mt-4 space-y-2.5">
              {[
                { to: '/about', label: 'About Us' },
                { to: '/contact', label: 'Contact' },
                { to: '/privacy', label: 'Privacy Policy' },
                { to: '/terms', label: 'Terms of Service' },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-sm text-slate-400 transition hover:text-brand-400">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Get in Touch</h3>
            <ul className="mt-4 space-y-3">
              {[
                { icon: MapPin, text: '142 Temple Road, Wewala, Western Province' },
                { icon: Phone, text: '+94 77 123 4567' },
                { icon: Mail, text: 'hello@wewala.lk' },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-2.5 text-sm text-slate-400">
                  <Icon size={15} className="mt-0.5 shrink-0 text-brand-400" />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-2 border-t border-slate-800 pt-8 sm:flex-row sm:justify-between">
          <p className="text-xs text-slate-500">© {year} Wewala Stores. All rights reserved.</p>
          <p className="text-xs text-slate-600">Powered by Supabase · Built with ♥ in Sri Lanka</p>
        </div>
      </div>
    </footer>
  );
}

