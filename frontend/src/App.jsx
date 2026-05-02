import { useState } from 'react'
import MainLayout from './components/MainLayout'
import ChatWidget from './components/ChatWidget'

const EMPTY_CIRCUIT = {
  components: [],
  connections: [],
  power: { voltage: 5, source: "VCC" },
  code: { language: "arduino", source: "", origin: "agent" },
  run_instructions: { power_requirements: "", wiring_steps: [], software_setup: "", safety_flags: [] },
  canvas_mode: "agent",
  metadata: { name: "Untitled Circuit", entry_point: "B" }
}

export default function App() {
  const [circuit, setCircuit] = useState(EMPTY_CIRCUIT)

  return (
    <>
      <MainLayout circuit={circuit} setCircuit={setCircuit} />
      <ChatWidget circuit={circuit} setCircuit={setCircuit} />
    </>
  )
}
