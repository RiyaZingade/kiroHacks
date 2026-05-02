import { useState } from 'react'
import MainLayout from './components/MainLayout'
import MOCK_CIRCUIT from './mock-circuit.json'

export default function App() {
  const [circuit, setCircuit] = useState(MOCK_CIRCUIT)

  return <MainLayout circuit={circuit} setCircuit={setCircuit} />
}
