import { useState } from 'react'
import ChatPanel from './ChatPanel'
import BreadboardCanvas from './BreadboardCanvas'
import RunPanel from './RunPanel'
import PDFUpload from './PDFUpload'

// Three-panel layout: chat (35%) | canvas (40%) | run (25%)
export default function MainLayout({ circuit, setCircuit }) {
  const [seedMessage, setSeedMessage] = useState(null)

  function handleCircuitExtracted(circuit) {
    if (circuit) {
      console.log('Setting circuit from PDF upload:', circuit)
      setCircuit(circuit)
    }
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <div className="w-[35%] border-r border-gray-800 flex flex-col">
        <PDFUpload
          onCircuitExtracted={handleCircuitExtracted}
          onSeedMessage={(msg) => setSeedMessage(msg)}
        />
        <ChatPanel
          circuit={circuit}
          setCircuit={setCircuit}
          seedMessage={seedMessage}
        />
      </div>
      <div className="w-[40%] border-r border-gray-800">
        <BreadboardCanvas circuit={circuit} setCircuit={setCircuit} />
      </div>
      <div className="w-[25%]">
        <RunPanel circuit={circuit} />
      </div>
    </div>
  )
}
