import React, { useState, useEffect } from 'react'
import CodeEditor from './CodeEditor'
import RunInstructions from './RunInstructions'

export default function RunPanel({ circuit, onPlayingChange, onReset, onSpeedChange, setCircuit }) {
  const [code, setCode] = useState(circuit?.code?.source ?? '')
  const [loading, setLoading] = useState(false)
  const [canvasLoading, setCanvasLoading] = useState(false)
  const [error, setError] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  const components = circuit?.components ?? []
  const connections = circuit?.connections ?? []
  const hasCircuit = components.length > 0 || connections.length > 0
  const hasCode = code.trim() !== '' && !code.startsWith('//')

  useEffect(() => {
    if (!hasCircuit) {
      setError(null)
      setPlaying(false)
      onPlayingChange?.(false)
    }
  }, [hasCircuit])

  async function generateCode() {
    if (!hasCircuit) {
      setError('Nothing on the canvas — add components first')
      return
    }
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

  async function generateCanvas() {
    if (!hasCode) {
      setError('No code to generate from — paste or type code first')
      return
    }
    setCanvasLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Generate a circuit from this code. Only return the circuit JSON, no modifications to the code:\n\n${code}`,
          circuit: null,
          history: [],
        }),
      })
      const data = await res.json()
      if (data.updated_circuit) {
        setCircuit(data.updated_circuit)
      } else {
        setError('Could not generate circuit from this code — try simplifying it')
      }
    } catch {
      setError('Failed to reach backend')
    } finally {
      setCanvasLoading(false)
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
    <div className="flex flex-col h-full p-4 gap-4 overflow-hidden">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Run Panel</h2>

      {/* Play Controls */}
      {hasCircuit && (
        <div className="flex items-center gap-1.5">
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
        </div>
      )}

      {/* Generate Buttons */}
      <div className="flex gap-2">
        <button
          onClick={generateCode}
          disabled={loading}
          className="flex-1 text-xs bg-blue-700 hover:bg-blue-600 disabled:opacity-50 px-3 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1"
        >
          {loading ? (
            <><span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating…</>
          ) : (
            'Generate Code'
          )}
        </button>
        <button
          onClick={generateCanvas}
          disabled={canvasLoading}
          className="flex-1 text-xs bg-purple-600 hover:bg-purple-500 disabled:opacity-50 px-3 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1"
        >
          {canvasLoading ? (
            <><span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating…</>
          ) : (
            'Generate Canvas'
          )}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-900/30 rounded p-2">⚠ {error}</p>
      )}

      {/* Resizable split: Code Editor + Terminal-style Run Instructions */}
      <SplitPane
        code={code}
        onCodeChange={setCode}
        runInstructions={circuit?.run_instructions}
      />
    </div>
  )
}

function SplitPane({ code, onCodeChange, runInstructions }) {
  const [splitPercent, setSplitPercent] = useState(60)
  const containerRef = React.useRef(null)
  const dragging = React.useRef(false)

  function onMouseDown(e) {
    e.preventDefault()
    dragging.current = true
    const onMove = (ev) => {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((ev.clientY - rect.top) / rect.height) * 100
      setSplitPercent(Math.max(20, Math.min(80, pct)))
    }
    const onUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div ref={containerRef} className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Code Editor */}
      <div style={{ height: `${splitPercent}%` }} className="min-h-0 overflow-hidden">
        <CodeEditor code={code || ''} language="arduino" onCodeChange={onCodeChange} />
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        className="h-2 flex items-center justify-center cursor-row-resize shrink-0 group hover:bg-gray-800 transition-colors"
      >
        <div className="w-10 h-0.5 bg-gray-600 rounded-full group-hover:bg-blue-500 transition-colors" />
      </div>

      {/* Terminal-style Run Instructions */}
      <div style={{ height: `${100 - splitPercent}%` }} className="min-h-0 bg-gray-950 border border-gray-800 rounded-lg overflow-y-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-800 bg-gray-900 rounded-t-lg sticky top-0">
          <div className="flex gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          </div>
          <span className="text-[10px] text-gray-500 font-mono">run-instructions</span>
        </div>
        <div className="p-3 font-mono text-xs text-gray-300 space-y-2">
          {runInstructions?.power_requirements ? (
            <>
              <p className="text-yellow-400">$ power</p>
              <p className="pl-2">⚡ {runInstructions.power_requirements}</p>
              {runInstructions.wiring_steps?.length > 0 && (
                <>
                  <p className="text-yellow-400 mt-2">$ wiring</p>
                  {runInstructions.wiring_steps.map((s, i) => (
                    <p key={i} className="pl-2 text-gray-400">{i + 1}. {s}</p>
                  ))}
                </>
              )}
              {runInstructions.software_setup && (
                <>
                  <p className="text-yellow-400 mt-2">$ setup</p>
                  <p className="pl-2">{runInstructions.software_setup}</p>
                </>
              )}
              {runInstructions.safety_flags?.length > 0 && (
                <>
                  <p className="text-red-400 mt-2">$ safety</p>
                  {runInstructions.safety_flags.map((f, i) => (
                    <p key={i} className="pl-2 text-red-300">⚠ {f}</p>
                  ))}
                </>
              )}
            </>
          ) : (
            <p className="text-gray-600">$ awaiting circuit...</p>
          )}
        </div>
      </div>
    </div>
  )
}
