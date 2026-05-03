import { useState } from 'react'
import ChatPanel from './ChatPanel'

export default function ChatWidget({ circuit, setCircuit, initialOpen = false }) {
  const [open, setOpen] = useState(initialOpen)

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {open && (
        <div className="mb-3 w-[380px] h-[520px] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
            <span className="text-sm font-semibold text-gray-300">CirKit Agent</span>
            <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white text-lg leading-none">&times;</button>
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
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}
    </div>
  )
}
