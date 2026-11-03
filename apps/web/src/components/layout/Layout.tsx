import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { CartDrawer } from './CartDrawer';

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="print:hidden">
        <Navbar />
      </div>
      <main className="flex-1">
        <Outlet />
      </main>
      <div className="print:hidden">
        <Footer />
        <CartDrawer />
      </div>
    </div>
  );
}

