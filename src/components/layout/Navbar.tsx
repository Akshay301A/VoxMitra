import React, { useState } from 'react';
import { Menu, X, ArrowRight, PhoneCall } from 'lucide-react';
import { VoxMitraLogo } from '../common/VoxMitraLogo.tsx';

interface NavbarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
  isAuthenticated: boolean;
  onOpenBookDemo?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onNavigate,
  currentPage,
  isAuthenticated,
  onOpenBookDemo,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Capabilities', href: '#capabilities' },
    { label: 'Product Preview', href: '#preview' },
    { label: 'Industries', href: '#industries' },
    { label: 'Voice & Languages', href: '#voices' },
    { label: 'Integrations', href: '#integrations' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQs', href: '#faqs' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between gap-6">
        {/* Zone 1: Brand Wordmark */}
        <button
          onClick={() => onNavigate('landing')}
          className="text-left group flex items-center focus:outline-hidden"
        >
          <VoxMitraLogo size="md" />
        </button>

        {/* Zone 2: Single-line Clean Nav Links */}
        <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-300">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="whitespace-nowrap shrink-0 hover:text-white transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          {onOpenBookDemo && (
            <button
              onClick={onOpenBookDemo}
              className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors whitespace-nowrap"
            >
              Book a Demo
            </button>
          )}

          {isAuthenticated ? (
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 rounded-lg transition-colors whitespace-nowrap shadow-sm"
            >
              Console
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('login')}
                className="px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors whitespace-nowrap"
              >
                Sign In
              </button>
              <button
                onClick={() => onNavigate('register')}
                className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-lg transition-all whitespace-nowrap shadow-md shadow-indigo-500/20"
              >
                Start Free Trial
              </button>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-400 hover:text-white lg:hidden rounded-lg hover:bg-slate-900"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-950 border-b border-slate-800 px-6 py-4 space-y-3">
          <div className="flex flex-col space-y-2 text-sm font-medium text-slate-300 pb-3 border-b border-slate-800">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex flex-col gap-2 pt-1">
            {onOpenBookDemo && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenBookDemo();
                }}
                className="w-full py-2.5 text-xs font-semibold text-slate-200 bg-slate-900 border border-slate-800 rounded-lg text-center"
              >
                Book a Demo
              </button>
            )}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate(isAuthenticated ? 'dashboard' : 'login');
              }}
              className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg text-center"
            >
              {isAuthenticated ? 'Open Dashboard Console' : 'Sign In / Register'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
