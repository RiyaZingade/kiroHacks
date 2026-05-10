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

const WELCOME = { role: 'assistant', content: "Hi! Describe a circuit and I'll build it, or ask me to modify the current one." }

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
  const [projectId, setProjectId] = useState(null)
  const [messages, setMessages] = useState([WELCOME])
  const [history, setHistory] = useState([])

  if (path === '/app') {
    return (
      <>
        <MainLayout
          circuit={circuit}
          setCircuit={setCircuit}
          chatExpanded={chatExpanded}
          setChatExpanded={setChatExpanded}
          projectId={projectId}
          setProjectId={setProjectId}
          messages={messages}
          setMessages={setMessages}
          history={history}
          setHistory={setHistory}
        />
        <ChatWidget
          circuit={circuit}
          setCircuit={setCircuit}
          expanded={chatExpanded}
          setExpanded={setChatExpanded}
          initialOpen={params.chatOpen}
          projectId={projectId}
          messages={messages}
          setMessages={setMessages}
          history={history}
          setHistory={setHistory}
        />
      </>
    )
  }

  return <LandingPage />
}
