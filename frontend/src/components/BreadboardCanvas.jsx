import { Stage, Layer, Rect, Circle, Line, Text } from 'react-konva'
import CurrentFlowAnimation from './CurrentFlowAnimation'

// P3 owns this file
// Renders circuit JSON onto a Konva canvas
// TODO: replace placeholder shapes with ComponentRenderer + WireRenderer

const CELL = 20 // grid cell size in px

export default function BreadboardCanvas({ circuit, setCircuit, playing }) {
  const components = circuit?.components ?? []
  const connections = circuit?.connections ?? []

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-800">
        <span className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Canvas</span>
        {/* TODO P3: add Agent/Manual mode toggle here */}
      </div>
      <Stage width={800} height={600} className="bg-gray-900">
        <Layer>
          {/* Breadboard grid dots — hidden for testing
          {Array.from({ length: 30 }, (_, row) =>
            Array.from({ length: 40 }, (_, col) => (
              <Circle
                key={`${row}-${col}`}
                x={col * CELL + CELL}
                y={row * CELL + CELL}
                radius={2}
                fill="#374151"
              />
            ))
          )}
          */}

          {/* Components — placeholder rects until ComponentRenderer is wired */}
          {components.map((c) => (
            <Rect
              key={c.id}
              x={c.position[0] * CELL}
              y={c.position[1] * CELL}
              width={CELL * 2}
              height={CELL}
              fill="#1d4ed8"
              cornerRadius={3}
              onClick={() => console.log('selected', c.id)}
            />
          ))}

          {/* Component labels */}
          {components.map((c) => (
            <Text
              key={`label-${c.id}`}
              x={c.position[0] * CELL}
              y={c.position[1] * CELL - 14}
              text={c.id}
              fontSize={10}
              fill="#9ca3af"
            />
          ))}
        </Layer>
        <CurrentFlowAnimation components={components} connections={connections} playing={playing} />
      </Stage>
    </div>
  )
}
