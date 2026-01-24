'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  // Don't show navbar on home page
  if (pathname === '/') {
    return null;
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/learn', label: 'Learn' },
    { href: '/traditional', label: 'Traditional' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/profile', label: 'Profile' },
  ];

  return (
    <nav className="bg-white dark:bg-slate-800 shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 flex justify-between items-center gap-4">
        <Link href="/dashboard" className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400 hover:opacity-80 transition flex-shrink-0">
          HanziLern
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex gap-4 lg:gap-8 flex-1 justify-center">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-semibold text-sm lg:text-base transition ${
                pathname === link.href
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right Section */}
        <div className="flex gap-2 sm:gap-4 items-center flex-shrink-0">
          <button
            onClick={handleSignOut}
            className="hidden sm:block px-3 sm:px-6 py-2 text-sm sm:text-base text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700 rounded-lg transition"
          >
            Sign Out
          </button>
          <Link href="/settings" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>

          {/* Mobile Hamburger Menu */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-slate-50 dark:bg-slate-700 border-t border-slate-200 dark:border-slate-600">
          <div className="px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className={`block px-4 py-2 rounded-lg font-semibold text-sm transition ${
                  pathname === link.href
                    ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={() => {
                handleSignOut();
                setIsMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2 rounded-lg font-semibold text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-slate-600 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
