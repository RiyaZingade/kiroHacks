import { useState } from 'react'
import ChatPanel from './ChatPanel'
import BreadboardCanvas from './BreadboardCanvas'
import RunPanel from './RunPanel'
import ProjectsSidebar from './ProjectsSidebar'
import { supabase } from '../lib/supabase'

export default function MainLayout({ circuit, setCircuit, chatExpanded, setChatExpanded, projectId, setProjectId }) {
  const [playing, setPlaying] = useState(false)
  const [resetCount, setResetCount] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [projectsOpen, setProjectsOpen] = useState(false)

  function handleReset() {
    setPlaying(false)
    setResetCount(c => c + 1)
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
            <ChatPanel circuit={circuit} setCircuit={setCircuit} projectId={projectId} />
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
