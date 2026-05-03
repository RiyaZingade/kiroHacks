import { Group, Rect, Circle, Line, Text, Ellipse } from 'react-konva'

// P3 owns this file
// Maps component type → Konva shape fallback (geometric shapes)
// Fritzing SVGs deferred per 45-min rule — shapes ship first

const CELL = 20

// Type → visual config + pin definitions
// ALL pin offsets are INTEGER cell units so they land exactly on grid dots.
// Components are drawn centered around their pin axis.
const COMPONENT_DEFS = {
  resistor: {
    color: '#a47149',
    width: 3,
    height: 1,
    label: 'R',
    pins: {
      pin1: [0, 0],
      pin2: [3, 0],
    },
  },
  led: {
    color: '#ef4444',
    width: 1,
    height: 3,
    label: 'LED',
    pins: {
      anode: [0, 0],
      cathode: [0, 2],
    },
  },
  capacitor: {
    color: '#3b82f6',
    width: 3,
    height: 1,
    label: 'C',
    pins: {
      pin1: [0, 0],
      pin2: [3, 0],
    },
  },
  button: {
    color: '#8b5cf6',
    width: 2,
    height: 1,
    label: 'BTN',
    pins: {
      pin1: [0, 0],
      pin2: [2, 0],
    },
  },
  power_rail: {
    color: '#dc2626',
    width: 4,
    height: 1,
    label: 'PWR',
    pins: {
      pin1: [0, 0],
      pin2: [4, 0],
    },
  },
  wire: {
    color: '#6b7280',
    width: 2,
    height: 1,
    label: 'W',
    pins: {
      pin1: [0, 0],
      pin2: [2, 0],
    },
  },
}

// Get the definition for a component type, with a generic fallback
export function getComponentDef(type) {
  return COMPONENT_DEFS[type] ?? {
    color: '#6b7280',
    width: 2,
    height: 1,
    label: '?',
    pins: { pin1: [0, 0], pin2: [2, 0] },
  }
}

// Rotate a pin offset [col, row] by the given angle (0, 90, 180, 270)
function rotateOffset(offCol, offRow, rotation) {
  switch (rotation) {
    case 90:  return [-offRow, offCol]
    case 180: return [-offCol, -offRow]
    case 270: return [offRow, -offCol]
    default:  return [offCol, offRow]
  }
}

// Get effective width/height after rotation
export function getRotatedSize(type, rotation = 0) {
  const def = getComponentDef(type)
  if (rotation === 90 || rotation === 270) {
    return { width: def.height, height: def.width }
  }
  return { width: def.width, height: def.height }
}

// Resolve a pin's absolute pixel position given a component (with rotation)
// Adds CELL offset to match the grid padding (grid dots start at CELL, not 0)
export function getPinPosition(component) {
  const def = getComponentDef(component.type)
  const [col, row] = component.position
  const rotation = component.rotation ?? 0
  const result = {}
  for (const [pinName, [offCol, offRow]] of Object.entries(def.pins)) {
    const [rCol, rRow] = rotateOffset(offCol, offRow, rotation)
    result[pinName] = {
      x: (col + rCol) * CELL + CELL,
      y: (row + rRow) * CELL + CELL,
    }
  }
  return result
}

// Resistor color band lookup
const BAND_COLORS = ['#000', '#8B4513', '#f00', '#f90', '#ff0', '#0a0', '#00f', '#808', '#888', '#fff']
// Multiplier bands: 1, 10, 100, 1k, 10k, 100k, 1M
const MULT_COLORS = ['#000', '#8B4513', '#f00', '#f90', '#ff0', '#0a0', '#00f']
const TOLERANCE_GOLD = '#DAA520'

function getResistorBands(value) {
  if (!value) return [BAND_COLORS[1], BAND_COLORS[0], BAND_COLORS[3], TOLERANCE_GOLD] // default 10kΩ
  // Parse value string like "220", "10k", "4.7kΩ", "10kΩ"
  const cleaned = value.replace(/[Ωω\s]/gi, '').toLowerCase()
  let ohms = parseFloat(cleaned)
  if (cleaned.endsWith('k')) ohms = parseFloat(cleaned) * 1000
  else if (cleaned.endsWith('m')) ohms = parseFloat(cleaned) * 1000000
  if (isNaN(ohms) || ohms <= 0) return [BAND_COLORS[1], BAND_COLORS[0], BAND_COLORS[3], TOLERANCE_GOLD]

  // Normalize to 2 significant digits
  let mult = 0
  let sig = ohms
  while (sig >= 100) { sig /= 10; mult++ }
  while (sig < 10 && mult > 0) { sig *= 10; mult-- }
  const d1 = Math.floor(sig / 10) % 10
  const d2 = Math.round(sig) % 10
  return [
    BAND_COLORS[d1] || '#000',
    BAND_COLORS[d2] || '#000',
    MULT_COLORS[mult] || '#000',
    TOLERANCE_GOLD,
  ]
}

