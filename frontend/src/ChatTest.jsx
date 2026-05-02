import { useState } from 'react'
import ChatPanel from './components/ChatPanel'
import MOCK_CIRCUIT from '../../schema.json'

// Standalone test page — visit /test in the browser
// Shows chat on the left, live circuit JSON on the right
export default function ChatTest() {
  const [circuit, setCircuit] = useState(MOCK_CIRCUIT)

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      <div className="w-1/2 border-r border-gray-800">
        <ChatPanel circuit={circuit} setCircuit={setCircuit} />
      </div>
      <div className="w-1/2 p-4 overflow-y-auto">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Live Circuit JSON</p>
        <pre className="text-xs text-green-400 whitespace-pre-wrap">
          {JSON.stringify(circuit, null, 2)}
        </pre>
      </div>
    </div>
  )
}
