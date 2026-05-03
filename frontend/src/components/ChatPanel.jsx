import { useState, useRef, useEffect } from 'react'

const WELCOME = { role: 'assistant', content: 'Hi! Describe a circuit and I\'ll build it, or ask me to modify the current one.' }

export default function ChatPanel({ circuit, setCircuit }) {
  const [messages, setMessages] = useState([WELCOME])
  const [history, setHistory] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [retryLoading, setRetryLoading] = useState(false)
  const [showApply, setShowApply] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!input.trim() || loading) return
    const userText = input.trim()
    setInput('')
    setShowApply(false)
    setMessages(m => [...m, { role: 'user', content: userText }])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, circuit, history }),
      })
      const data = await res.json()
      console.log('Chat response:', data)
      setMessages(m => [...m, { role: 'assistant', content: data.reply }])
      setHistory(h => [...h, { role: 'user', content: userText }, { role: 'assistant', content: data.reply }])
      if (data.updated_circuit) {
        setCircuit(data.updated_circuit)
        setShowApply(false)
      } else if (userText.toLowerCase().includes('add') ||
                 userText.toLowerCase().includes('connect') ||
                 userText.toLowerCase().includes('fix') ||
                 userText.toLowerCase().includes('change') ||
                 userText.toLowerCase().includes('build') ||
                 userText.toLowerCase().includes('create') ||
                 userText.toLowerCase().includes('make') ||
                 userText.toLowerCase().includes('wire') ||
                 userText.toLowerCase().includes('circuit')) {
        // Agent replied about a circuit change but no JSON came back — show retry
        setShowApply(true)
      }
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: '⚠ Could not reach the backend.' }])
    } finally {
      setLoading(false)
    }
  }

  async function retryCanvas() {
    setRetryLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Output the complete updated circuit JSON now. You MUST use the <circuit>...</circuit> tags. Include ALL components and ALL connections including the ones you just described fixing. Do not explain — just output the circuit.',
          circuit,
          history,
        }),
      })
      const data = await res.json()
      if (data.updated_circuit) {
        setCircuit(data.updated_circuit)
        setShowApply(false)
        setMessages(m => [...m, { role: 'assistant', content: '✅ Canvas updated!' }])
        setHistory(h => [...h,
          { role: 'user', content: 'Output the complete updated circuit JSON now.' },
          { role: 'assistant', content: data.reply }
        ])
      } else {
        setMessages(m => [...m, { role: 'assistant', content: '⚠ Still couldn\'t generate the circuit. Try describing it again more simply.' }])
      }
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: '⚠ Could not reach the backend.' }])
    } finally {
      setRetryLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`relative text-sm px-4 py-2.5 max-w-[80%] whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-blue-600 text-white rounded-2xl rounded-br-md'
                : 'bg-gray-800 text-gray-100 rounded-2xl rounded-bl-md'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 text-gray-400 text-sm px-4 py-2.5 rounded-2xl rounded-bl-md">Computing…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {showApply && !loading && (
        <div className="px-4 py-2 border-t border-gray-800 bg-gray-900">
          <div className="text-xs text-yellow-400 mb-1.5 text-center">Canvas wasn't updated — click to force it:</div>
          <button
            onClick={retryCanvas}
            disabled={retryLoading}
            className="w-full text-sm font-semibold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-3 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors border border-purple-400"
          >
            {retryLoading ? (
              <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> Applying to Canvas…</>
            ) : (
              <>⟳ Apply to Canvas</>
            )}
          </button>
        </div>
      )}

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