export default function ComponentRenderer({
  component,
  isSelected,
  selectedPin,
  onSelect,
  onPinClick,
  onMove,
  mode,
}) {
  const def = getComponentDef(component.type)
  const [col, row] = component.position
  const x = col * CELL + CELL
  const y = row * CELL + CELL
  const w = def.width * CELL
  const h = def.height * CELL
  const rotation = component.rotation ?? 0
  const isDraggable = mode === 'manual'

  // Determine LED fill color from component data
  const fillColor =
    component.type === 'led' && component.color
      ? component.color
      : def.color

  // Calculate label position: fixed 6px gap above the top edge of the component body
  const LABEL_GAP = 6
  const FONT_SIZE = 10
  const topEdge = (() => {
    const halfCell = CELL / 2
    switch (component.type) {
      case 'led':       return 0          // ellipse starts at y=0 (center at CELL, radiusY ~ CELL)
      case 'capacitor': return -halfCell   // selection rect starts at -halfCell
      case 'button':    return -halfCell
      case 'power_rail': return -2
      case 'wire':      return -2
      default:          return -halfCell   // resistor body at -halfCell
    }
  })()
  const labelY = topEdge - LABEL_GAP - FONT_SIZE

  const renderShape = () => {
    // All shapes drawn in their DEFAULT (0°) orientation.
    // The Group handles rotation via Konva's rotation prop.
    const halfCell = CELL / 2

    switch (component.type) {
      case 'led':
        // Vertical 1×3: dome-shaped LED with two pin legs
        {
          const ledColor = fillColor
          const dimColor = fillColor + '60'
          return (
            <>
              {/* Pin legs */}
              <Line points={[-3, 0, -3, CELL * 0.4]} stroke="#9ca3af" strokeWidth={1.5} />
              <Line points={[3, 0, 3, CELL * 0.4]} stroke="#9ca3af" strokeWidth={1.5} />
              {/* Anode leg longer marker */}
              <Line points={[-5, -2, -1, -2]} stroke="#9ca3af" strokeWidth={1} />
              {/* Flat base */}
              <Rect
                x={-halfCell + 2}
                y={CELL * 0.4}
                width={CELL - 4}
                height={4}
                fill={ledColor}
                opacity={0.8}
              />
              {/* LED dome body */}
              <Circle
                x={0}
                y={CELL * 0.9}
                radius={halfCell - 1}
                fill={ledColor}
                stroke={isSelected ? '#facc15' : '#ffffff30'}
                strokeWidth={isSelected ? 2 : 1}
                opacity={0.9}
              />
              {/* Inner glow highlight */}
              <Circle
                x={-2}
                y={CELL * 0.75}
                radius={3}
                fill="#ffffff"
                opacity={0.35}
                listening={false}
              />
              {/* Cathode pin at bottom */}
              <Line points={[-3, CELL * 1.5, -3, CELL * 2]} stroke="#9ca3af" strokeWidth={1.5} />
              <Line points={[3, CELL * 1.5, 3, CELL * 2]} stroke="#9ca3af" strokeWidth={1.5} />
            </>
          )
        }
      case 'capacitor':
        // Horizontal 3×1: two vertical parallel plates in the middle
        {
          const midX = (3 * CELL) / 2
          return (
            <>
              <Line
                points={[midX - 3, -halfCell + 2, midX - 3, halfCell - 2]}
                stroke={fillColor}
                strokeWidth={3}
              />
              <Line
                points={[midX + 3, -halfCell + 2, midX + 3, halfCell - 2]}
                stroke={fillColor}
                strokeWidth={3}
              />
              <Line
                points={[0, 0, midX - 3, 0]}
                stroke={fillColor}
                strokeWidth={1.5}
              />
              <Line
                points={[midX + 3, 0, 3 * CELL, 0]}
                stroke={fillColor}
                strokeWidth={1.5}
              />
              {isSelected && (
                <Rect
                  x={-2}
                  y={-halfCell}
                  width={3 * CELL + 4}
                  height={CELL}
                  stroke="#facc15"
                  strokeWidth={2}
                  cornerRadius={2}
                />
              )}
            </>
          )
        }
      case 'button':
        // Round tactile push button with pin legs
        return (
          <>
            {/* Pin legs */}
            <Line points={[0, 0, CELL * 0.3, 0]} stroke="#9ca3af" strokeWidth={1.5} />
            <Line points={[2 * CELL - CELL * 0.3, 0, 2 * CELL, 0]} stroke="#9ca3af" strokeWidth={1.5} />
            {/* Button base */}
            <Circle
              x={CELL}
              y={0}
              radius={halfCell}
              fill="#4b5563"
              stroke={isSelected ? '#facc15' : '#6b7280'}
              strokeWidth={isSelected ? 2 : 1.5}
            />
            {/* Button cap */}
            <Circle
              x={CELL}
              y={0}
              radius={halfCell - 4}
              fill="#9ca3af"
              stroke="#d1d5db"
              strokeWidth={1}
            />
            {/* Highlight */}
            <Circle
              x={CELL - 2}
              y={-2}
              radius={3}
              fill="#ffffff"
              opacity={0.25}
              listening={false}
            />
          </>
        )
      case 'power_rail':
        return (
          <Line
            points={[0, 0, 4 * CELL, 0]}
            stroke={fillColor}
            strokeWidth={3}
            dash={[6, 3]}
          />
        )
      case 'wire':
        return (
          <Line
            points={[0, 0, 2 * CELL, 0]}
            stroke={fillColor}
            strokeWidth={2}
          />
        )
      default:
        // resistor: 3×1 body with color bands
        {
          const bands = getResistorBands(component.value)
          const bodyW = 3 * CELL
          const bodyH = CELL
          const bandW = 4
          const bandPositions = [0.2, 0.35, 0.5, 0.75] // relative positions along body
          return (
            <>
              {/* Lead wires */}
              <Line points={[0, 0, bodyW * 0.1, 0]} stroke="#9ca3af" strokeWidth={1.5} />
              <Line points={[bodyW * 0.9, 0, bodyW, 0]} stroke="#9ca3af" strokeWidth={1.5} />
              {/* Body */}
              <Rect
                x={bodyW * 0.1}
                y={-halfCell}
                width={bodyW * 0.8}
                height={bodyH}
                fill="#d2b48c"
                stroke={isSelected ? '#facc15' : '#b8956a'}
                strokeWidth={isSelected ? 2 : 1}
                cornerRadius={3}
              />
              {/* Color bands */}
              {bands.map((color, i) => (
                <Rect
                  key={i}
                  x={bodyW * bandPositions[i] - bandW / 2}
                  y={-halfCell + 2}
                  width={bandW}
                  height={bodyH - 4}
                  fill={color}
                  cornerRadius={1}
                  listening={false}
                />
              ))}
            </>
          )
        }
    }
  }

  // Render pin dots — in default orientation, Group rotation handles the rest
  const renderPins = () => {
    return Object.entries(def.pins).map(([pinName, [offCol, offRow]]) => {
      const px = offCol * CELL
      const py = offRow * CELL
      const isThisPinSelected =
        selectedPin &&
        selectedPin.componentId === component.id &&
        selectedPin.pinName === pinName
      return (
        <Circle
          key={pinName}
          x={px}
          y={py}
          radius={4}
          fill={isThisPinSelected ? '#facc15' : '#e5e7eb'}
          stroke={isThisPinSelected ? '#facc15' : '#9ca3af'}
          strokeWidth={1}
          onMouseEnter={(e) => {
            e.target.to({ radius: 6, duration: 0.1 })
            const container = e.target.getStage().container()
            container.style.cursor = mode === 'manual' ? 'crosshair' : 'pointer'
          }}
          onMouseLeave={(e) => {
            e.target.to({ radius: 4, duration: 0.1 })
            const container = e.target.getStage().container()
            container.style.cursor = 'default'
          }}
          onClick={(e) => {
            e.cancelBubble = true
            if (onPinClick) onPinClick(component.id, pinName)
          }}
        />
      )
    })
  }

  return (
    <Group
      x={x}
      y={y}
      rotation={rotation}
      draggable={isDraggable}
      onDragEnd={(e) => {
        if (!onMove) return
        const node = e.target
        const newCol = Math.round((node.x() - CELL) / CELL)
        const newRow = Math.round((node.y() - CELL) / CELL)
        onMove(component.id, component.type, newCol, newRow, component.rotation)
        node.position({ x, y })
      }}
      onClick={() => onSelect && onSelect(component.id)}
      onMouseEnter={(e) => {
        const container = e.target.getStage().container()
        container.style.cursor = isDraggable ? 'grab' : 'pointer'
      }}
      onMouseLeave={(e) => {
        const container = e.target.getStage().container()
        container.style.cursor = 'default'
      }}
    >
      {renderShape()}
      {renderPins()}
      <Text
        x={0}
        y={labelY}
        text={`${component.id}${component.value ? ` (${component.value})` : ''}`}
        fontSize={10}
        fill="#9ca3af"
        listening={false}
      />
    </Group>
  )
}
