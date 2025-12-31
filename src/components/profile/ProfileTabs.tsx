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
    `py-3 border-b-2 font-medium transition-all ${
      isActive
        ? 'border-primary text-primary'
        : 'border-transparent text-muted-foreground hover:text-foreground'
    }`;

  return (
    <div className="border-b border-border/60">
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
        <span className="py-3 font-medium text-primary border-b-2 border-primary">
          {activeTab.label}
        </span>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
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
              <div className="absolute right-0 mt-2 w-36 bg-card border border-border/60 rounded-xl shadow-[var(--shadow-lg)] z-20 py-1 overflow-hidden">
                {tabs.map((tab) => (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`block w-full px-4 py-2 text-left text-sm hover:bg-muted/50 transition-colors ${
                      tab.isActive ? 'text-primary font-medium' : 'text-foreground'
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
