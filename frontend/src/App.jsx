import { useState } from 'react'
import MainLayout from './components/MainLayout'
import ChatTest from './ChatTest'

export default function App() {
  const [circuit, setCircuit] = useState(null) // Start with no circuit
  const isTest = window.location.pathname === '/test'

  if (isTest) return <ChatTest />
  return <MainLayout circuit={circuit} setCircuit={setCircuit} />
}
