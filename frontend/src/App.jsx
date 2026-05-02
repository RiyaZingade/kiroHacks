import { useState } from 'react'
import MainLayout from './components/MainLayout'
import ChatTest from './ChatTest'
import MOCK_CIRCUIT from '../../schema.json'

export default function App() {
  const [circuit, setCircuit] = useState(MOCK_CIRCUIT)
  const isTest = window.location.pathname === '/test'

  if (isTest) return <ChatTest />
  return <MainLayout circuit={circuit} setCircuit={setCircuit} />
}
