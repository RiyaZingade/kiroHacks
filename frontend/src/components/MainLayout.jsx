import { useState, useRef } from 'react'
import ChatPanel from './ChatPanel'
import BreadboardCanvas from './BreadboardCanvas'
import RunPanel from './RunPanel'
import ProjectsSidebar from './ProjectsSidebar'
import { supabase } from '../lib/supabase'

export default function MainLayout({ circuit, setCircuit, chatExpanded, setChatExpanded, projectId, setProjectId, messages, setMessages, history, setHistory }) {
  const [playing, setPlaying] = useState(false)
  const [resetCount, setResetCount] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [projectsOpen, setProjectsOpen] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('idle') // idle | uploading | error
  const [uploadError, setUploadError] = useState('')
  const [uploadWarning, setUploadWarning] = useState('')
  const fileInputRef = useRef(null)

  // Map types Claude might return to valid sidebar types
  const TYPE_MAP = {
    ic: null, connector: null, crystal: null, pin: null, // unknown → warn
    battery: 'battery_9v', '9v_battery': 'battery_9v', 'battery_9': 'battery_9v',
    'coin_cell': 'battery_coin', capacitor_ceramic: 'capacitor',
    npn: 'transistor_npn', pnp: 'transistor_pnp', bjt: 'transistor_npn',
    op_amp: 'ic_opamp', opamp: 'ic_opamp',
    '555': 'ic_555', ne555: 'ic_555',
    motor: 'motor_dc', dc_motor: 'motor_dc',
    switch: 'switch_toggle', push_button: 'button',
    photoresistor: 'photoresistor', ldr: 'photoresistor',
  }
  const VALID_TYPES = new Set([
    'resistor','led','capacitor','button','battery_9v','battery_coin','power_supply',
    'capacitor_elec','inductor','potentiometer','photoresistor','thermistor',
    'switch_slide','switch_toggle','keypad','led_rgb','display_7seg','lcd_16x2',
    'buzzer','motor_dc','servo','motor_stepper','arduino_uno','arduino_nano',
    'ic_555','ic_shift_reg','ic_logic_and','ic_logic_or','ic_logic_not','ic_opamp',
    'sensor_ultrasonic','sensor_pir','sensor_temp','sensor_light','sensor_tilt','sensor_hall',
    'voltage_reg','transistor_npn','transistor_pnp','mosfet','relay','hbridge','ir_receiver',
  ])

  function handleReset() {
    setPlaying(false)
    setResetCount(c => c + 1)
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''

    const isPdf = file.type === 'application/pdf'
    const isImage = file.type.startsWith('image/')
    if (!isPdf && !isImage) {
      setUploadError('Please upload a PDF or image file.')
      setUploadStatus('error')
      return
    }

    setUploadStatus('uploading')
    setUploadError('')

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
        const unknown = []
        // Convert percent positions to grid [col, row] coords (40x30 grid)
        // and normalize component types to valid sidebar types
        const normalized = {
          ...incoming,
          canvas_mode: 'agent',
          components: (incoming.components ?? []).map((c, i) => {
            let type = c.type
            if (!VALID_TYPES.has(type)) {
              const mapped = TYPE_MAP[type]
              if (mapped) { type = mapped }
              else { unknown.push(`${c.id} (${c.type})`); type = 'resistor' }
            }
            let position = c.position
            const isPower = ['battery_9v','battery_coin','power_supply','arduino_uno','arduino_nano'].includes(type)
            if (c.position_type === 'percent' || (Array.isArray(position) && (position[0] > 40 || position[1] > 30))) {
              if (isPower) {
                // Stack power components in the power zone (negative cols)
                position = [-6, 2 + i * 5]
              } else {
                position = [Math.max(1, Math.round((position[0] / 100) * 78)), Math.max(1, Math.round((position[1] / 100) * 28))]
              }
            } else if (isPower && position[0] >= 0) {
              // Already has grid coords but is a power type — move to power zone
              position = [-6, position[1]]
            }
            return { ...c, type, position, position_type: 'grid' }
          })
        }
        setCircuit(prev => ({ ...prev, ...normalized }))
        if (unknown.length > 0) {
          setUploadWarning(`Note: ${unknown.join(', ')} ${unknown.length === 1 ? 'is' : 'are'} not in the components library and ${unknown.length === 1 ? 'was' : 'were'} placed as a generic component.`)
        } else {
          setUploadWarning('')
        }
      }
      setUploadStatus('idle')
    } catch (err) {
      setUploadError(err.message || 'Upload failed.')
      setUploadStatus('error')
    }
  }

  async function handleSelectProject(pid) {
    setProjectId(pid)
    const { data } = await supabase.from('projects').select('circuit').eq('id', pid).single()
    if (data?.circuit && Object.keys(data.circuit).length > 0) {
      setCircuit(data.circuit)
    }
  }

  function handleNewProject(pid) {
    setProjectId(pid)
    if (pid) {
      setCircuit({
        components: [], connections: [],
        power: { voltage: 5, source: "VCC" },
        code: { language: "arduino", source: "", origin: "agent" },
        run_instructions: { power_requirements: "", wiring_steps: [], software_setup: "", safety_flags: [] },
        canvas_mode: "agent",
        metadata: { name: "Untitled Circuit", entry_point: "B" }
      })
    }
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Projects sidebar */}
      <ProjectsSidebar
        currentProjectId={projectId}
        onSelectProject={handleSelectProject}
        onNewProject={handleNewProject}
        open={projectsOpen}
        onClose={() => setProjectsOpen(false)}
      />

      {/* Chat sidebar */}
      {chatExpanded && (
        <div className="w-[30%] border-r border-gray-800 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
            <span className="text-sm font-semibold text-gray-300">CirKit Agent</span>
            <button
              onClick={() => setChatExpanded(false)}
              className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              title="Collapse sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12H3M21 12l-6-6M21 12l-6 6" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatPanel circuit={circuit} setCircuit={setCircuit} projectId={projectId} messages={messages} setMessages={setMessages} history={history} setHistory={setHistory} />
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className={`${chatExpanded ? 'w-[45%]' : 'w-[65%]'} border-r border-gray-800 flex flex-col`}>
        {/* Canvas toolbar */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-800 shrink-0">
          {!projectsOpen && (
            <button
              onClick={() => setProjectsOpen(true)}
              className="p-1.5 rounded-md bg-gray-800/80 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              title="Open projects"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </button>
          )}

          {/* Upload schematic button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadStatus === 'uploading'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-gray-800/80 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            title="Upload PDF or image schematic to build circuit"
          >
            {uploadStatus === 'uploading' ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                <span>Analyzing…</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>Upload Schematic</span>
              </>
            )}
          </button>
          {uploadStatus === 'error' && (
            <span className="text-xs text-red-400 truncate max-w-[200px]" title={uploadError}>
              {uploadError}
            </span>
          )}
          {uploadWarning && uploadStatus === 'idle' && (
            <span className="text-xs text-yellow-400 truncate max-w-xs" title={uploadWarning}>
              ⚠ {uploadWarning}
            </span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
        <div className="flex-1 overflow-hidden">
          <BreadboardCanvas circuit={circuit} setCircuit={setCircuit} playing={playing} resetCount={resetCount} speed={speed} />
        </div>
      </div>

      {/* Run Panel */}
      <div className={`${chatExpanded ? 'w-[25%]' : 'w-[35%]'}`}>
        <RunPanel circuit={circuit} setCircuit={setCircuit} onPlayingChange={setPlaying} onReset={handleReset} onSpeedChange={setSpeed} />
      </div>
    </div>
  )
}
