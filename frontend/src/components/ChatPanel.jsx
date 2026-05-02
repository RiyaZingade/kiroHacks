import { useState } from 'react'

// P1 owns this file
// POST /api/chat → { reply, updated_circuit }
export default function ChatPanel({ circuit, setCircuit }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! Describe a circuit or ask me to modify the current one.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function send() {
    if (!input.trim()) return
    const userMsg = { role: 'user', content: input }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, circuit_id: circuit?.metadata?.id })
      })
      const data = await res.json()
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }])
      if (data.updated_circuit) setCircuit(data.updated_circuit)
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Error reaching backend.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Chat</h2>
      <div className="flex-1 overflow-y-auto flex flex-col gap-2">
        {messages.map((m, i) => (
          <div key={i} className={`text-sm px-3 py-2 rounded-lg max-w-[85%] ${m.role === 'user' ? 'self-end bg-blue-600' : 'self-start bg-gray-800'}`}>
            {m.content}
          </div>
        ))}
        {loading && <div className="text-xs text-gray-500 self-start">Thinking…</div>}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 bg-gray-800 rounded px-3 py-2 text-sm outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Describe or modify a circuit…"
        />
        <button onClick={send} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-sm">Send</button>
      </div>
    </div>
  )
}
