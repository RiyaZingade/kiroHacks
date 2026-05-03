import { useState, useCallback, useEffect, useRef } from 'react'
import { Stage, Layer, Rect, Circle, Line, Text } from 'react-konva'
import ComponentRenderer, { getPinPosition, getComponentDef, getRotatedSize } from './ComponentRenderer'
import WireRenderer from './WireRenderer'
import ComponentSidebar, { generateId, getCurrentDragType } from './ComponentSidebar'
import ComponentInspector from './ComponentInspector'
import CurrentFlowAnimation from './CurrentFlowAnimation'

// P3 owns this file
// Konva.js breadboard canvas with Agent/Manual mode toggle

const CELL = 20
const COLS = 40
const ROWS = 40
const CANVAS_W = COLS * CELL + CELL * 2
const CANVAS_H = ROWS * CELL + CELL * 2

const VCC_ROWS = [0, 1]
const GND_ROWS = [ROWS - 2, ROWS - 1]

function clampToGrid(col, row, type, rotation = 0) {
  const { width, height } = getRotatedSize(type, rotation)
  const w = Math.ceil(width)
  const h = Math.ceil(height)
  const def = getComponentDef(type)
  let minC = 0, maxC = 0, minR = 0, maxR = 0
  for (const [offCol, offRow] of Object.values(def.pins)) {
    const rc = rotation === 90 ? -offRow : rotation === 180 ? -offCol : rotation === 270 ? offRow : offCol
    const rr = rotation === 90 ? offCol : rotation === 180 ? -offRow : rotation === 270 ? -offCol : offRow
    minC = Math.min(minC, rc)
    maxC = Math.max(maxC, rc)
    minR = Math.min(minR, rr)
    maxR = Math.max(maxR, rr)
  }
  const minRow = VCC_ROWS.length
  const maxRow = ROWS - GND_ROWS.length - 1
  const clampedCol = Math.max(0 - minC, Math.min(col, COLS - 1 - maxC))
  const clampedRow = Math.max(minRow - minR, Math.min(row, maxRow - maxR))
  return [clampedCol, clampedRow]
}

