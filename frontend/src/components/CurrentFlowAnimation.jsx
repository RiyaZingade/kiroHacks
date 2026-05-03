import { useEffect, useRef, useCallback } from 'react'
import { Layer, Circle } from 'react-konva'
import { getPinPosition } from './ComponentRenderer'

const CELL = 20
const NUM_DOTS = 4
const SPEED = 120
const STAGGER_MS = 600

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

function buildFullPath(connections, components, canvasHeight) {
  const waypoints = []
  for (const conn of connections) {
    const from = resolveEndpoint(conn.from, components, canvasHeight)
    const to = resolveEndpoint(conn.to, components, canvasHeight)
    if (!from || !to) break
    const midX = (from.x + to.x) / 2
    if (waypoints.length === 0 || waypoints[waypoints.length - 1].x !== from.x || waypoints[waypoints.length - 1].y !== from.y) {
      waypoints.push(from)
    }
    waypoints.push({ x: midX, y: from.y })
    waypoints.push({ x: midX, y: to.y })
    waypoints.push(to)
  }
  return waypoints
}

// Compute cumulative distances along the path
function buildPathDistances(waypoints) {
  const dists = [0]
  for (let i = 1; i < waypoints.length; i++) {
    const dx = waypoints[i].x - waypoints[i - 1].x
    const dy = waypoints[i].y - waypoints[i - 1].y
    dists.push(dists[i - 1] + Math.sqrt(dx * dx + dy * dy))
  }
  return dists
}

// Get position along path at a given distance
function positionAtDistance(waypoints, dists, d) {
  const totalLen = dists[dists.length - 1]
  if (totalLen === 0) return waypoints[0]
  d = Math.max(0, Math.min(d, totalLen))
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
  const dotsRef = useRef([])
  const animRef = useRef(null)
  // Track each dot's distance along the path
  const dotDistances = useRef([])
  const lastTimeRef = useRef(null)

  const waypoints = buildFullPath(connections || [], components || [], canvasHeight)
  const hasPath = waypoints.length >= 2
  const dists = hasPath ? buildPathDistances(waypoints) : []
  const totalLen = dists.length > 0 ? dists[dists.length - 1] : 0

  // Store latest waypoints/dists in refs so animation loop sees them
  const waypointsRef = useRef(waypoints)
  const distsRef = useRef(dists)
  const totalLenRef = useRef(totalLen)
  const speedRef = useRef(speed)
  waypointsRef.current = waypoints
  distsRef.current = dists
  totalLenRef.current = totalLen
  speedRef.current = speed

  const animate = useCallback(() => {
    const now = performance.now()
    const dt = lastTimeRef.current ? (now - lastTimeRef.current) / 1000 : 0
    lastTimeRef.current = now

    const wp = waypointsRef.current
    const ds = distsRef.current
    const tl = totalLenRef.current
    if (tl === 0) return

    dotsRef.current.forEach((dot, i) => {
      if (!dot) return
      // Advance distance
      dotDistances.current[i] = (dotDistances.current[i] ?? 0) + SPEED * speedRef.current * dt
      // Loop back to start
      if (dotDistances.current[i] > tl) {
        dotDistances.current[i] = dotDistances.current[i] % tl
      }
      const pos = positionAtDistance(wp, ds, dotDistances.current[i])
      dot.position(pos)
      dot.visible(true)
      dot.opacity(0.9)
    })

    // Force layer redraw
    const layer = dotsRef.current[0]?.getLayer()
    if (layer) layer.batchDraw()

    animRef.current = requestAnimationFrame(animate)
  }, [])

  // Start/stop animation based on playing
  useEffect(() => {
    if (playing && hasPath) {
      lastTimeRef.current = null
      // Initialize distances with stagger if not already set
      dotsRef.current.forEach((_, i) => {
        if (dotDistances.current[i] == null) {
          dotDistances.current[i] = -(i * (totalLen / NUM_DOTS) * 0.3)
        }
      })
      animRef.current = requestAnimationFrame(animate)
    } else {
      // Pause — stop the loop but keep dots where they are
      if (animRef.current) {
        cancelAnimationFrame(animRef.current)
        animRef.current = null
      }
    }
    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current)
        animRef.current = null
      }
    }
  }, [playing, hasPath, animate])

  // Reset — move dots back to start and hide them
  useEffect(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current)
      animRef.current = null
    }
    dotDistances.current = []
    dotsRef.current.forEach((dot) => {
      if (!dot) return
      dot.visible(false)
      dot.opacity(0)
      if (waypoints[0]) dot.position(waypoints[0])
    })
    const layer = dotsRef.current[0]?.getLayer()
    if (layer) layer.batchDraw()
  }, [resetCount])

  if (!hasPath) return <Layer listening={false} />

  return (
    <Layer listening={false}>
      {Array.from({ length: NUM_DOTS }, (_, i) => (
        <Circle
          key={`flow-dot-${i}`}
          ref={(node) => { dotsRef.current[i] = node }}
          x={waypoints[0]?.x ?? 0}
          y={waypoints[0]?.y ?? 0}
          radius={5 - i * 0.5}
          fill="#facc15"
          shadowColor="#facc15"
          shadowBlur={10 - i * 2}
          shadowOpacity={0.8}
          opacity={0}
          visible={false}
        />
      ))}
    </Layer>
  )
}
