import { useEffect, useRef } from 'react'
import { Layer, Circle } from 'react-konva'
import { getPinPosition } from './ComponentRenderer'
import Konva from 'konva'

const CELL = 20
const NUM_DOTS = 4
const SPEED = 120 // px per second
const STAGGER_MS = 600 // delay between each dot's start

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
    if (!from || !to) break // stop at first unresolvable connection

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

function buildSegments(waypoints) {
  const segments = []
  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1]
    const wp = waypoints[i]
    const dx = Math.abs(wp.x - prev.x)
    const dy = Math.abs(wp.y - prev.y)
    // Skip diagonal moves (gap between connections) — teleport instead
    if (dx > 1 && dy > 1) {
      segments.push({ x: wp.x, y: wp.y, duration: 0 })
      continue
    }
    const dist = dx + dy
    if (dist < 1) continue
    segments.push({ x: wp.x, y: wp.y, duration: Math.max(dist / SPEED, 0.03) })
  }
  return segments
}

function animateDot(dot, waypoints, segments, cancelRef, delay) {
  function run() {
    if (cancelRef.current) return
    dot.position(waypoints[0])
    dot.visible(true)
    dot.opacity(0)

    // Fade in
    const fadeIn = new Konva.Tween({ node: dot, opacity: 1, duration: 0.15 })
    fadeIn.play()

    let i = 0
    function next() {
      if (cancelRef.current || i >= segments.length) {
        // Fade out and stop at the end
        const fadeOut = new Konva.Tween({
          node: dot, opacity: 0, duration: 0.3,
          onFinish: () => { dot.visible(false) }
        })
        fadeOut.play()
        return
      }
      const seg = segments[i++]
      const tween = new Konva.Tween({
        node: dot, x: seg.x, y: seg.y,
        duration: seg.duration,
        easing: Konva.Easings.Linear,
        onFinish: next,
      })
      tween.play()
    }
    next()
  }

  // Stagger the start
  setTimeout(() => { if (!cancelRef.current) run() }, delay)
}

export default function CurrentFlowAnimation({ components, connections, playing, canvasHeight = 840 }) {
  const dotsRef = useRef([])
  const cancelRef = useRef(false)

  const waypoints = buildFullPath(connections || [], components || [], canvasHeight)
  const hasPath = waypoints.length >= 2

  useEffect(() => {
    cancelRef.current = true

    dotsRef.current.forEach((dot) => { if (dot) { dot.visible(false); dot.opacity(0) } })

    if (!playing || !hasPath) return

    cancelRef.current = false
    const segments = buildSegments(waypoints)
    if (segments.length === 0) return

    dotsRef.current.forEach((dot, i) => {
      if (!dot) return
      animateDot(dot, waypoints, segments, cancelRef, i * STAGGER_MS)
    })

    return () => { cancelRef.current = true }
  }, [playing, connections?.length, components?.length])

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
