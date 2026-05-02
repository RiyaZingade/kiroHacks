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
        // Vertical 1×3: pins at top (0,0) and bottom (0, 2*CELL)
        return (
          <Ellipse
            x={0}
            y={CELL}
            radiusX={halfCell - 2}
            radiusY={CELL - 2}
            fill={fillColor}
            stroke={isSelected ? '#facc15' : '#ffffff20'}
            strokeWidth={isSelected ? 2 : 1}
            opacity={0.9}
          />
        )
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
        return (
          <Rect
            x={0}
            y={-halfCell}
            width={2 * CELL}
            height={CELL}
            fill={fillColor}
            stroke={isSelected ? '#facc15' : '#ffffff20'}
            strokeWidth={isSelected ? 2 : 1}
            cornerRadius={6}
          />
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
        // resistor: 3×1 body centered on pin row
        return (
          <Rect
            x={0}
            y={-halfCell}
            width={3 * CELL}
            height={CELL}
            fill={fillColor}
            stroke={isSelected ? '#facc15' : '#ffffff20'}
            strokeWidth={isSelected ? 2 : 1}
            cornerRadius={3}
          />
        )
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
