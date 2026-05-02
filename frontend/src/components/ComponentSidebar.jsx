import { getComponentDef } from './ComponentRenderer'

// P3 owns this file
// Sidebar listing 6 MVP component types — drag onto canvas to place
// Visible in Manual Mode, dimmed in Agent Mode

// Module-level drag state so BreadboardCanvas can read the type during dragover
// (browsers restrict dataTransfer.getData() to drop events only)
let _currentDragType = null
export function getCurrentDragType() { return _currentDragType }

const COMPONENT_TYPES = [
  { type: 'resistor', label: 'Resistor', defaultValue: '10kΩ' },
  { type: 'led', label: 'LED', defaultValue: '', defaultColor: 'red' },
  { type: 'capacitor', label: 'Capacitor', defaultValue: '100µF' },
  { type: 'button', label: 'Button', defaultValue: '' },
  { type: 'power_rail', label: 'Power Rail', defaultValue: '' },
  { type: 'wire', label: 'Wire', defaultValue: '' },
]

// ID prefixes per type
const ID_PREFIX = {
  resistor: 'R',
  led: 'LED',
  capacitor: 'C',
  button: 'BTN',
  power_rail: 'PWR',
  wire: 'W',
}

export function generateId(type, existingComponents) {
  const prefix = ID_PREFIX[type] ?? 'X'
  const existing = existingComponents.filter((c) => c.type === type)
  return `${prefix}${existing.length + 1}`
}

// Small color swatch for the sidebar preview
function TypePreview({ type }) {
  const def = getComponentDef(type)
  return (
    <div
      className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white"
      style={{ backgroundColor: def.color }}
    >
      {def.label}
    </div>
  )
}

export default function ComponentSidebar({ mode, onAddComponent }) {
  const isManual = mode === 'manual'

  const handleDragStart = (e, compType) => {
    _currentDragType = compType.type
    e.dataTransfer.setData('component-type', compType.type)
    e.dataTransfer.setData('default-value', compType.defaultValue)
    if (compType.defaultColor) {
      e.dataTransfer.setData('default-color', compType.defaultColor)
    }
    e.dataTransfer.effectAllowed = 'copy'
    // Hide the default browser drag ghost — the Konva canvas shows its own preview
    const ghost = document.createElement('div')
    ghost.style.width = '1px'
    ghost.style.height = '1px'
    ghost.style.opacity = '0'
    ghost.style.position = 'absolute'
    ghost.style.top = '-1000px'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    requestAnimationFrame(() => document.body.removeChild(ghost))
  }

  return (
    <div
      className={`flex flex-col gap-1 p-2 border-r border-gray-800 bg-gray-950 w-44 shrink-0 transition-opacity ${
        isManual ? 'opacity-100' : 'opacity-40 pointer-events-none'
      }`}
    >
      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-1">
        Components
      </span>
      {COMPONENT_TYPES.map((ct) => (
        <div
          key={ct.type}
          draggable={isManual}
          onDragStart={(e) => handleDragStart(e, ct)}
          className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
            isManual
              ? 'text-gray-200 hover:bg-gray-800 cursor-grab active:cursor-grabbing'
              : 'text-gray-500 cursor-default'
          }`}
        >
          <TypePreview type={ct.type} />
          <span>{ct.label}</span>
        </div>
      ))}
      {!isManual && (
        <p className="text-[10px] text-gray-600 px-1 mt-2">
          Switch to Manual Mode to drag components
        </p>
      )}
    </div>
  )
}
