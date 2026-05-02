import { useState } from 'react'
import MainLayout from './components/MainLayout'

const MOCK_CIRCUIT = { components: [], connections: [] };

export default function App() {
  const [circuit, setCircuit] = useState(MOCK_CIRCUIT)

  return <MainLayout circuit={circuit} setCircuit={setCircuit} />
}
