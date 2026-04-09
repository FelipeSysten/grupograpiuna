import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Tv, Newspaper, Mic, Video, Info, LayoutDashboard, Eye } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../hooks/useAuth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export const Navbar = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [stats, setStats] = useState<any>(null);
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'site_stats', 'global'), (doc) => {
      if (doc.exists()) {
        setStats(doc.data());
      }
    });
    return () => unsubscribe();
  }, []);

  const navItems = [
    { name: 'Home', path: '/', icon: Info },
    { name: 'TV Grapiúna', path: '/tv', icon: Tv },
    { name: 'Notícias', path: '/noticias', icon: Newspaper },
    { name: 'HUB73', path: '/hub73', icon: Video },
    { name: 'Podcasts', path: '/podcasts', icon: Mic },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      {/* Top Stats Bar */}
      <div className="bg-gray-900 text-white py-1.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
          <div className="flex items-center gap-4">
            <span className="text-red-500">AO VIVO:</span>
              <span className="animate-pulse flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
              TV GRAPIÚNA AO VIVO
            </span>
          </div>
          {stats && (
            <div className="flex items-center gap-2 text-gray-400">
              <Eye size={12} className="text-red-500" />
              <span>{stats.totalAccesses?.toLocaleString('pt-BR')} ACESSOS AO PORTAL</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center gap-2">
  <img 
    src="/assets/grupograpiuna.png" 
    alt="Grupo Grapiúna" 
    className="h-12 w-auto object-contain"
  />
</Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-red-600 flex items-center gap-2",
                  location.pathname === item.path ? "text-red-600" : "text-gray-600"
                )}
              >
                <item.icon size={18} />
                {item.name}
              </Link>
            ))}
            {user && (
              <Link
                to="/admin"
                className={cn(
                  "text-sm font-medium transition-colors hover:text-red-600 flex items-center gap-2",
                  location.pathname === "/admin" ? "text-red-600" : "text-gray-600"
                )}
              >
                <LayoutDashboard size={18} />
                Admin
              </Link>
            )}
            <Link 
              to="/anuncie" 
              className="bg-red-600 text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-red-700 transition-colors"
            >
              ANUNCIE
            </Link>
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-600 hover:text-gray-900 focus:outline-none"
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 py-4 px-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={cn(
                "block px-3 py-2 rounded-md text-base font-medium flex items-center gap-3",
                location.pathname === item.path ? "bg-red-50 text-red-600" : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <item.icon size={20} />
              {item.name}
            </Link>
          ))}
          <Link
            to="/anuncie"
            onClick={() => setIsOpen(false)}
            className="block w-full text-center bg-red-600 text-white px-3 py-3 rounded-md text-base font-bold"
          >
            ANUNCIE CONOSCO
          </Link>
        </div>
      )}
    </nav>
  );
};
