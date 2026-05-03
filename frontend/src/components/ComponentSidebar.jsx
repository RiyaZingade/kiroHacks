import { getComponentDef } from './ComponentRenderer'

// P3 owns this file
// Sidebar listing 6 MVP component types — drag onto canvas to place
// Visible in Manual Mode, dimmed in Agent Mode

// Module-level drag state so BreadboardCanvas can read the type during dragover
// (browsers restrict dataTransfer.getData() to drop events only)
let _currentDragType = null
export function getCurrentDragType() { return _currentDragType }

const COMPONENT_TYPES = [
  { type: 'resistor', label: 'Resistor', abbr: 'R', defaultValue: '10kΩ' },
  { type: 'led', label: 'LED', abbr: 'LED', defaultValue: '', defaultColor: 'red' },
  { type: 'capacitor', label: 'Capacitor', abbr: 'C', defaultValue: '100µF' },
  { type: 'button', label: 'Button', abbr: 'BTN', defaultValue: '' },
  { type: 'power_rail', label: 'Power Rail', abbr: 'PWR', defaultValue: '' },
  { type: 'wire', label: 'Wire', abbr: 'W', defaultValue: '' },
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

// Standard circuit schematic icons
function CircuitIcon({ type }) {
  const size = 28
  const common = { xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" }

  const icons = {
    resistor: (
      <svg {...common}>
        <path d="M2 12h3l1.5-4 3 8 3-8 3 8 1.5-4h3" />
      </svg>
    ),
    led: (
      <svg {...common}>
        <polygon points="6,6 6,18 18,12" />
        <line x1="18" y1="6" x2="18" y2="18" />
        <line x1="20" y1="4" x2="22" y2="2" />
        <line x1="20" y1="7" x2="22" y2="5" />
        <polyline points="21,3 22,2 21,1" />
        <polyline points="21,6 22,5 21,4" />
      </svg>
    ),
    capacitor: (
      <svg {...common}>
        <line x1="2" y1="12" x2="10" y2="12" />
        <line x1="10" y1="6" x2="10" y2="18" />
        <line x1="14" y1="6" x2="14" y2="18" />
        <line x1="14" y1="12" x2="22" y2="12" />
      </svg>
    ),
    button: (
      <svg {...common}>
        <line x1="2" y1="16" x2="8" y2="16" />
        <line x1="16" y1="16" x2="22" y2="16" />
        <circle cx="8" cy="16" r="1.5" />
        <circle cx="16" cy="16" r="1.5" />
        <line x1="8" y1="16" x2="12" y2="8" />
      </svg>
    ),
    power_rail: (
      <svg {...common}>
        <line x1="8" y1="6" x2="8" y2="18" />
        <line x1="12" y1="9" x2="12" y2="15" />
        <line x1="16" y1="11" x2="16" y2="13" />
        <line x1="2" y1="12" x2="8" y2="12" />
      </svg>
    ),
    wire: (
      <svg {...common}>
        <line x1="2" y1="12" x2="22" y2="12" />
      </svg>
    ),
  }

  return (
    <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center text-gray-300">
      {icons[type] || null}
    </div>
  )
}

// Small color swatch for the sidebar preview
function TypePreview({ type }) {
  return <CircuitIcon type={type} />
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
          <span>{ct.label} <span className="text-gray-500">({ct.abbr})</span></span>
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
