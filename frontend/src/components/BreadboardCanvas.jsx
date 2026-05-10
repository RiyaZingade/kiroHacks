import { useState, useCallback, useEffect, useRef } from 'react'
import { Stage, Layer, Rect, Circle, Line, Text } from 'react-konva'
import ComponentRenderer, { getPinPosition, getComponentDef, getRotatedSize } from './ComponentRenderer'
import WireRenderer from './WireRenderer'
import ComponentSidebar, { generateId, getCurrentDragType } from './ComponentSidebar'
import ComponentInspector from './ComponentInspector'
import CurrentFlowAnimation from './CurrentFlowAnimation'
import { validateCircuit } from './CircuitValidator'

// P3 owns this file
// Konva.js breadboard canvas with Agent/Manual mode toggle

const CELL = 20
const COLS = 80
const ROWS = 40
// Power zone: 8 columns to the left of the grid, visually separated
const POWER_ZONE_COLS = 8
const GRID_OFFSET_X = POWER_ZONE_COLS * CELL  // grid starts this many px from left
const CANVAS_W = (COLS + POWER_ZONE_COLS) * CELL + CELL * 2
const CANVAS_H = ROWS * CELL + CELL * 2

// Power-supply component types that belong in the power zone
const POWER_TYPES = new Set(['battery_9v', 'battery_coin', 'power_supply', 'arduino_uno', 'arduino_nano'])

const VCC_ROWS = [0, 1]
const GND_ROWS = [ROWS - 2, ROWS - 1]

