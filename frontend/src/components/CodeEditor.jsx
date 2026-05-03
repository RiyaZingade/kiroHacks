import { useState } from 'react'

export default function CodeEditor({ code, language }) {
  const [copied, setCopied] = useState(false)
  const lines = (code || '').split('\n')

  function copyToClipboard() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{language || 'code'}</span>
        <button
          onClick={copyToClipboard}
          className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded cursor-pointer"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="bg-gray-900 rounded overflow-x-auto max-h-80 overflow-y-auto">
        <pre className="text-xs leading-5 p-3">
          {lines.map((line, i) => (
            <div key={i} className="flex">
              <span className="inline-block w-8 text-right pr-3 text-gray-600 select-none shrink-0">
                {i + 1}
              </span>
              <span className="text-green-400">{line || ' '}</span>
            </div>
          ))}
        </pre>
      </div>
    </div>
  )
}
