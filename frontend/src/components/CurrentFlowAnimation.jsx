import { useEffect, useRef } from 'react'
import { Layer, Circle, Line } from 'react-konva'
import Konva from 'konva'

const CELL = 20

// Resolve a pin name like "R1.pin1" or "VCC" to pixel coordinates
function pinToPos(pin, componentsMap) {
  // For VCC/GND, place them relative to the circuit's bounding box
  const allComps = Object.values(componentsMap)
  const minY = Math.min(...allComps.map(c => c.position[1])) * CELL
  const maxX = Math.max(...allComps.map(c => c.position[0])) * CELL + CELL * 2

  if (pin === 'VCC') {
    const firstComp = allComps[0]
    return { x: firstComp ? firstComp.position[0] * CELL : CELL, y: minY - CELL * 2 }
  }
  if (pin === 'GND') {
    const lastComp = allComps[allComps.length - 1]
    return { x: lastComp ? lastComp.position[0] * CELL + CELL * 2 : maxX, y: minY + CELL * 3 }
  }

  const [compId, pinName] = pin.split('.')
  const comp = componentsMap[compId]
  if (!comp) return { x: 0, y: 0 }

  const bx = comp.position[0] * CELL
  const by = comp.position[1] * CELL
  const midY = by + CELL / 2

  // pin1/anode = left edge, pin2/cathode = right edge of the CELL*2 wide rect
  if (pinName === 'pin1' || pinName === 'anode') return { x: bx, y: midY }
  if (pinName === 'pin2' || pinName === 'cathode') return { x: bx + CELL * 2, y: midY }
  return { x: bx + CELL, y: midY }
}

export default function CurrentFlowAnimation({ components, connections, playing }) {
  const dotsRef = useRef([])
  const tweensRef = useRef([])

  const componentsMap = {}
  for (const c of components || []) componentsMap[c.id] = c

  const wires = (connections || []).map((conn) => {
    const from = pinToPos(conn.from, componentsMap)
    const to = pinToPos(conn.to, componentsMap)
    return { from, to }
  })

  useEffect(() => {
    // Clean up old tweens
    tweensRef.current.forEach((t) => t.destroy())
    tweensRef.current = []

    if (!playing) {
      dotsRef.current.forEach((dot) => { if (dot) dot.visible(false) })
      return
    }

    dotsRef.current.forEach((dot, i) => {
      if (!dot || !wires[i]) return
      const { from, to } = wires[i]
      dot.position(from)
      dot.visible(true)

      const tween = new Konva.Tween({
        node: dot,
        x: to.x,
        y: to.y,
        duration: 1.2,
        easing: Konva.Easings.Linear,
        onFinish: () => {
          dot.position(from)
          tween.reset()
          tween.play()
        },
      })
      tween.play()
      tweensRef.current.push(tween)
    })

    return () => {
      tweensRef.current.forEach((t) => t.destroy())
      tweensRef.current = []
    }
  }, [playing, wires.length])

  return (
    <Layer>
      {/* Draw wire lines */}
      {wires.map((w, i) => (
        <Line
          key={`wire-${i}`}
          points={[w.from.x, w.from.y, w.to.x, w.to.y]}
          stroke="#4ade80"
          strokeWidth={2}
          opacity={0.4}
        />
      ))}

      {/* Animated dots */}
      {wires.map((w, i) => (
        <Circle
          key={`dot-${i}`}
          ref={(node) => { dotsRef.current[i] = node }}
          x={w.from.x}
          y={w.from.y}
          radius={4}
          fill="#facc15"
          visible={false}
        />
      ))}
    </Layer>
  )
}
