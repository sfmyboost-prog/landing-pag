
import React from 'react';
import { ViewState } from '../types';

interface NavbarProps {
  currentView: ViewState;
  setView: (v: ViewState) => void;
  cartCount: number;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, setView, cartCount }) => {
  return (
    <nav className="fixed top-0 w-full bg-white border-b border-gray-100 z-50 h-16 flex items-center px-6">
      <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
        <div 
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => setView('LANDING')}
        >
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform">
            E
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900">EliteCommerce</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <button 
            onClick={() => setView('LANDING')}
            className={`${currentView === 'LANDING' ? 'text-indigo-600' : 'text-gray-500'} hover:text-indigo-600 transition-colors`}
          >
            Home
          </button>
          <button 
            onClick={() => setView('USER')}
            className={`${currentView === 'USER' ? 'text-indigo-600' : 'text-gray-500'} hover:text-indigo-600 transition-colors`}
          >
            My Panel
          </button>
          <button 
            onClick={() => setView('ADMIN')}
            className={`${currentView === 'ADMIN' ? 'text-indigo-600' : 'text-gray-500'} hover:text-indigo-600 transition-colors flex items-center gap-1`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            Admin
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative cursor-pointer group" onClick={() => setView('USER')}>
            <svg className="w-6 h-6 text-gray-700 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] font-bold px-1.5 rounded-full ring-2 ring-white">
                {cartCount}
              </span>
            )}
          </div>
          <button className="md:hidden">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"/></svg>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
