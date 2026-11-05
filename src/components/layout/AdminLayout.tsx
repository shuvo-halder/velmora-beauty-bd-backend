import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '@/src/lib/utils';
import { ChevronRight } from 'lucide-react';

export function AdminLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative min-h-screen bg-muted/40 print:bg-white print:min-h-0">
      <div className="print:hidden">
        <Sidebar isOpen={isSidebarOpen} onToggle={() => setSidebarOpen(!isSidebarOpen)} />
      </div>
      
      <div className={cn(
        "flex min-h-screen flex-col transition-all duration-300 ease-in-out print:ml-0 print:block print:min-h-0",
        isSidebarOpen ? "md:ml-64" : "md:ml-16"
      )}>
        <div className="print:hidden">
          <Header onMenuClick={() => setSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
        </div>
        
        <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full print:p-0 print:m-0 print:max-w-none print:w-full print:block">
          {pathnames.length > 0 && (
            <nav className="flex items-center text-sm text-muted-foreground mb-6 overflow-x-auto whitespace-nowrap py-1 print:hidden" aria-label="Breadcrumb">
              <Link to="/" className="hover:text-foreground transition-colors shrink-0">Home</Link>
              {pathnames.map((value, index) => {
                const to = `/${pathnames.slice(0, index + 1).join('/')}`;
                const isLast = index === pathnames.length - 1;
                const title = value.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                return (
                  <React.Fragment key={to}>
                    <ChevronRight className="w-4 h-4 mx-1 opacity-50 shrink-0" />
                    {isLast ? (
                      <span className="text-foreground font-medium shrink-0" aria-current="page">{title}</span>
                    ) : (
                      <Link to={to} className="hover:text-foreground transition-colors shrink-0">
                        {title}
                      </Link>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}

