import BreadboardCanvas from './BreadboardCanvas'
import RunPanel from './RunPanel'

// Two-panel layout: canvas (65%) | run (35%). Chat is now a floating widget.
// BreadboardCanvas accepts {children} so P4 can inject <CurrentFlowAnimation> as a Konva <Layer>
export default function MainLayout({ circuit, setCircuit }) {
  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <div className="w-[65%] border-r border-gray-800">
        <BreadboardCanvas circuit={circuit} setCircuit={setCircuit}>
          {/* P4: inject <CurrentFlowAnimation connections={circuit.connections} playing={playing} /> here */}
        </BreadboardCanvas>
      </div>
      <div className="w-[35%]">
        <RunPanel circuit={circuit} />
      </div>
    </div>
  )
}
