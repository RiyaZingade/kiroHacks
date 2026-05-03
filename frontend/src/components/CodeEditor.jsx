import { useState, useRef } from 'react'

export default function CodeEditor({ code, language, onCodeChange }) {
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef(null)
  const lineNumRef = useRef(null)

  const lines = (code || '').split('\n')
  const lineCount = Math.max(lines.length, 1)

  function copyToClipboard() {
    if (!code) return
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleScroll() {
    if (lineNumRef.current && textareaRef.current) {
      lineNumRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  return (
    <div className="relative h-full flex flex-col">
      <div className="flex-1 min-h-0 flex bg-gray-900 rounded-lg border border-gray-800 overflow-hidden focus-within:ring-1 focus-within:ring-blue-500">
        {/* Line numbers */}
        <div
          ref={lineNumRef}
          className="py-3 pl-2 pr-1 text-right select-none overflow-hidden shrink-0 bg-gray-900"
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="text-[10px] leading-5 text-gray-600 font-mono">{i + 1}</div>
          ))}
        </div>
        {/* Editor */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => onCodeChange?.(e.target.value)}
          onScroll={handleScroll}
          placeholder="Paste or type code here…"
          className="flex-1 bg-transparent py-3 px-2 text-xs text-green-400 font-mono leading-5 resize-none outline-none"
          spellCheck={false}
        />
      </div>
      {/* Copy icon */}
      {code && (
        <button
          onClick={copyToClipboard}
          className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors z-10"
          title="Copy to clipboard"
        >
          {copied ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          )}
        </button>
      )}
      {copied && (
        <div className="absolute top-2 right-12 bg-green-600 text-white text-[10px] font-medium px-2 py-1 rounded shadow-lg animate-pulse z-10">
          Copied to clipboard
        </div>
      )}
    </div>
  )
}