export default function BreadboardCanvas({ circuit, setCircuit, playing, resetCount, speed }) {
  const components = circuit?.components ?? []
  const connections = circuit?.connections ?? []
  const mode = circuit?.canvas_mode ?? 'agent'

  const [selectedComponentId, setSelectedComponentId] = useState(null)
  const [selectedWireIdx, setSelectedWireIdx] = useState(null)
  const [wiringFrom, setWiringFrom] = useState(null)
  const [mousePos, setMousePos] = useState(null)
  const [dragPreview, setDragPreview] = useState(null)
  const stageRef = useRef(null)
  const containerRef = useRef(null)

  const toggleMode = () => {
    setCircuit((prev) => ({
      ...prev,
      canvas_mode: prev.canvas_mode === 'agent' ? 'manual' : 'agent',
    }))
    setSelectedComponentId(null)
    setSelectedWireIdx(null)
    setWiringFrom(null)
  }

  const handleComponentSelect = useCallback((id) => {
    setSelectedComponentId(id)
    setSelectedWireIdx(null)
  }, [])

  const handleComponentMove = useCallback(
    (id, type, rawCol, rawRow, rotation = 0) => {
      const [col, row] = clampToGrid(rawCol, rawRow, type, rotation)
      setCircuit((prev) => ({
        ...prev,
        components: prev.components.map((c) =>
          c.id === id ? { ...c, position: [col, row] } : c
        ),
      }))
    },
    [setCircuit]
  )

  const handleRotateComponent = useCallback(
    (id) => {
      setCircuit((prev) => ({
        ...prev,
        components: prev.components.map((c) => {
          if (c.id !== id) return c
          const newRotation = ((c.rotation ?? 0) + 90) % 360
          const [col, row] = clampToGrid(c.position[0], c.position[1], c.type, newRotation)
          return { ...c, rotation: newRotation, position: [col, row] }
        }),
      }))
    },
    [setCircuit]
  )

  const handlePinClick = useCallback(
    (componentId, pinName) => {
      if (mode !== 'manual') return
      if (!wiringFrom) {
        setWiringFrom({ componentId, pinName })
      } else {
        if (wiringFrom.componentId === componentId && wiringFrom.pinName === pinName) {
          setWiringFrom(null)
          return
        }
        const from = `${wiringFrom.componentId}.${wiringFrom.pinName}`
        const to = `${componentId}.${pinName}`
        setCircuit((prev) => ({
          ...prev,
          connections: [...prev.connections, { from, to }],
        }))
        setWiringFrom(null)
      }
    },
    [mode, wiringFrom, setCircuit]
  )

  const handleWireClick = useCallback((idx) => {
    setSelectedWireIdx(idx)
    setSelectedComponentId(null)
  }, [])

  useEffect(() => {
    const handleKey = (e) => {
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedWireIdx !== null) {
        e.preventDefault()
        setCircuit((prev) => ({
          ...prev,
          connections: prev.connections.filter((_, i) => i !== selectedWireIdx),
        }))
        setSelectedWireIdx(null)
      }
      if (e.key === 'Escape') {
        setWiringFrom(null)
        setSelectedComponentId(null)
        setSelectedWireIdx(null)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectedWireIdx, setCircuit])

  const handleStageMouseMove = useCallback(
    (e) => {
      if (!wiringFrom) return
      const stage = e.target.getStage()
      const pos = stage.getPointerPosition()
      if (pos) setMousePos(pos)
    },
    [wiringFrom]
  )

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      setDragPreview(null)
      const type = e.dataTransfer.getData('component-type')
      if (!type) return
      const stageEl = stageRef.current
      if (!stageEl) return
      const stageContainer = stageEl.container()
      const rect = stageContainer.getBoundingClientRect()
      const dropX = e.clientX - rect.left
      const dropY = e.clientY - rect.top
      const rawCol = Math.round((dropX - CELL) / CELL)
      const rawRow = Math.round((dropY - CELL) / CELL)
      const [col, row] = clampToGrid(rawCol, rawRow, type)
      const id = generateId(type, components)
      const defaultValue = e.dataTransfer.getData('default-value') || ''
      const defaultColor = e.dataTransfer.getData('default-color') || undefined
      const newComponent = { id, type, position: [col, row] }
      if (defaultValue) newComponent.value = defaultValue
      if (defaultColor) newComponent.color = defaultColor
      setCircuit((prev) => ({
        ...prev,
        components: [...prev.components, newComponent],
      }))
    },
    [components, setCircuit]
  )

  const handleDragOver = useCallback(
    (e) => {
      e.preventDefault()
      const stageEl = stageRef.current
      if (!stageEl) return
      const stageContainer = stageEl.container()
      const rect = stageContainer.getBoundingClientRect()
      const hoverX = e.clientX - rect.left
      const hoverY = e.clientY - rect.top
      const rawCol = Math.round((hoverX - CELL) / CELL)
      const rawRow = Math.round((hoverY - CELL) / CELL)
      const dragType = getCurrentDragType()
      if (dragType) {
        const [col, row] = clampToGrid(rawCol, rawRow, dragType)
        setDragPreview({ col, row, type: dragType })
      }
    },
    []
  )

  const handleDragEnter = useCallback((e) => { e.preventDefault() }, [])

  const handleDragLeave = useCallback((e) => {
    if (!containerRef.current?.contains(e.relatedTarget)) {
      setDragPreview(null)
    }
  }, [])

  const handleUpdateValue = useCallback(
    (id, newValue) => {
      setCircuit((prev) => ({
        ...prev,
        components: prev.components.map((c) =>
          c.id === id ? { ...c, value: newValue } : c
        ),
      }))
    },
    [setCircuit]
  )

  const handleDeleteComponent = useCallback(
    (id) => {
      setCircuit((prev) => ({
        ...prev,
        components: prev.components.filter((c) => c.id !== id),
        connections: prev.connections.filter(
          (c) =>
            !c.from.startsWith(id + '.') &&
            !c.to.startsWith(id + '.') &&
            c.from !== id &&
            c.to !== id
        ),
      }))
      setSelectedComponentId(null)
    },
    [setCircuit]
  )

  const selectedComponent = components.find((c) => c.id === selectedComponentId)

  const rubberBandLine = (() => {
    if (!wiringFrom || !mousePos) return null
    const comp = components.find((c) => c.id === wiringFrom.componentId)
    if (!comp) return null
    const pins = getPinPosition(comp)
    const pinPos = pins[wiringFrom.pinName]
    if (!pinPos) return null
    return [pinPos.x, pinPos.y, mousePos.x, mousePos.y]
  })()

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-800">
        <span className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          Canvas
        </span>
        <div className="relative flex bg-gray-800 rounded-full p-0.5 w-48">
          <div
            className={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-full transition-all duration-300 ease-in-out ${
              mode === 'agent' ? 'left-0.5 bg-blue-600' : 'left-[calc(50%+2px)] bg-purple-600'
            }`}
          />
          <button
            onClick={() => mode !== 'agent' && toggleMode()}
            className={`relative z-10 flex-1 py-1 text-xs font-medium text-center rounded-full transition-colors duration-300 ${
              mode === 'agent' ? 'text-white' : 'text-gray-400'
            }`}
          >
            Agent
          </button>
          <button
            onClick={() => mode !== 'manual' && toggleMode()}
            className={`relative z-10 flex-1 py-1 text-xs font-medium text-center rounded-full transition-colors duration-300 ${
              mode === 'manual' ? 'text-white' : 'text-gray-400'
            }`}
          >
            Manual
          </button>
        </div>
        {wiringFrom && (
          <span className="text-xs text-yellow-400 animate-pulse">
            Wiring: click a target pin (Esc to cancel)
          </span>
        )}
        {selectedWireIdx !== null && (
          <span className="text-xs text-yellow-400">
            Wire selected — press Backspace to delete
          </span>
        )}
        <div className="ml-auto">
          <button
            onClick={() => {
              setCircuit((prev) => ({
                ...prev,
                components: [],
                connections: [],
              }))
              setSelectedComponentId(null)
              setSelectedWireIdx(null)
              setWiringFrom(null)
            }}
            className="px-3 py-1 rounded text-xs font-medium bg-red-900/50 hover:bg-red-800/60 border border-red-800 text-red-300 transition-colors"
          >
            🗑 Reset Board
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <ComponentSidebar mode={mode} onAddComponent={() => {}} />

        <div
          ref={containerRef}
          className="flex-1 bg-gray-900 overflow-auto"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
        >
          <Stage
            ref={stageRef}
            width={CANVAS_W}
            height={CANVAS_H}
            onMouseMove={handleStageMouseMove}
            onClick={(e) => {
              if (e.target === e.target.getStage()) {
                setSelectedComponentId(null)
                setSelectedWireIdx(null)
              }
            }}
          >
            <Layer>
              <Rect
                x={CELL}
                y={CELL * (VCC_ROWS[0] + 1)}
                width={(COLS - 1) * CELL}
                height={CELL * VCC_ROWS.length}
                fill="#7f1d1d20"
                cornerRadius={2}
              />
              <Text
                x={4}
                y={CELL * (VCC_ROWS[0] + 1) + 4}
                text="+"
                fontSize={12}
                fill="#ef4444"
                fontStyle="bold"
              />
              <Rect
                x={CELL}
                y={CELL * (GND_ROWS[0] + 1)}
                width={(COLS - 1) * CELL}
                height={CELL * GND_ROWS.length}
                fill="#1e3a5f20"
                cornerRadius={2}
              />
              <Text
                x={4}
                y={CELL * (GND_ROWS[0] + 1) + 4}
                text="−"
                fontSize={12}
                fill="#3b82f6"
                fontStyle="bold"
              />

              {Array.from({ length: ROWS }, (_, row) =>
                Array.from({ length: COLS }, (_, col) => {
                  const isVCC = VCC_ROWS.includes(row)
                  const isGND = GND_ROWS.includes(row)
                  let fill = '#374151'
                  if (isVCC) fill = '#ef444440'
                  if (isGND) fill = '#3b82f640'
                  return (
                    <Circle
                      key={`${row}-${col}`}
                      x={col * CELL + CELL}
                      y={row * CELL + CELL}
                      radius={2}
                      fill={fill}
                    />
                  )
                })
              )}

              <WireRenderer
                connections={connections}
                components={components}
                selectedWireIdx={selectedWireIdx}
                onWireClick={handleWireClick}
                canvasHeight={CANVAS_H}
              />

              {rubberBandLine && (
                <Line
                  points={rubberBandLine}
                  stroke="#facc15"
                  strokeWidth={2}
                  dash={[6, 4]}
                  listening={false}
                />
              )}

              {dragPreview && (() => {
                const def = getComponentDef(dragPreview.type)
                const pw = Math.ceil(def.width) * CELL
                const ph = Math.ceil(def.height) * CELL
                const px = dragPreview.col * CELL + CELL
                const py = dragPreview.row * CELL + CELL
                const previewComponent = {
                  id: '~preview',
                  type: dragPreview.type,
                  position: [dragPreview.col, dragPreview.row],
                  value: '',
                }
                return (
                  <>
                    <Rect
                      x={px - 2}
                      y={py - 2}
                      width={pw + 4}
                      height={ph + 4}
                      fill="#facc1510"
                      stroke="#facc15"
                      strokeWidth={1}
                      cornerRadius={4}
                      dash={[4, 3]}
                      listening={false}
                      opacity={0.6}
                    />
                    <ComponentRenderer
                      component={previewComponent}
                      isSelected={false}
                      selectedPin={null}
                      onSelect={() => {}}
                      onPinClick={() => {}}
                      onMove={() => {}}
                      mode={mode}
                    />
                  </>
                )
              })()}

              {components.map((c) => (
                <ComponentRenderer
                  key={c.id}
                  component={c}
                  isSelected={selectedComponentId === c.id}
                  selectedPin={wiringFrom}
                  onSelect={handleComponentSelect}
                  onPinClick={handlePinClick}
                  onMove={handleComponentMove}
                  mode={mode}
                />
              ))}
            </Layer>

            {/* P4: Current flow animation layer */}
            <CurrentFlowAnimation components={components} connections={connections} playing={playing} resetCount={resetCount} speed={speed} canvasHeight={CANVAS_H} />
          </Stage>
        </div>

        {selectedComponent && (
          <ComponentInspector
            component={selectedComponent}
            onUpdateValue={handleUpdateValue}
            onUpdateColor={(id, color) => {
              setCircuit((prev) => ({
                ...prev,
                components: prev.components.map((c) =>
                  c.id === id ? { ...c, color } : c
                ),
              }))
            }}
            onRotate={handleRotateComponent}
            onDelete={handleDeleteComponent}
            onClose={() => setSelectedComponentId(null)}
          />
        )}
      </div>
    </div>
  )
}
