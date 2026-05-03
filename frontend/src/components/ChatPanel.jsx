import { useState, useRef, useEffect } from 'react'

// P1 owns this file
export default function ChatPanel({ circuit, setCircuit, seedMessage }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! Describe a circuit and I\'ll build it, or upload a schematic PDF above.' }
  ])

  // Inject seeded message from PDF upload
  useEffect(() => {
    if (seedMessage) {
      setMessages((m) => [...m, { role: 'assistant', content: seedMessage }])
    }
  }, [seedMessage])
  const [history, setHistory] = useState([])  // Claude-format history (no system messages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [contextWarning, setContextWarning] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!input.trim() || loading) return
    const userText = input.trim()
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: userText }])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          circuit: circuit,
          history: history,
        }),
      })
      const data = await res.json()

      // Update chat display
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }])

      // Update conversation history for next turn
      setHistory((h) => [
        ...h,
        { role: 'user', content: userText },
        { role: 'assistant', content: data.reply },
      ])

      // Update canvas if circuit changed
      if (data.updated_circuit) setCircuit(data.updated_circuit)

      setContextWarning(data.context_warning)
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: '⚠ Could not reach the backend.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-300">CirKit Agent</span>
        {contextWarning && (
          <span className="text-xs bg-yellow-900 text-yellow-300 px-2 py-1 rounded">
            Context getting long — accuracy may drop
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`text-sm px-3 py-2 rounded-lg max-w-[85%] whitespace-pre-wrap ${
              m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-100'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 text-gray-400 text-sm px-3 py-2 rounded-lg">Thinking…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-gray-800 flex gap-2">
        <input
          className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Describe or modify a circuit…"
          disabled={loading}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 px-4 py-2 rounded-lg text-sm font-medium"
        >
          Send
        </button>
      </div>
    </div>
  )
}
