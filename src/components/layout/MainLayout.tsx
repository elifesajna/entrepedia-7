import { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';

interface MainLayoutProps {
  children: ReactNode;
  showNavbar?: boolean;
  showBottomNav?: boolean;
}

export function MainLayout({ 
  children, 
  showNavbar = true, 
  showBottomNav = true 
}: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {showNavbar && <Navbar />}
      <main className={`${showNavbar ? 'pt-16' : ''} ${showBottomNav ? 'pb-20 md:pb-0' : ''}`}>
        {children}
      </main>
      {showBottomNav && <BottomNav />}
    </div>
  );
}
