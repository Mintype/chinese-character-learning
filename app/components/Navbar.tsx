'use client';

import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
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
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/profile', label: 'Profile' },
  ];

  return (
    <nav className="bg-white dark:bg-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-8 py-6 flex justify-between items-center">
        <Link href="/dashboard" className="text-3xl font-bold text-red-600 dark:text-red-400 hover:opacity-80 transition">
          HanziLern
        </Link>
        <div className="flex gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-semibold transition ${
                pathname === link.href
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex gap-4 items-center">
          <button
            onClick={handleSignOut}
            className="px-6 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700 rounded-lg transition"
          >
            Sign Out
          </button>
          <Link href="/settings" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">
            <svg className="w-6 h-6 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
        </div>
      </div>
    </nav>
  );
}
