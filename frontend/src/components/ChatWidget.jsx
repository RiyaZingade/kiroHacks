import { useState } from 'react'
import ChatPanel from './ChatPanel'

const ExpandIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 12l6-6M3 12l6 6" />
  </svg>
)

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

export default function ChatWidget({ circuit, setCircuit, expanded, setExpanded, initialOpen = false }) {
  const [open, setOpen] = useState(initialOpen)

  if (expanded) return null

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {open && (
        <div className="mb-3 w-[380px] h-[520px] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
            <span className="text-sm font-semibold text-gray-300">CirKit Agent</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setExpanded(true); setOpen(false) }}
                className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                title="Expand to sidebar"
              >
                <ExpandIcon />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                title="Close"
              >
                <CloseIcon />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatPanel circuit={circuit} setCircuit={setCircuit} />
          </div>
        </div>
      )}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="w-12 h-12 bg-blue-600 hover:bg-blue-500 rounded-full shadow-lg flex items-center justify-center transition-colors"
          aria-label="Open chat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <rect x="4" y="6" width="16" height="12" rx="2" />
            <line x1="8" y1="10" x2="12" y2="10" />
            <line x1="12" y1="10" x2="12" y2="14" />
            <line x1="12" y1="14" x2="16" y2="14" />
          </svg>
        </button>
      )}
    </div>
  )
}
