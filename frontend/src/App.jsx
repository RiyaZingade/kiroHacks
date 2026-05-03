import { useState, useEffect } from 'react'
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
    uploadPdf: p.get('upload') === 'pdf',
    autoPlay: p.get('play') === 'true',
    autoGenerate: p.get('generate') === 'true',
  }
}

export default function App() {
  const params = getParams()
  const [circuit, setCircuit] = useState(() => ({
    ...EMPTY_CIRCUIT,
    canvas_mode: params.mode === 'manual' ? 'manual' : 'agent',
  }))
  const path = window.location.pathname

  if (path === '/app') {
    return (
      <>
        <MainLayout
          circuit={circuit}
          setCircuit={setCircuit}
          initialChatOpen={params.chatOpen}
          initialUploadPdf={params.uploadPdf}
          initialAutoPlay={params.autoPlay}
          initialAutoGenerate={params.autoGenerate}
        />
        <ChatWidget circuit={circuit} setCircuit={setCircuit} initialOpen={params.chatOpen} />
      </>
    )
  }

  return <LandingPage />
}
