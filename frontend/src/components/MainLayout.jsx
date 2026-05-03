import { useState } from 'react'
import ChatPanel from './ChatPanel'
import BreadboardCanvas from './BreadboardCanvas'
import RunPanel from './RunPanel'

export default function MainLayout({ circuit, setCircuit, chatExpanded, setChatExpanded }) {
  const [playing, setPlaying] = useState(false)
  const [resetCount, setResetCount] = useState(0)
  const [speed, setSpeed] = useState(1)

  function handleReset() {
    setPlaying(false)
    setResetCount(c => c + 1)
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
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
            <ChatPanel circuit={circuit} setCircuit={setCircuit} />
          </div>
        </div>
      )}
      <div className={`${chatExpanded ? 'w-[45%]' : 'w-[65%]'} border-r border-gray-800`}>
        <BreadboardCanvas circuit={circuit} setCircuit={setCircuit} playing={playing} resetCount={resetCount} speed={speed} />
      </div>
      <div className={`${chatExpanded ? 'w-[25%]' : 'w-[35%]'}`}>
        <RunPanel circuit={circuit} onPlayingChange={setPlaying} onReset={handleReset} onSpeedChange={setSpeed} />
      </div>
    </div>
  )
}
