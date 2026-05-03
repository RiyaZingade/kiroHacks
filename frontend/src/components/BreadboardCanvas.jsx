import { Stage, Layer, Rect, Circle, Line, Text, Group, Image as KonvaImage } from 'react-konva'
import { useState, useEffect, useRef } from 'react'

const CELL = 20 // grid cell size in px
const CANVAS_WIDTH = 1200
const CANVAS_HEIGHT = 800

// Component renderers with rotation support
function Resistor({ component, onClick }) {
  const pos = component.position_percent || component.position
  const isPercent = component.position_percent !== undefined
  const x = isPercent ? (pos[0] / 100) * CANVAS_WIDTH : pos[0] * CELL
  const y = isPercent ? (pos[1] / 100) * CANVAS_HEIGHT : pos[1] * CELL
  const rotation = component.rotation || 0
  
  return (
    <Group x={x} y={y} rotation={rotation} onClick={onClick}>
      <Rect width={CELL * 3} height={CELL} fill="#d4a574" stroke="#8b6f47" strokeWidth={2} cornerRadius={2} offsetX={CELL * 1.5} offsetY={CELL * 0.5} />
      <Rect x={-CELL * 1.2} offsetX={CELL * 1.5} offsetY={CELL * 0.5} width={CELL * 0.4} height={CELL} fill="#8b6f47" />
      <Rect x={CELL * 0.8} offsetX={CELL * 1.5} offsetY={CELL * 0.5} width={CELL * 0.4} height={CELL} fill="#8b6f47" />
      <Text x={-CELL * 0.5} y={-CELL * 0.2} offsetX={CELL * 1.5} offsetY={CELL * 0.5} text={component.value || component.id} fontSize={9} fill="#fff" />
    </Group>
  )
}

function LED({ component, onClick }) {
  const pos = component.position_percent || component.position
  const isPercent = component.position_percent !== undefined
  const x = isPercent ? (pos[0] / 100) * CANVAS_WIDTH : pos[0] * CELL
  const y = isPercent ? (pos[1] / 100) * CANVAS_HEIGHT : pos[1] * CELL
  const rotation = component.rotation || 0
  const color = component.color || 'red'
  const fillColor = color === 'red' ? '#ef4444' : color === 'green' ? '#22c55e' : color === 'blue' ? '#3b82f6' : '#fbbf24'
  
  return (
    <Group x={x} y={y} rotation={rotation} onClick={onClick}>
      <Circle radius={CELL * 0.6} fill={fillColor} stroke="#1f2937" strokeWidth={2} />
      <Line points={[-CELL * 0.5, 0, -CELL, 0]} stroke="#9ca3af" strokeWidth={3} />
      <Line points={[CELL * 0.5, 0, CELL, 0]} stroke="#9ca3af" strokeWidth={3} />
      <Text x={-CELL * 0.8} y={CELL * 0.7} text={component.id} fontSize={9} fill="#9ca3af" />
    </Group>
  )
}

function Capacitor({ component, onClick }) {
  const pos = component.position_percent || component.position
  const isPercent = component.position_percent !== undefined
  const x = isPercent ? (pos[0] / 100) * CANVAS_WIDTH : pos[0] * CELL
  const y = isPercent ? (pos[1] / 100) * CANVAS_HEIGHT : pos[1] * CELL
  const rotation = component.rotation || 0

  return (
    <Group x={x} y={y} rotation={rotation} onClick={onClick}>
      <Line points={[-CELL * 0.2, -CELL * 0.8, -CELL * 0.2, CELL * 0.8]} stroke="#9ca3af" strokeWidth={4} />
      <Line points={[CELL * 0.2, -CELL * 0.8, CELL * 0.2, CELL * 0.8]} stroke="#9ca3af" strokeWidth={4} />
      <Line points={[-CELL * 0.5, 0, -CELL, 0]} stroke="#9ca3af" strokeWidth={3} />
      <Line points={[CELL * 0.5, 0, CELL, 0]} stroke="#9ca3af" strokeWidth={3} />
      <Text x={-CELL * 0.8} y={CELL * 0.7} text={component.value || component.id} fontSize={9} fill="#9ca3af" />
    </Group>
  )
}

