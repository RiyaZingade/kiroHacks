import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const WELCOME = { role: 'assistant', content: 'Hi! Describe a circuit and I\'ll build it, or ask me to modify the current one.' }

export default function ChatPanel({ circuit, setCircuit, projectId }) {
  const [messages, setMessages] = useState([WELCOME])
  const [history, setHistory] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [contextWarning, setContextWarning] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load messages when project changes
  useEffect(() => {
    if (!projectId) { setMessages([WELCOME]); setHistory([]); return }
    loadMessages(projectId)
  }, [projectId])

  async function loadMessages(pid) {
    const { data } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('project_id', pid)
      .order('created_at', { ascending: true })
    if (data && data.length > 0) {
      setMessages([WELCOME, ...data])
      setHistory(data)
    } else {
      setMessages([WELCOME])
      setHistory([])
    }
  }

  async function saveMessage(role, content) {
    if (!projectId) return
    await supabase.from('chat_messages').insert({ project_id: projectId, role, content })
  }

  async function saveCircuit(circuitData) {
    if (!projectId) return
    await supabase.from('projects').update({ circuit: circuitData }).eq('id', projectId)
  }

  async function send() {
    if (!input.trim() || loading) return
    const userText = input.trim()
    setInput('')
    setMessages(m => [...m, { role: 'user', content: userText }])
    setLoading(true)
    await saveMessage('user', userText)

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
      await saveMessage('assistant', data.reply)
      if (data.updated_circuit) {
        setCircuit(data.updated_circuit)
        await saveCircuit(data.updated_circuit)
      }
      setContextWarning(data.context_warning)
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: '⚠ Could not reach the backend.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
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
