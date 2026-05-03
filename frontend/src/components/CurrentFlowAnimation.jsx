import { useEffect, useRef, useCallback } from 'react'
import { Layer, Circle } from 'react-konva'
import { getPinPosition } from './ComponentRenderer'

// P4 owns this file
// Animates current-flow dots along every wire on the canvas simultaneously

const CELL = 20
const DOTS_PER_WIRE = 2   // dots per individual connection segment
const SPEED = 100         // px/sec base speed
const DOT_SPACING = 0.45  // fraction of wire length between dots on same wire

function resolveEndpoint(endpoint, components, canvasHeight) {
  if (endpoint === 'VCC') return { x: CELL * 2, y: CELL * 1 }
  if (endpoint === 'GND') return { x: CELL * 2, y: canvasHeight - CELL * 1 }
  const dotIdx = endpoint.indexOf('.')
  if (dotIdx === -1) return null
  const compId = endpoint.substring(0, dotIdx)
  const pinName = endpoint.substring(dotIdx + 1)
  const comp = components.find((c) => c.id === compId)
  if (!comp) return null
  const pins = getPinPosition(comp)
  return pins[pinName] ?? null
}

// Build the right-angle waypoints for a single connection (same routing as WireRenderer)
function buildWireWaypoints(from, to) {
  const midX = (from.x + to.x) / 2
  return [
    { x: from.x, y: from.y },
    { x: midX,   y: from.y },
    { x: midX,   y: to.y   },
    { x: to.x,   y: to.y   },
  ]
}

function buildPathDistances(waypoints) {
  const dists = [0]
  for (let i = 1; i < waypoints.length; i++) {
    const dx = waypoints[i].x - waypoints[i - 1].x
    const dy = waypoints[i].y - waypoints[i - 1].y
    dists.push(dists[i - 1] + Math.sqrt(dx * dx + dy * dy))
  }
  return dists
}

function positionAtDistance(waypoints, dists, d) {
  const totalLen = dists[dists.length - 1]
  if (totalLen === 0) return waypoints[0]
  d = ((d % totalLen) + totalLen) % totalLen
  for (let i = 1; i < dists.length; i++) {
    if (d <= dists[i]) {
      const segLen = dists[i] - dists[i - 1]
      const t = segLen > 0 ? (d - dists[i - 1]) / segLen : 0
      return {
        x: waypoints[i - 1].x + (waypoints[i].x - waypoints[i - 1].x) * t,
        y: waypoints[i - 1].y + (waypoints[i].y - waypoints[i - 1].y) * t,
      }
    }
  }
  return waypoints[waypoints.length - 1]
}

export default function CurrentFlowAnimation({ components, connections, playing, resetCount, speed = 1, canvasHeight = 840 }) {
  const dotsRef = useRef([])       // flat array of Konva Circle nodes
  const animRef = useRef(null)
  const dotStateRef = useRef([])   // [{ wireIdx, distance }]
  const lastTimeRef = useRef(null)

  // Build per-wire path data
  const wiresRef = useRef([])
  const wires = (connections || []).reduce((acc, conn) => {
    const from = resolveEndpoint(conn.from, components || [], canvasHeight)
    const to   = resolveEndpoint(conn.to,   components || [], canvasHeight)
    if (from && to) {
      const wp = buildWireWaypoints(from, to)
      const ds = buildPathDistances(wp)
      acc.push({ waypoints: wp, dists: ds, totalLen: ds[ds.length - 1] })
    }
    return acc
  }, [])
  wiresRef.current = wires

  const totalDots = wires.length * DOTS_PER_WIRE
  const speedRef = useRef(speed)
  speedRef.current = speed

  const animate = useCallback(() => {
    const now = performance.now()
    const dt = lastTimeRef.current ? (now - lastTimeRef.current) / 1000 : 0.016
    lastTimeRef.current = now

    const ws = wiresRef.current
    const state = dotStateRef.current

    dotsRef.current.forEach((dot, i) => {
      if (!dot) return
      const s = state[i]
      if (!s) return
      const wire = ws[s.wireIdx]
      if (!wire || wire.totalLen === 0) {
        dot.visible(false)
        return
      }
      s.distance = (s.distance + SPEED * speedRef.current * dt) % wire.totalLen
      const pos = positionAtDistance(wire.waypoints, wire.dists, s.distance)
      dot.x(pos.x)
      dot.y(pos.y)
      dot.visible(true)
      dot.opacity(0.9)
    })

    const layer = dotsRef.current.find(Boolean)?.getLayer()
    if (layer) layer.batchDraw()

    animRef.current = requestAnimationFrame(animate)
  }, [])

  // Initialize dot state when wires change
  useEffect(() => {
    dotStateRef.current = []
    wires.forEach((wire, wireIdx) => {
      for (let d = 0; d < DOTS_PER_WIRE; d++) {
        dotStateRef.current.push({
          wireIdx,
          distance: wire.totalLen * DOT_SPACING * d,
        })
      }
    })
  }, [connections, components])

  // Start / stop
  useEffect(() => {
    if (playing && wires.length > 0) {
      lastTimeRef.current = null
      animRef.current = requestAnimationFrame(animate)
    } else {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current)
        animRef.current = null
      }
      if (!playing) {
        dotsRef.current.forEach((dot) => dot?.visible(false))
        const layer = dotsRef.current.find(Boolean)?.getLayer()
        if (layer) layer.batchDraw()
      }
    }
    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current)
        animRef.current = null
      }
    }
  }, [playing, wires.length, animate])

  // Reset
  useEffect(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current)
      animRef.current = null
    }
    dotStateRef.current = []
    dotsRef.current.forEach((dot) => {
      if (!dot) return
      dot.visible(false)
      dot.opacity(0)
    })
    const layer = dotsRef.current.find(Boolean)?.getLayer()
    if (layer) layer.batchDraw()
  }, [resetCount])

  if (totalDots === 0) return <Layer listening={false} />

  return (
    <Layer listening={false}>
      {Array.from({ length: totalDots }, (_, i) => {
        const wireIdx = Math.floor(i / DOTS_PER_WIRE)
        const wire = wires[wireIdx]
        const startPos = wire?.waypoints[0] ?? { x: 0, y: 0 }
        return (
          <Circle
            key={`flow-dot-${i}`}
            ref={(node) => { dotsRef.current[i] = node }}
            x={startPos.x}
            y={startPos.y}
            radius={4}
            fill="#facc15"
            shadowColor="#facc15"
            shadowBlur={8}
            shadowOpacity={0.8}
            opacity={0}
            visible={false}
          />
        )
      })}
    </Layer>
  )
}
