import { useState } from 'react'
import ChatPanel from './ChatPanel'
import BreadboardCanvas from './BreadboardCanvas'
import RunPanel from './RunPanel'

// Two-panel layout: canvas (65%) | run (35%). Chat is now a floating widget.
export default function MainLayout({ circuit, setCircuit }) {
  const [playing, setPlaying] = useState(false)

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <div className="w-[65%] border-r border-gray-800">
        <BreadboardCanvas circuit={circuit} setCircuit={setCircuit} />
      </div>
      <div className="w-[35%]">
        <RunPanel circuit={circuit} />
      </div>
    </div>
  )
}