function IC({ component, onClick }) {
  const pos = component.position_percent || component.position
  const isPercent = component.position_percent !== undefined
  const x = isPercent ? (pos[0] / 100) * CANVAS_WIDTH : pos[0] * CELL
  const y = isPercent ? (pos[1] / 100) * CANVAS_HEIGHT : pos[1] * CELL
  const rotation = component.rotation || 0

  return (
    <Group x={x} y={y} rotation={rotation} onClick={onClick}>
      <Rect width={CELL * 4} height={CELL * 2} fill="#1f2937" stroke="#374151" strokeWidth={2} cornerRadius={4} offsetX={CELL * 2} offsetY={CELL} />
      <Circle x={-CELL * 1.5} y={-CELL * 0.5} radius={3} fill="#6b7280" />
      <Text x={0} y={0} text={component.value || component.id} fontSize={10} fill="#e5e7eb" align="center" />
    </Group>
  )
}

// Arduino board that uses percentage-based positioning from AI
function ArduinoBoard({ components }) {
  return (
    <Group>
      {/* Main board outline */}
      <Rect 
        x={200} y={150} 
        width={550} height={400} 
        fill="#1a5490" 
        stroke="#0f3460" 
        strokeWidth={3}
        cornerRadius={6}
      />
      
      {/* Arduino UNO text */}
      <Text x={400} y={480} text="Arduino UNO" fontSize={20} fill="#fff" fontStyle="bold" />
      <Text x={420} y={500} text="REV3" fontSize={12} fill="#ccc" />
      
      {/* Board mounting holes */}
      <Circle x={220} y={170} radius={4} fill="#333" stroke="#555" strokeWidth={1} />
      <Circle x={730} y={170} radius={4} fill="#333" stroke="#555" strokeWidth={1} />
      <Circle x={220} y={530} radius={4} fill="#333" stroke="#555" strokeWidth={1} />
      <Circle x={680} y={530} radius={4} fill="#333" stroke="#555" strokeWidth={1} />
      
      {/* Render components using AI-detected positions */}
      {components && components.map((component, index) => {
        if (!component || !component.position) return null;
        
        const boardX = 200;
        const boardY = 150;
        const boardWidth = 550;
        const boardHeight = 400;
        
        let x, y;
        
        // Use percentage positioning for accurate placement
        if (component.position_type === "percent") {
          x = boardX + (component.position[0] / 100) * boardWidth;
          y = boardY + (component.position[1] / 100) * boardHeight;
        } else {
          // Fallback: treat as grid coordinates and convert to percentage
          const gridX = Math.min(component.position[0], 50);
          const gridY = Math.min(component.position[1], 35);
          x = boardX + (gridX / 50) * boardWidth;
          y = boardY + (gridY / 35) * boardHeight;
        }
        
        const value = component.value || component.id || '';
        const type = component.type || '';
        const confidence = component.confidence || 1.0;
        const nexarData = component.nexar_data;
        
        // Use Nexar data for better component information
        const displayValue = nexarData?.mpn || value;
        const description = nexarData?.description || '';
        const manufacturer = nexarData?.manufacturer || '';
        
        // Dynamic component styling based on detected type and confidence
        let width = 20, height = 15, fill = "#1f2937", isCircle = false;
        
        // Adjust opacity based on confidence
        const opacity = Math.max(0.6, confidence);
        
        // Component styling based on detected type
        if (type === 'ic' || value.toLowerCase().includes('mcu') || value.toLowerCase().includes('atmega') || value.toLowerCase().includes('processor')) {
          width = Math.max(40, Math.min(80, value.length * 4)); 
          height = Math.max(25, Math.min(50, value.length * 2));
          fill = "#1f2937";
        } else if (type === 'connector' || value.toLowerCase().includes('usb') || value.toLowerCase().includes('jack') || value.toLowerCase().includes('port')) {
          width = 30; height = 18; fill = "#c0c0c0";
        } else if (type === 'led' || value.toLowerCase().includes('led')) {
          width = 6; height = 6; isCircle = true;
          fill = value.toLowerCase().includes('green') || value === 'ON' ? '#22c55e' : 
                value.toLowerCase().includes('red') ? '#ef4444' :
                value.toLowerCase().includes('blue') ? '#3b82f6' : 
                value.toLowerCase().includes('yellow') || value === 'L' ? '#fbbf24' : '#f97316';
        } else if (type === 'button' || value.toLowerCase().includes('button') || value.toLowerCase().includes('reset')) {
          width = 12; height = 12; isCircle = true; fill = "#374151";
        } else if (type === 'resistor' || value.toLowerCase().includes('resistor') || value.includes('Ω') || value.includes('ohm')) {
          width = 20; height = 8; fill = "#d4a574";
        } else if (type === 'capacitor' || value.toLowerCase().includes('capacitor') || value.includes('µF') || value.includes('pF') || value.includes('nF')) {
          width = 8; height = 12; fill = "#4b5563";
        } else if (type === 'pin' || value.startsWith('D') || value.startsWith('A') || 
                   ['VIN', 'GND', '5V', '3.3V', 'IOREF', 'AREF', 'RESET'].includes(value)) {
          width = 6; height = 3; fill = "#fbbf24";
        } else if (type === 'crystal' || value.toLowerCase().includes('crystal') || value.includes('MHz') || value.includes('Hz')) {
          width = 15; height = 6; fill = "#c0c0c0";
        } else {
          // Generic component - size based on value length
          width = Math.max(15, Math.min(40, value.length * 3));
          height = Math.max(10, Math.min(25, value.length * 1.5));
          fill = "#6b7280";
        }
        
        return (
          <Group key={component.id || index} opacity={opacity}>
            {isCircle ? (
              <Circle 
                x={x} 
                y={y} 
                radius={width/2}
                fill={fill}
                stroke="#1f2937" 
                strokeWidth={1} 
              />
            ) : (
              <Rect 
                x={x - width/2} 
                y={y - height/2} 
                width={width} 
                height={height} 
                fill={fill} 
                stroke="#374151" 
                strokeWidth={1} 
                cornerRadius={1}
              />
            )}
            
            <Text 
              x={x} 
              y={y + (isCircle ? -10 : 3)} 
              text={displayValue.length > 10 ? displayValue.substring(0, 8) + '..' : displayValue} 
              fontSize={Math.max(5, Math.min(8, 60 / displayValue.length))} 
              fill="#fff" 
              align="center"
              offsetX={displayValue.length * 1.5}
            />
            
            {/* Show Nexar data indicator for enhanced components */}
            {nexarData && (
              <Circle 
                x={x + width/2 - 3} 
                y={y - height/2 + 3} 
                radius={2}
                fill="#22c55e"
                stroke="#1f2937"
                strokeWidth={0.5}
              />
            )}
            
            {/* Show manufacturer info if available */}
            {manufacturer && (
              <Text 
                x={x} 
                y={y + (isCircle ? 12 : height/2 + 12)} 
                text={manufacturer.length > 8 ? manufacturer.substring(0, 6) + '..' : manufacturer} 
                fontSize={4} 
                fill="#9ca3af" 
                align="center"
                offsetX={manufacturer.length * 1}
              />
            )}
            
            {/* Show confidence indicator for low confidence components */}
            {confidence < 0.8 && (
              <Circle 
                x={x + width/2 - 3} 
                y={y - height/2 + 3} 
                radius={2}
                fill="#fbbf24"
                stroke="#1f2937"
                strokeWidth={0.5}
              />
            )}
          </Group>
        );
      })}
    </Group>
  )
}

