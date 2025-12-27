'use client';

import { useEffect, useCallback, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRTab {
  label: string;
  value: string;
}

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  tabs: QRTab[];
  title?: string;
}

export function QRModal({ isOpen, onClose, tabs, title }: QRModalProps) {
  const [activeTab, setActiveTab] = useState(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      setActiveTab(0);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || tabs.length === 0) return null;

  const currentTab = tabs[activeTab];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-popover text-popover-foreground rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4 border-2 border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {title && (
          <h2 className="text-lg font-bold text-popover-foreground mb-4 pr-8">
            {title}
          </h2>
        )}

        {tabs.length > 1 && (
          <div className="flex gap-1 mb-4 p-1 bg-muted rounded-lg border-2 border-border">
            {tabs.map((tab, index) => (
              <button
                key={tab.label}
                onClick={() => setActiveTab(index)}
                className={`flex-1 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                  activeTab === index
                    ? 'bg-card text-card-foreground shadow-md border-2 border-border'
                    : 'text-muted-foreground hover:text-foreground border-2 border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-center p-4 bg-white rounded-lg border-2 border-border">
          <QRCodeSVG value={currentTab.value} size={200} level="M" />
        </div>

        <p className="mt-4 text-xs text-muted-foreground text-center break-all font-mono">
          {currentTab.value}
        </p>
      </div>
    </div>
  );
}
