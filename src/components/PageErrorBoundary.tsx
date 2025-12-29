'use client';

import { ReactNode } from 'react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

function PageErrorFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center p-8 max-w-md">
        <div className="text-destructive mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Something went wrong
        </h1>
        <p className="text-muted-foreground mb-6">
          We encountered an error while loading this page. This might be due to a temporary issue or too much data being loaded at once.
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            onClick={() => window.location.reload()}
            variant="primary"
          >
            Reload page
          </Button>
          <Link href="/">
            <Button variant="secondary">
              Go home
            </Button>
          </Link>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          If this keeps happening,{' '}
          <a
            href="https://github.com/Anderson-Juhasc/formastr/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            report the issue
          </a>
        </p>
      </div>
    </div>
  );
}

interface PageErrorBoundaryProps {
  children: ReactNode;
}

export function PageErrorBoundary({ children }: PageErrorBoundaryProps) {
  return (
    <ErrorBoundary fallback={<PageErrorFallback />}>
      {children}
    </ErrorBoundary>
  );
}
