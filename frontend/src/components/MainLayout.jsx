import { useState } from 'react'
import ChatPanel from './ChatPanel'
import BreadboardCanvas from './BreadboardCanvas'
import RunPanel from './RunPanel'

// Three-panel layout: chat (35%) | canvas (40%) | run (25%)
export default function MainLayout({ circuit, setCircuit }) {
  const [playing, setPlaying] = useState(false)

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <div className="w-[35%] border-r border-gray-800">
        <ChatPanel circuit={circuit} setCircuit={setCircuit} />
      </div>
      <div className="w-[40%] border-r border-gray-800">
        <BreadboardCanvas circuit={circuit} setCircuit={setCircuit} playing={playing} />
      </div>
      <div className="w-[25%]">
        <RunPanel circuit={circuit} onPlayingChange={setPlaying} />
      </div>
    </div>
  )
}
