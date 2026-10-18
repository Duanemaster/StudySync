'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Renders AI (markdown) responses with proper formatting.
 * Styled with plain Tailwind classes, so no typography plugin is needed.
 */
export default function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="text-sm leading-relaxed text-slate-800 break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-lg font-bold text-slate-900 mt-4 mb-2 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold text-slate-900 mt-4 mb-2 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-bold text-indigo-700 mt-3 mb-1.5 first:mt-0">{children}</h3>
          ),
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc pl-5 mb-2 space-y-1 marker:text-indigo-400">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 mb-2 space-y-1 marker:text-indigo-500 marker:font-semibold">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-900">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 underline hover:text-indigo-800"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-indigo-200 pl-3 my-2 text-slate-600 italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-3 border-slate-200" />,
          code: ({ className, children }) => {
            const isBlock = /language-/.test(className || '')
            return isBlock ? (
              <code className="block bg-slate-900 text-slate-100 rounded-lg p-3 my-2 text-xs overflow-x-auto">
                {children}
              </code>
            ) : (
              <code className="bg-slate-100 text-indigo-700 rounded px-1.5 py-0.5 text-[0.85em]">
                {children}
              </code>
            )
          },
          pre: ({ children }) => <pre className="my-2">{children}</pre>,
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full text-xs border border-slate-200 rounded">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="bg-slate-50 border border-slate-200 px-2 py-1 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => <td className="border border-slate-200 px-2 py-1">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}