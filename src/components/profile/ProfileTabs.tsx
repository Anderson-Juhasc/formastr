'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface ProfileTabsProps {
  identifier: string;
}

interface Tab {
  label: string;
  href: string;
  isActive: boolean;
}

export function ProfileTabs({ identifier }: ProfileTabsProps) {
  const pathname = usePathname();
  const basePath = `/${encodeURIComponent(identifier)}`;
  const [showMenu, setShowMenu] = useState(false);

  const tabs: Tab[] = [
    { label: 'Notes', href: basePath, isActive: pathname === basePath || pathname === `${basePath}/notes` },
    { label: 'Following', href: `${basePath}/following`, isActive: pathname === `${basePath}/following` },
    { label: 'Followers', href: `${basePath}/followers`, isActive: pathname === `${basePath}/followers` },
    { label: 'Relays', href: `${basePath}/relays`, isActive: pathname === `${basePath}/relays` },
  ];

  const activeTab = tabs.find((tab) => tab.isActive) || tabs[0];

  const tabClass = (isActive: boolean) =>
    `py-3 border-b-3 font-semibold transition-colors ${
      isActive
        ? 'border-primary text-primary'
        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
    }`;

  return (
    <div className="border-b-2 border-border">
      {/* Desktop: show all tabs */}
      <nav className="hidden sm:flex gap-8">
        {tabs.map((tab) => (
          <Link key={tab.href} href={tab.href} className={tabClass(tab.isActive)}>
            {tab.label}
          </Link>
        ))}
      </nav>

      {/* Mobile: show current tab with dropdown */}
      <div className="sm:hidden flex items-center justify-between">
        <span className="py-3 font-semibold text-primary border-b-3 border-primary">
          {activeTab.label}
        </span>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Show tabs menu"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-1 w-36 bg-card border border-border rounded-lg shadow-lg z-20">
                {tabs.map((tab, index) => (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors ${
                      index === 0 ? 'rounded-t-lg' : ''
                    } ${index === tabs.length - 1 ? 'rounded-b-lg' : ''} ${
                      tab.isActive ? 'text-primary font-semibold' : 'text-foreground'
                    }`}
                    onClick={() => setShowMenu(false)}
                  >
                    {tab.label}
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
