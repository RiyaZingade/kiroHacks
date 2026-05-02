import { useState } from 'react'
import CodeEditor from './CodeEditor'
import RunInstructions from './RunInstructions'

export default function RunPanel({ circuit, onPlayingChange }) {
  const [code, setCode] = useState(circuit?.code?.source ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [playing, setPlaying] = useState(false)

  const connections = circuit?.connections ?? []
  const hasConnections = connections.length > 0

  async function generateCode() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('http://localhost:8000/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ circuit, language: 'arduino' })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Server error ${res.status}`)
      }
      const data = await res.json()
      setCode(data.code)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function togglePlay() {
    const next = !playing
    setPlaying(next)
    onPlayingChange?.(next)
  }

  function reset() {
    setPlaying(false)
    onPlayingChange?.(false)
  }

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-y-auto">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Run Panel</h2>

      {/* Generate + Play Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {code && (
            <>
              <button
                onClick={togglePlay}
                className="text-xs bg-green-700 hover:bg-green-600 px-3 py-1.5 rounded cursor-pointer"
              >
                {playing ? '⏸ Pause' : '▶ Play'}
              </button>
              <button
                onClick={reset}
                className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded cursor-pointer"
              >
                ↺ Reset
              </button>
            </>
          )}
        </div>
        <button
          onClick={generateCode}
          disabled={!hasConnections || loading}
          className="text-xs bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 px-3 py-1.5 rounded cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating…
            </span>
          ) : 'Generate'}
        </button>
      </div>

      {!hasConnections && (
        <p className="text-xs text-gray-500">Add components and connections first</p>
      )}

      {error && (
        <p className="text-xs text-red-400 bg-red-900/30 rounded p-2">⚠ {error}</p>
      )}

      {/* Code Editor */}
      <CodeEditor code={code || '// Click Generate to produce code from the circuit'} language="arduino" />

      {/* Run Instructions */}
      <RunInstructions runInstructions={circuit?.run_instructions} />
    </div>
  )
}