function GenericComponent({ component, onClick }) {
  const pos = component.position_percent || component.position
  const isPercent = component.position_percent !== undefined
  const x = isPercent ? (pos[0] / 100) * CANVAS_WIDTH : pos[0] * CELL
  const y = isPercent ? (pos[1] / 100) * CANVAS_HEIGHT : pos[1] * CELL
  const rotation = component.rotation || 0
  
  return (
    <Group x={x} y={y} rotation={rotation} onClick={onClick}>
      <Rect width={CELL * 2} height={CELL} fill="#6b7280" stroke="#9ca3af" strokeWidth={2} cornerRadius={2} offsetX={CELL} offsetY={CELL * 0.5} />
      <Text x={0} y={0} text={component.id} fontSize={9} fill="#fff" align="center" />
    </Group>
  )
}

export default function BreadboardCanvas({ circuit, setCircuit }) {
  const components = circuit?.components ?? []
  const traces = circuit?.traces ?? []
  const connections = circuit?.connections ?? []
  const canvasMode = circuit?.canvas_mode || 'agent'
  const [bgImage, setBgImage] = useState(null)
  const [currentMode, setCurrentMode] = useState(canvasMode)

  // Update current mode when circuit changes
  useEffect(() => {
    setCurrentMode(canvasMode)
  }, [canvasMode])

  // Function to toggle between Arduino board and breadboard modes
  function toggleCanvasMode() {
    const newMode = currentMode === 'arduino' ? 'agent' : 'arduino'
    setCurrentMode(newMode)
    
    if (setCircuit) {
      setCircuit({
        ...circuit,
        canvas_mode: newMode
      })
    }
  }

  // Load background schematic image if needed
  useEffect(() => {
    if ((currentMode === 'pcb' || currentMode === 'board_image' || currentMode === 'board_recreated') && circuit?.schematic_image) {
      const img = new window.Image()
      img.onload = () => {
        setBgImage(img)
      }
      img.onerror = () => {
        console.error('Failed to load background image')
        setBgImage(null)
      }
      img.src = `data:image/jpeg;base64,${circuit.schematic_image}`
    } else {
      setBgImage(null)
    }
  }, [circuit?.schematic_image, currentMode])

  function handleComponentClick(id) {
    console.log('Component clicked:', id)
  }

  function renderComponent(component, onClick) {
    switch (component.type) {
      case 'resistor': return <Resistor key={component.id} component={component} onClick={onClick} />
      case 'led': return <LED key={component.id} component={component} onClick={onClick} />
      case 'capacitor': return <Capacitor key={component.id} component={component} onClick={onClick} />
      case 'ic': return <IC key={component.id} component={component} onClick={onClick} />
      default: return <GenericComponent key={component.id} component={component} onClick={onClick} />
    }
  }

  function renderConnections() {
    return connections.map((conn, i) => (
      <Line
        key={i}
        points={[
          Math.random() * CANVAS_WIDTH, Math.random() * CANVAS_HEIGHT,
          Math.random() * CANVAS_WIDTH, Math.random() * CANVAS_HEIGHT
        ]}
        stroke="#22c55e"
        strokeWidth={2}
      />
    ))
  }

  function renderTraces() {
    return traces.map((trace, i) => (
      <Line
        key={i}
        points={trace.path || [0, 0, 100, 100]}
        stroke="#fbbf24"
        strokeWidth={3}
      />
    ))
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Canvas {currentMode === 'pcb' && '(PCB Layout)'} {currentMode === 'arduino' && '(Arduino Board)'} {currentMode === 'board_image' && '(Board Image)'} {currentMode === 'board_recreated' && '(Recreated Board)'}
          </span>
          {currentMode === 'arduino' && (
            <span className="text-xs text-green-400">
              ✓ Arduino UNO Layout
            </span>
          )}
        </div>
        
        {/* Mode Toggle Button */}
        {(currentMode === 'arduino' || currentMode === 'agent') && circuit && (
          <button
            onClick={toggleCanvasMode}
            className="flex items-center gap-2 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            {currentMode === 'arduino' ? 'Add Breadboard' : 'Arduino Only'}
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-auto bg-gray-900">
        {!circuit ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              <p className="text-lg font-medium mb-2">No Circuit Loaded</p>
              <p className="text-sm">Upload a schematic PDF or board image to get started</p>
            </div>
          </div>
        ) : (
          <Stage width={CANVAS_WIDTH} height={CANVAS_HEIGHT}>
            <Layer>
              {/* Arduino board background (arduino mode only) */}
              {currentMode === 'arduino' && <ArduinoBoard components={components} />}

              {/* Board image background (board_image or board_recreated mode) */}
              {(currentMode === 'board_image' || currentMode === 'board_recreated') && bgImage && (
                <KonvaImage
                  image={bgImage}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  opacity={0.8}
                />
              )}

              {/* Grid dots (breadboard mode only) */}
              {currentMode === 'agent' && Array.from({ length: 40 }, (_, row) =>
                Array.from({ length: 60 }, (_, col) => (
                  <Circle
                    key={`${row}-${col}`}
                    x={col * CELL}
                    y={row * CELL}
                    radius={2}
                    fill="#374151"
                  />
                ))
              )}

              {/* Render traces (PCB mode) or connections (breadboard mode) */}
              {currentMode === 'pcb' ? renderTraces() : (currentMode === 'agent' && renderConnections())}

              {/* Render individual components (breadboard mode only) */}
              {currentMode === 'agent' && components.map((c) => renderComponent(c, () => handleComponentClick(c.id)))}
            </Layer>
          </Stage>
        )}
      </div>
    </div>
  )
}