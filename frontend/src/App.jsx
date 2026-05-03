import { useState } from 'react'
import MainLayout from './components/MainLayout'
import ChatWidget from './components/ChatWidget'
import LandingPage from './components/LandingPage'

const EMPTY_CIRCUIT = {
  components: [],
  connections: [],
  power: { voltage: 5, source: "VCC" },
  code: { language: "arduino", source: "", origin: "agent" },
  run_instructions: { power_requirements: "", wiring_steps: [], software_setup: "", safety_flags: [] },
  canvas_mode: "agent",
  metadata: { name: "Untitled Circuit", entry_point: "B" }
}

function getParams() {
  const p = new URLSearchParams(window.location.search)
  return {
    mode: p.get('mode'),
    chatOpen: p.get('chat') === 'open',
  }
}

export default function App() {
  const params = getParams()
  const path = window.location.pathname

  const [circuit, setCircuit] = useState(() => ({
    ...EMPTY_CIRCUIT,
    canvas_mode: params.mode === 'manual' ? 'manual' : 'agent',
  }))
  const [chatExpanded, setChatExpanded] = useState(false)

  if (path === '/app') {
    return (
      <>
        <MainLayout circuit={circuit} setCircuit={setCircuit} chatExpanded={chatExpanded} setChatExpanded={setChatExpanded} />
        <ChatWidget circuit={circuit} setCircuit={setCircuit} expanded={chatExpanded} setExpanded={setChatExpanded} initialOpen={params.chatOpen} />
      </>
    )
  }

  return <LandingPage />
}
