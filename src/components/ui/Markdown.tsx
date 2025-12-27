'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface MarkdownProps {
  content: string;
  className?: string;
}

const components: Components = {
  // Headings
  h1: ({ children }) => (
    <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-bold mt-3 mb-2">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-bold mt-2 mb-1">{children}</h3>
  ),

  // Paragraphs
  p: ({ children }) => (
    <p className="mb-2 last:mb-0">{children}</p>
  ),

  // Links
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline break-all"
    >
      {children}
    </a>
  ),

  // Lists
  ul: ({ children }) => (
    <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="ml-2">{children}</li>
  ),

  // Code
  code: ({ className, children }) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return (
        <code className="block bg-muted text-foreground p-3 rounded-lg text-sm font-mono overflow-x-auto mb-2">
          {children}
        </code>
      );
    }
    return (
      <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-2">{children}</pre>
  ),

  // Blockquote
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary/50 pl-4 italic text-muted-foreground mb-2">
      {children}
    </blockquote>
  ),

  // Horizontal rule
  hr: () => <hr className="border-border my-4" />,

  // Bold and italic
  strong: ({ children }) => (
    <strong className="font-bold">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic">{children}</em>
  ),

  // Strikethrough (GFM)
  del: ({ children }) => (
    <del className="line-through text-muted-foreground">{children}</del>
  ),

  // Tables (GFM)
  table: ({ children }) => (
    <div className="overflow-x-auto mb-2">
      <table className="min-w-full border border-border rounded-lg">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-muted">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-border">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-semibold">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2">{children}</td>
  ),

  // Images - render inline for markdown
  img: ({ src, alt }) => (
    <img
      src={src}
      alt={alt || ''}
      className="max-w-full h-auto rounded-lg my-2"
      loading="lazy"
    />
  ),
};

export function Markdown({ content, className = '' }: MarkdownProps) {
  return (
    <div className={`prose-sm ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