function clampToGrid(col, row, type, rotation = 0) {
  const { width, height } = getRotatedSize(type, rotation)
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

  if (POWER_TYPES.has(type)) {
    // Clamp to power zone (negative cols: -POWER_ZONE_COLS to -1)
    const clampedCol = Math.max(-POWER_ZONE_COLS - minC, Math.min(col, -1 - maxC))
    const clampedRow = Math.max(0 - minR, Math.min(row, ROWS - 1 - maxR))
    return [clampedCol, clampedRow]
  }

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
  const [playgroundActive, setPlaygroundActive] = useState(false)
  const [validationResult, setValidationResult] = useState(null)
  const [interactiveStates, setInteractiveStates] = useState({}) // componentId → state
  // rubber-band multi-select
  const [selectionRect, setSelectionRect] = useState(null) // {x,y,w,h} during drag
  const [selectedIds, setSelectedIds] = useState(new Set())
  const selectionStartRef = useRef(null)
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

  const OPEN_BY_DEFAULT = new Set(['button', 'switch_slide', 'switch_toggle'])

  const togglePlaygroundMode = () => {
    if (!playgroundActive) {
      const initStates = {}
      components.forEach(c => {
        if (OPEN_BY_DEFAULT.has(c.type)) initStates[c.id] = { pressed: false, on: false }
      })
      const result = validateCircuit(components, connections, initStates)
      setValidationResult(result)
      setInteractiveStates(initStates)
      setPlaygroundActive(true)
      setWiringFrom(null)
      setSelectedComponentId(null)
      setSelectedWireIdx(null)
    } else {
      setPlaygroundActive(false)
      setValidationResult(null)
      setInteractiveStates({})
    }
  }

  const handleInteract = useCallback((componentId, newState) => {
    setInteractiveStates(prev => {
      const updated = { ...prev, [componentId]: { ...(prev[componentId] ?? {}), ...newState } }
      setValidationResult(validateCircuit(components, connections, updated))
      return updated
    })
  }, [components, connections])

  const handleComponentSelect = useCallback((id) => {
    // If clicking a component that's already in the multi-selection, keep the group
    setSelectedIds(prev => {
      if (prev.has(id) && prev.size > 1) return prev
      return new Set([id])
    })
    setSelectedComponentId(id)
    setSelectedWireIdx(null)
  }, [])

  const handleComponentMove = useCallback(
    (id, type, rawCol, rawRow, rotation = 0) => {
      const [col, row] = clampToGrid(rawCol, rawRow, type, rotation)
      const deltaCol = col - (components.find(c => c.id === id)?.position[0] ?? col)
      const deltaRow = row - (components.find(c => c.id === id)?.position[1] ?? row)

      setCircuit((prev) => ({
        ...prev,
        components: prev.components.map((c) => {
          if (c.id === id) return { ...c, position: [col, row] }
          // move other selected components by the same delta
          if (selectedIds.has(c.id)) {
            const [nc, nr] = clampToGrid(c.position[0] + deltaCol, c.position[1] + deltaRow, c.type, c.rotation ?? 0)
            return { ...c, position: [nc, nr] }
          }
          return c
        }),
      }))
    },
    [setCircuit, components, selectedIds]
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
      if (playgroundActive) return
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
    [mode, wiringFrom, setCircuit, playgroundActive]
  )

  const handleWireClick = useCallback((idx) => {
    setSelectedWireIdx(idx)
    setSelectedComponentId(null)
  }, [])

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        // delete multi-selected components
        if (selectedIds.size > 0) {
          e.preventDefault()
          setCircuit((prev) => ({
            ...prev,
            components: prev.components.filter((c) => !selectedIds.has(c.id)),
            connections: prev.connections.filter(
              (c) => ![...selectedIds].some(id =>
                c.from.startsWith(id + '.') || c.to.startsWith(id + '.') || c.from === id || c.to === id
              )
            ),
          }))
          setSelectedIds(new Set())
          setSelectedComponentId(null)
          return
        }
        if (selectedWireIdx !== null) {
          e.preventDefault()
          setCircuit((prev) => ({
            ...prev,
            connections: prev.connections.filter((_, i) => i !== selectedWireIdx),
          }))
          setSelectedWireIdx(null)
        }
      }
      if (e.key === 'Escape') {
        setWiringFrom(null)
        setSelectedComponentId(null)
        setSelectedWireIdx(null)
        setSelectedIds(new Set())
        setSelectionRect(null)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectedWireIdx, selectedIds, setCircuit])

  const handleStageMouseMove = useCallback(
    (e) => {
      const stage = e.target.getStage()
      const pos = stage.getPointerPosition()
      if (wiringFrom && pos) setMousePos(pos)
      if (selectionStartRef.current && pos) {
        const sx = selectionStartRef.current.x
        const sy = selectionStartRef.current.y
        setSelectionRect({
          x: Math.min(sx, pos.x),
          y: Math.min(sy, pos.y),
          w: Math.abs(pos.x - sx),
          h: Math.abs(pos.y - sy),
        })
      }
    },
    [wiringFrom]
  )

  const handleStageMouseDown = useCallback(
    (e) => {
      // only start rubber-band on empty canvas click (not on a component)
      if (e.target !== e.target.getStage()) return
      if (wiringFrom) return
      const stage = e.target.getStage()
      const pos = stage.getPointerPosition()
      selectionStartRef.current = pos
      setSelectionRect(null)
      setSelectedIds(new Set())
      setSelectedComponentId(null)
      setSelectedWireIdx(null)
    },
    [wiringFrom]
  )

  const handleStageMouseUp = useCallback(
    () => {
      if (!selectionStartRef.current || !selectionRect) {
        selectionStartRef.current = null
        return
      }
      selectionStartRef.current = null
      const { x, y, w, h } = selectionRect
      if (w < 4 && h < 4) { setSelectionRect(null); return }
      // find components whose pixel centre falls inside the rect
      const hit = new Set()
      components.forEach((c) => {
        const cx = c.position[0] * CELL + CELL + GRID_OFFSET_X
        const cy = c.position[1] * CELL + CELL
        if (cx >= x && cx <= x + w && cy >= y && cy <= y + h) hit.add(c.id)
      })
      setSelectedIds(hit)
      setSelectionRect(null)
    },
    [selectionRect, components]
  )

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      if (playgroundActive) return
      setDragPreview(null)
      const type = e.dataTransfer.getData('component-type')
      if (!type) return
      const stageEl = stageRef.current
      if (!stageEl) return
      const stageContainer = stageEl.container()
      const rect = stageContainer.getBoundingClientRect()
      const dropX = e.clientX - rect.left
      const dropY = e.clientY - rect.top
      // Subtract GRID_OFFSET_X so col=0 aligns with the grid start; power zone gets negative cols
      const rawCol = Math.round((dropX - CELL - GRID_OFFSET_X) / CELL)
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
    [components, setCircuit, playgroundActive]
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
      const rawCol = Math.round((hoverX - CELL - GRID_OFFSET_X) / CELL)
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
        <div className={`relative flex bg-gray-800 rounded-full p-0.5 w-48 ${playgroundActive ? 'pointer-events-none opacity-50' : ''}`}>
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
        <button
          onClick={togglePlaygroundMode}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            playgroundActive
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
          title="Toggle Playground Mode"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Playground
        </button>
        {playgroundActive && (
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
            components.length === 0
              ? 'bg-yellow-900/60 text-yellow-300'
              : validationResult?.valid
                ? 'bg-green-900/60 text-green-300'
                : 'bg-red-900/60 text-red-300'
          }`}>
            {components.length === 0 ? (
              <span>No components to simulate</span>
            ) : validationResult?.valid ? (
              <span>✓ Circuit works!</span>
            ) : (
              <span>
                ⚠ Circuit incomplete — check your connections
                {validationResult?.errors?.[0] && (
                  <span className="ml-1 opacity-75">({validationResult.errors[0]})</span>
                )}
              </span>
            )}
          </div>
        )}
        {selectedIds.size > 1 && (
          <span className="text-xs text-blue-400">
            {selectedIds.size} selected — drag to move · Delete to remove
          </span>
        )}
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
            disabled={playgroundActive}
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
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
              playgroundActive
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                : 'bg-gray-800 hover:bg-red-900/60 text-gray-400 hover:text-red-400'
            }`}
            title="Clear board"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V4a1 1 0 011-1h6a1 1 0 011 1v3" />
            </svg>
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
            onMouseDown={handleStageMouseDown}
            onMouseUp={handleStageMouseUp}
            onClick={(e) => {
              if (e.target === e.target.getStage()) {
                setSelectedComponentId(null)
                setSelectedWireIdx(null)
                if (!selectionRect) setSelectedIds(new Set())
              }
            }}
          >
            <Layer>
              {/* Power zone background */}
              <Rect
                x={0}
                y={0}
                width={GRID_OFFSET_X + CELL}
                height={CANVAS_H}
                fill="#1a1a2e"
                listening={false}
              />
              <Line
                points={[GRID_OFFSET_X + CELL, 0, GRID_OFFSET_X + CELL, CANVAS_H]}
                stroke="#374151"
                strokeWidth={1}
                dash={[4, 4]}
                listening={false}
              />
              {/* Power zone label */}
              <Text
                x={4}
                y={12}
                text="POWER"
                fontSize={8}
                fill="#4b5563"
                fontStyle="bold"
                letterSpacing={1}
                width={GRID_OFFSET_X}
                align="center"
                listening={false}
              />
              {/* Empty-state prompt when no power source is in the zone */}
              {!components.some(c => POWER_TYPES.has(c.type)) && (
                <>
                  <Rect
                    x={6}
                    y={CANVAS_H / 2 - 48}
                    width={GRID_OFFSET_X - 12}
                    height={96}
                    fill="#f59e0b10"
                    stroke="#f59e0b40"
                    strokeWidth={1}
                    cornerRadius={4}
                    dash={[3, 3]}
                    listening={false}
                  />
                  <Text
                    x={6}
                    y={CANVAS_H / 2 - 36}
                    text="⚡"
                    fontSize={18}
                    align="center"
                    width={GRID_OFFSET_X - 12}
                    listening={false}
                  />
                  <Text
                    x={6}
                    y={CANVAS_H / 2 - 12}
                    text={"No power\nsource"}
                    fontSize={9}
                    fill="#f59e0b"
                    align="center"
                    width={GRID_OFFSET_X - 12}
                    listening={false}
                  />
                  <Text
                    x={6}
                    y={CANVAS_H / 2 + 16}
                    text={"Drag a battery\nor Arduino here"}
                    fontSize={8}
                    fill="#6b7280"
                    align="center"
                    width={GRID_OFFSET_X - 12}
                    listening={false}
                  />
                </>
              )}

              {/* Breadboard grid rails */}
              <Rect
                x={CELL + GRID_OFFSET_X}
                y={CELL * (VCC_ROWS[0] + 1)}
                width={(COLS - 1) * CELL}
                height={CELL * VCC_ROWS.length}
                fill="#7f1d1d20"
                cornerRadius={2}
              />
              <Text
                x={GRID_OFFSET_X + 4}
                y={CELL * (VCC_ROWS[0] + 1) + 4}
                text="+"
                fontSize={12}
                fill="#ef4444"
                fontStyle="bold"
              />
              <Rect
                x={CELL + GRID_OFFSET_X}
                y={CELL * (GND_ROWS[0] + 1)}
                width={(COLS - 1) * CELL}
                height={CELL * GND_ROWS.length}
                fill="#1e3a5f20"
                cornerRadius={2}
              />
              <Text
                x={GRID_OFFSET_X + 4}
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
                      x={col * CELL + CELL + GRID_OFFSET_X}
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
                brokenIndices={playgroundActive ? (validationResult?.brokenConnectionIndices ?? new Set()) : new Set()}
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
                const px = dragPreview.col * CELL + CELL + GRID_OFFSET_X
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
                  isSelected={selectedComponentId === c.id || selectedIds.has(c.id)}
                  selectedPin={wiringFrom}
                  onSelect={handleComponentSelect}
                  onPinClick={handlePinClick}
                  onMove={handleComponentMove}
                  mode={playgroundActive ? 'agent' : mode}
                  isLit={playgroundActive && validationResult?.ledStates?.get(c.id) === true}
                  isPlayground={playgroundActive}
                  interactiveState={interactiveStates[c.id]}
                  onInteract={handleInteract}
                />
              ))}

              {/* rubber-band selection rect */}
              {selectionRect && selectionRect.w > 2 && selectionRect.h > 2 && (
                <Rect
                  x={selectionRect.x}
                  y={selectionRect.y}
                  width={selectionRect.w}
                  height={selectionRect.h}
                  fill="#3b82f615"
                  stroke="#3b82f6"
                  strokeWidth={1}
                  dash={[4, 3]}
                  listening={false}
                />
              )}
            </Layer>

            {/* P4: Current flow animation layer */}
            <CurrentFlowAnimation components={components} connections={connections} playing={playing || (playgroundActive && validationResult?.valid === true)} resetCount={resetCount} speed={speed} canvasHeight={CANVAS_H} />
          </Stage>
        </div>

        {selectedComponent && !playgroundActive && (
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
