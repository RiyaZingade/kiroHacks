import { useState, useEffect } from 'react'
import CodeEditor from './CodeEditor'
import RunInstructions from './RunInstructions'

export default function RunPanel({ circuit, onPlayingChange, onReset, onSpeedChange }) {
  const [code, setCode] = useState(circuit?.code?.source ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  const connections = circuit?.connections ?? []
  const hasConnections = connections.length > 0

  // Reset code when board is cleared
  useEffect(() => {
    if (!hasConnections) {
      setCode('')
      setError(null)
      setPlaying(false)
      onPlayingChange?.(false)
    }
  }, [hasConnections])

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
    onReset?.()
  }

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-y-auto">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Run Panel</h2>

      {/* Play Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {code && (
            <>
              <button
                onClick={togglePlay}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
                  playing ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-green-600 hover:bg-green-500'
                }`}
                title={playing ? 'Pause' : 'Play'}
              >
                {playing ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                )}
              </button>
              <button
                onClick={reset}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
                title="Reset"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0115.36-5.36M20 15a9 9 0 01-15.36 5.36" />
                </svg>
              </button>
              <div className="flex items-center gap-1 ml-2 bg-gray-800 rounded-full px-2 py-1">
                {[0.5, 1, 2, 3].map((s) => (
                  <button
                    key={s}
                    onClick={() => { setSpeed(s); onSpeedChange?.(s) }}
                    className={`px-2 py-0.5 text-[10px] font-medium rounded-full transition-colors ${
                      speed === s ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
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
