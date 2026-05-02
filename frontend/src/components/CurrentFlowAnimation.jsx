import { useEffect, useRef } from 'react'
import { Layer, Circle } from 'react-konva'
import { getPinPosition } from './ComponentRenderer'
import Konva from 'konva'

const CELL = 20

// Same endpoint resolution as P3's WireRenderer
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

// Build the full ordered path of waypoints following the connections array
// Each connection gets right-angle routed (same as WireRenderer), then chained together
function buildFullPath(connections, components, canvasHeight) {
  const waypoints = []

  for (const conn of connections) {
    const from = resolveEndpoint(conn.from, components, canvasHeight)
    const to = resolveEndpoint(conn.to, components, canvasHeight)
    if (!from || !to) continue

    // Right-angle routing matching WireRenderer
    const midX = (from.x + to.x) / 2

    // Skip the first point if it duplicates the last waypoint (continuous path)
    if (waypoints.length === 0 || waypoints[waypoints.length - 1].x !== from.x || waypoints[waypoints.length - 1].y !== from.y) {
      waypoints.push(from)
    }
    waypoints.push({ x: midX, y: from.y })
    waypoints.push({ x: midX, y: to.y })
    waypoints.push(to)
  }

  return waypoints
}

// Build tween segments from waypoints with duration proportional to distance
function buildSegments(waypoints, speed) {
  const segments = []
  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1]
    const wp = waypoints[i]
    const dist = Math.abs(wp.x - prev.x) + Math.abs(wp.y - prev.y)
    if (dist < 1) continue // skip zero-length segments
    segments.push({ x: wp.x, y: wp.y, duration: Math.max(dist / speed, 0.03) })
  }
  return segments
}

export default function CurrentFlowAnimation({ components, connections, playing, canvasHeight = 840 }) {
  const dotRef = useRef(null)
  const cancelRef = useRef(false)

  const waypoints = buildFullPath(connections || [], components || [], canvasHeight)
  const hasPath = waypoints.length >= 2

  useEffect(() => {
    cancelRef.current = true
    const dot = dotRef.current
    if (!dot) return

    if (!playing || !hasPath) {
      dot.visible(false)
      return
    }

    cancelRef.current = false
    const segments = buildSegments(waypoints, 120) // 120 px/sec
    if (segments.length === 0) { dot.visible(false); return }

    dot.position(waypoints[0])
    dot.visible(true)

    function animateSegment(i) {
      if (cancelRef.current || i >= segments.length) {
        // Loop: restart from beginning after a short pause
        if (!cancelRef.current) {
          setTimeout(() => {
            if (cancelRef.current) return
            dot.position(waypoints[0])
            animateSegment(0)
          }, 400)
        }
        return
      }

      const seg = segments[i]
      const tween = new Konva.Tween({
        node: dot,
        x: seg.x,
        y: seg.y,
        duration: seg.duration,
        easing: Konva.Easings.Linear,
        onFinish: () => animateSegment(i + 1),
      })
      tween.play()
    }

    animateSegment(0)

    return () => { cancelRef.current = true }
  }, [playing, connections?.length, components?.length])

  if (!hasPath) return <Layer listening={false} />

  return (
    <Layer listening={false}>
      <Circle
        ref={dotRef}
        x={waypoints[0]?.x ?? 0}
        y={waypoints[0]?.y ?? 0}
        radius={6}
        fill="#facc15"
        shadowColor="#facc15"
        shadowBlur={10}
        shadowOpacity={0.8}
        visible={false}
      />
    </Layer>
  )
}
