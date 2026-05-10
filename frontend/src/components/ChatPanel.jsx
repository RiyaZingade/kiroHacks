import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const WELCOME = { role: 'assistant', content: 'Hi! Describe a circuit and I\'ll build it, or ask me to modify the current one.' }

export default function ChatPanel({ circuit, setCircuit, projectId, messages, setMessages, history, setHistory }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [retryLoading, setRetryLoading] = useState(false)
  const [showApply, setShowApply] = useState(false)
  const [fileUploading, setFileUploading] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    const isPdf = file.type === 'application/pdf'
    const isImage = file.type.startsWith('image/')
    if (!isPdf && !isImage) return

    setFileUploading(true)
    setMessages(m => [...m, { role: 'user', file: { name: file.name, type: isPdf ? 'pdf' : 'image' } }])
    try {
      const form = new FormData()
      form.append('file', file)
      const endpoint = isPdf ? '/api/upload-pdf' : '/api/upload-image'
      const res = await fetch(endpoint, { method: 'POST', body: form })
      if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const incoming = data.circuit ?? data.updated_circuit
      if (incoming) {
        // Normalize percent positions to grid
        const VALID_TYPES = new Set(['resistor','led','capacitor','button','battery_9v','battery_coin','power_supply','capacitor_elec','inductor','potentiometer','photoresistor','thermistor','switch_slide','switch_toggle','keypad','led_rgb','display_7seg','lcd_16x2','buzzer','motor_dc','servo','motor_stepper','arduino_uno','arduino_nano','ic_555','ic_shift_reg','ic_logic_and','ic_logic_or','ic_logic_not','ic_opamp','sensor_ultrasonic','sensor_pir','sensor_temp','sensor_light','sensor_tilt','sensor_hall','voltage_reg','transistor_npn','transistor_pnp','mosfet','relay','hbridge','ir_receiver'])
        const POWER_COMP = new Set(['battery_9v','battery_coin','power_supply','arduino_uno','arduino_nano'])
        const normalized = {
          ...incoming,
          canvas_mode: 'agent',
          components: (incoming.components ?? []).map((c, i) => {
            const type = VALID_TYPES.has(c.type) ? c.type : 'resistor'
            const isPower = POWER_COMP.has(type)
            let position = c.position
            if (c.position_type === 'percent' || (Array.isArray(position) && (position[0] > 40 || position[1] > 30))) {
              position = isPower ? [-6, 2 + i * 5] : [Math.max(1, Math.round((position[0]/100)*78)), Math.max(1, Math.round((position[1]/100)*28))]
            } else if (isPower && position[0] >= 0) {
              position = [-6, position[1]]
            }
            return { ...c, type, position, position_type: 'grid' }
          })
        }
        setCircuit(normalized)
        const reply = data.reply || `Circuit loaded from ${file.name} — ${normalized.components.length} components found.`
        setMessages(m => [...m, { role: 'assistant', content: reply }])
        setHistory(h => [...h, { role: 'user', content: `Uploaded ${file.name}` }, { role: 'assistant', content: reply }])
      } else {
        setMessages(m => [...m, { role: 'assistant', content: `⚠ Couldn't extract a circuit from ${file.name}. Try describing it in the chat instead.` }])
      }
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', content: `⚠ Upload failed: ${err.message}` }])
    } finally {
      setFileUploading(false)
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }, [input])

  // Load messages when project changes — don't reset if we already have messages
  useEffect(() => {
    if (!projectId) return  // no project: keep whatever messages are already in state
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

  async function send() {
    if (!input.trim() || loading) return
    const userText = input.trim()
    setInput('')
    setShowApply(false)
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
      setMessages(m => [...m, { role: 'assistant', content: data.reply }])
      setHistory(h => [...h, { role: 'user', content: userText }, { role: 'assistant', content: data.reply }])
      if (data.updated_circuit) {
        setCircuit(data.updated_circuit)
        setShowApply(false)
      } else {
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
          message: 'The circuit has floating components with no connections. Fix it NOW: output a complete corrected circuit JSON inside <circuit>...</circuit> tags. Every component needs at least 2 connections. Wire everything in a single series loop: power(+) → components → power(−). LED anode toward power, cathode toward GND. Resistor before every LED. Do not explain — just output the fixed circuit.',
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
              {m.file ? (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center shrink-0">
                    {m.file.type === 'pdf' ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate text-xs">{m.file.name}</div>
                    <div className="text-[10px] opacity-70">{m.file.type.toUpperCase()}</div>
                  </div>
                </div>
              ) : m.content}
            </div>
          </div>
        ))}
        {(loading || fileUploading) && (
          <div className="flex justify-start">
            <div className="bg-gray-800 text-gray-400 text-sm px-4 py-2.5 rounded-2xl rounded-bl-md">
              {fileUploading ? 'Analyzing file…' : 'Computing…'}
            </div>
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

      <div className="px-4 py-3 border-t border-gray-800 flex gap-2 items-end">
        {/* File upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg"
          className="hidden"
          onChange={handleFileUpload}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading || fileUploading}
          className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-40 shrink-0 transition-colors"
          title="Upload PDF or image schematic"
        >
          {fileUploading ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          )}
        </button>
        <textarea
          ref={textareaRef}
          rows={1}
          className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500 resize-none overflow-hidden"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Describe or modify a circuit…"
          disabled={loading}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 px-4 py-2 rounded-lg text-sm font-medium shrink-0"
        >
          Send
        </button>
      </div>
    </div>
  )
}
