import { Line } from 'react-konva'
import { getPinPosition, getComponentDef } from './ComponentRenderer'

// P3 owns this file
// Draws wires between component pins as Konva.Lines
// Handles wire selection for deletion

const CELL = 20

// Resolve a connection endpoint to pixel coordinates
// Endpoints are either "ComponentId.pinName" or "VCC" / "GND"
function resolveEndpoint(endpoint, components, canvasHeight) {
  if (endpoint === 'VCC') {
    return { x: CELL * 2, y: CELL * 1 }
  }
  if (endpoint === 'GND') {
    return { x: CELL * 2, y: canvasHeight - CELL * 1 }
  }

  const dotIdx = endpoint.indexOf('.')
  if (dotIdx === -1) return null

  const compId = endpoint.substring(0, dotIdx)
  const pinName = endpoint.substring(dotIdx + 1)

  const comp = components.find((c) => c.id === compId)
  if (!comp) return null

  const pins = getPinPosition(comp)
  return pins[pinName] ?? null
}

export default function WireRenderer({
  connections,
  components,
  selectedWireIdx,
  onWireClick,
  canvasHeight = 600,
}) {
  return (
    <>
      {connections.map((conn, idx) => {
        const from = resolveEndpoint(conn.from, components, canvasHeight)
        const to = resolveEndpoint(conn.to, components, canvasHeight)

        if (!from || !to) return null

        const isSelected = selectedWireIdx === idx

        // Right-angle routing: go horizontal to midpoint, then vertical, then horizontal
        const midX = (from.x + to.x) / 2
        const points = [
          from.x, from.y,
          midX, from.y,
          midX, to.y,
          to.x, to.y,
        ]

        return (
          <Line
            key={`wire-${idx}`}
            points={points}
            stroke={isSelected ? '#facc15' : '#22d3ee'}
            strokeWidth={isSelected ? 3 : 2}
            hitStrokeWidth={12}
            lineCap="round"
            lineJoin="round"
            onClick={(e) => {
              e.cancelBubble = true
              if (onWireClick) onWireClick(idx)
            }}
            onMouseEnter={(e) => {
              e.target.stroke('#67e8f9')
              const container = e.target.getStage().container()
              container.style.cursor = 'pointer'
            }}
            onMouseLeave={(e) => {
              e.target.stroke(isSelected ? '#facc15' : '#22d3ee')
              const container = e.target.getStage().container()
              container.style.cursor = 'default'
            }}
          />
        )
      })}
    </>
  )
}
