import { useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { cpp } from '@codemirror/lang-cpp'
import { vscodeDark } from '@uiw/codemirror-theme-vscode'

export default function CodeEditor({ code, language, onCodeChange }) {
  const [copied, setCopied] = useState(false)

  function copyToClipboard() {
    if (!code) return
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="relative h-full flex flex-col">
      <div className="flex-1 min-h-0 rounded-lg border border-gray-800 overflow-hidden">
        <CodeMirror
          value={code || ''}
          onChange={(val) => onCodeChange?.(val)}
          theme={vscodeDark}
          extensions={[cpp()]}
          placeholder="Paste or type code here…"
          height="100%"
          style={{ height: '100%', fontSize: '12px' }}
          basicSetup={{
            lineNumbers: true,
            foldGutter: false,
            highlightActiveLine: true,
            bracketMatching: true,
            autocompletion: false,
          }}
        />
      </div>
      {/* Copy icon */}
      {code && (
        <button
          onClick={copyToClipboard}
          className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors z-10"
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
