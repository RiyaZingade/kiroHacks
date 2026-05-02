import { useState } from 'react'

// P4 owns this file
// Shows generated code + run instructions from circuit JSON
// POST /api/generate-code → { code, language }
export default function RunPanel({ circuit }) {
  const [code, setCode] = useState(circuit?.code?.source ?? '')
  const [loading, setLoading] = useState(false)
  const run = circuit?.run_instructions ?? {}

  async function generateCode() {
    setLoading(true)
    try {
      const res = await fetch('/api/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ circuit_id: circuit?.metadata?.id, language: 'arduino' })
      })
      const data = await res.json()
      setCode(data.code)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-y-auto">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Run Panel</h2>

      {/* Code */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Code</span>
          <button onClick={generateCode} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded">
            {loading ? 'Generating…' : 'Generate'}
          </button>
        </div>
        {/* TODO P4: replace with CodeEditor.jsx (syntax highlighting) */}
        <pre className="bg-gray-900 rounded p-3 text-xs text-green-400 overflow-x-auto whitespace-pre-wrap">
          {code || '// Click Generate to produce code from the circuit'}
        </pre>
      </div>

      {/* Run Instructions */}
      {run.power_requirements && (
        <div className="flex flex-col gap-2 text-sm">
          <p className="text-yellow-400 font-medium">⚡ {run.power_requirements}</p>
          {run.wiring_steps?.length > 0 && (
            <ol className="list-decimal list-inside text-gray-300 text-xs space-y-1">
              {run.wiring_steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          )}
          {run.safety_flags?.length > 0 && (
            <div className="bg-red-900/40 border border-red-700 rounded p-2 text-xs text-red-300 space-y-1">
              {run.safety_flags.map((f, i) => <p key={i}>⚠ {f}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
