import ChatPanel from './ChatPanel'
import BreadboardCanvas from './BreadboardCanvas'
import RunPanel from './RunPanel'

// Three-panel layout: chat (35%) | canvas (40%) | run (25%)
// BreadboardCanvas accepts {children} so P4 can inject <CurrentFlowAnimation> as a Konva <Layer>
export default function MainLayout({ circuit, setCircuit }) {
  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <div className="w-[35%] border-r border-gray-800">
        <ChatPanel circuit={circuit} setCircuit={setCircuit} />
      </div>
      <div className="w-[40%] border-r border-gray-800">
        <BreadboardCanvas circuit={circuit} setCircuit={setCircuit}>
          {/* P4: inject <CurrentFlowAnimation connections={circuit.connections} playing={playing} /> here */}
        </BreadboardCanvas>
      </div>
      <div className="w-[25%]">
        <RunPanel circuit={circuit} />
      </div>
    </div>
  )
}
