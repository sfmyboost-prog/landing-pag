
import React, { useState } from 'react';
import { ViewState } from '../types';

interface NavbarProps {
  currentView: ViewState;
  setView: (v: ViewState) => void;
  cartCount: number;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, setView, cartCount }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleMobileNav = (view: ViewState) => {
    setView(view);
    setIsMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 w-full z-50">
      <div className="bg-white border-b border-gray-100 h-16 flex items-center px-4 md:px-6 lg:px-8 relative z-20 transition-all duration-300">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => setView('LANDING')}
          >
            <div className="w-8 h-8 md:w-9 md:h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform shadow-indigo-200 shadow-lg">
              A
            </div>
            <span className="text-lg md:text-xl font-bold tracking-tight text-gray-900 group-hover:text-indigo-700 transition-colors">Amar Bazari</span>
          </div>

          <div className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium">
            <button 
              onClick={() => setView('LANDING')}
              className={`${currentView === 'LANDING' ? 'text-indigo-600' : 'text-gray-500'} hover:text-indigo-600 transition-colors px-2 py-1`}
            >
              Home
            </button>
            <button 
              onClick={() => setView('USER')}
              className={`${currentView === 'USER' ? 'text-indigo-600' : 'text-gray-500'} hover:text-indigo-600 transition-colors px-2 py-1`}
            >
              Dibba
            </button>
            <button 
              onClick={() => setView('ADMIN')}
              className={`${currentView === 'ADMIN' ? 'text-indigo-600' : 'text-gray-500'} hover:text-indigo-600 transition-colors flex items-center gap-1 px-2 py-1`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              Admin
            </button>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <div className="relative cursor-pointer group p-1" onClick={() => setView('USER')}>
              <svg className="w-6 h-6 text-gray-700 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-indigo-600 text-white text-[10px] font-bold px-1.5 rounded-full ring-2 ring-white">
                  {cartCount}
                </span>
              )}
            </div>
            
            <button 
              className="md:hidden p-1 text-gray-600 focus:outline-none hover:text-indigo-600 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"/></svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <div 
        className={`md:hidden absolute top-16 left-0 w-full bg-white border-b border-gray-100 shadow-xl transition-all duration-300 ease-in-out transform origin-top z-10 ${
          isMenuOpen ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="p-4 space-y-2 flex flex-col">
           <button 
             onClick={() => handleMobileNav('LANDING')}
             className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-colors ${currentView === 'LANDING' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}
           >
             Home
           </button>
           <button 
             onClick={() => handleMobileNav('USER')}
             className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-colors flex justify-between items-center ${currentView === 'USER' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}
           >
             <span>Dibba</span>
             {cartCount > 0 && <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full">{cartCount}</span>}
           </button>
           <button 
             onClick={() => handleMobileNav('ADMIN')}
             className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 ${currentView === 'ADMIN' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
             Admin Panel
           </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
