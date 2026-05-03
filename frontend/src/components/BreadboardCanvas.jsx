import { Stage, Layer, Rect, Circle, Line, Text, Group, Image as KonvaImage, Arrow } from 'react-konva'
import { useState, useEffect, useRef } from 'react'

const CELL = 28
const CANVAS_WIDTH = 1400
const CANVAS_HEIGHT = 620
// Arduino board â€” fits comfortably with room for pin labels inside
const ARD_X = 30, ARD_Y = 30, ARD_W = 580, ARD_H = 520

// Breadboard â€” sits to the right, vertically centred with the Arduino
// Structure (topâ†’bottom): top rail, gap, 5 rows (aâ€“e), centre gap, 5 rows (fâ€“j), gap, bottom rail
const BB_PAD    = 14   // inner padding
const BB_X      = 640  // left edge
const BB_Y      = 30   // top edge
const BB_COLS   = 30
const BB_ROWS   = 5    // rows per half
const BB_PITCH  = 16   // hole pitch (both axes)
const BB_RAIL_H = 28   // height of each power-rail strip
const BB_RAIL_G = 8    // gap between rail strip and main holes
const BB_MID_G  = 20   // centre gap between the two halves
// Derived
const BB_MAIN_H = BB_ROWS * BB_PITCH          // height of one half's holes
const BB_WIDTH  = BB_COLS * BB_PITCH + BB_PAD * 2
const BB_HEIGHT = BB_RAIL_H + BB_RAIL_G + BB_MAIN_H + BB_MID_G + BB_MAIN_H + BB_RAIL_G + BB_RAIL_H + BB_PAD * 2

// Y offsets (relative to BB_Y + BB_PAD)
const BB_TOP_RAIL_Y  = 0
const BB_TOP_HOLES_Y = BB_RAIL_H + BB_RAIL_G
const BB_BOT_HOLES_Y = BB_TOP_HOLES_Y + BB_MAIN_H + BB_MID_G
const BB_BOT_RAIL_Y  = BB_BOT_HOLES_Y + BB_MAIN_H + BB_RAIL_G

// â”€â”€â”€ Overlap resolver â€” works for any circuit/board â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Takes the raw components array, converts positions to canvas pixels,
// then iteratively nudges any overlapping components apart.
// Returns a new array with adjusted positions (does not mutate the originals).

function getComponentSize(type) {
  // Returns [w, h] bounding box in pixels for each component type
  switch (type) {
    case 'ic':        return [CELL * 5 + 16, CELL * 2.5 + 16]
    case 'resistor':  return [CELL * 3.5 + CELL * 1.6 + 8, CELL * 1.2 + 20]
    case 'led':       return [CELL * 1.7 + CELL * 1.6, CELL * 1.7 + 20]
    case 'capacitor': return [CELL * 1.8 + 8, CELL * 1.8 + 20]
    case 'button':    return [CELL * 1.5, CELL * 1.5]
    case 'connector': return [CELL * 2.5, CELL * 1.5]
    default:          return [CELL * 2.5 + 8, CELL * 1.2 + 16]
  }
}

function toCanvasPx(component) {
  const pos = component.position_percent || component.position
  const isPercent = component.position_percent !== undefined
  return {
    x: isPercent ? (pos[0] / 100) * CANVAS_WIDTH : pos[0] * CELL,
    y: isPercent ? (pos[1] / 100) * CANVAS_HEIGHT : pos[1] * CELL,
  }
}

function resolveOverlaps(components) {
  if (!components || components.length === 0) return components

  const GAP = 10  // minimum gap between bounding boxes
  const MAX_ITER = 60

  // Build working list with mutable pixel positions
  const items = components.map(c => {
    const { x, y } = toCanvasPx(c)
    const [w, h] = getComponentSize(c.type)
    return { c, x, y, w, h }
  })

  for (let iter = 0; iter < MAX_ITER; iter++) {
    let moved = false

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i], b = items[j]

        const ax1 = a.x - a.w / 2 - GAP / 2, ax2 = a.x + a.w / 2 + GAP / 2
        const ay1 = a.y - a.h / 2 - GAP / 2, ay2 = a.y + a.h / 2 + GAP / 2
        const bx1 = b.x - b.w / 2 - GAP / 2, bx2 = b.x + b.w / 2 + GAP / 2
        const by1 = b.y - b.h / 2 - GAP / 2, by2 = b.y + b.h / 2 + GAP / 2

        // Check AABB overlap
        if (ax1 >= bx2 || bx1 >= ax2 || ay1 >= by2 || by1 >= ay2) continue

        // Overlap detected â€” push apart along the axis of least penetration
        const overlapX = Math.min(ax2 - bx1, bx2 - ax1)
        const overlapY = Math.min(ay2 - by1, by2 - ay1)
        const push = (overlapX < overlapY ? overlapX : overlapY) / 2 + 1

        if (overlapX < overlapY) {
          // Push horizontally
          if (a.x < b.x) { a.x -= push; b.x += push }
          else            { a.x += push; b.x -= push }
        } else {
          // Push vertically
          if (a.y < b.y) { a.y -= push; b.y += push }
          else            { a.y += push; b.y -= push }
        }

        // Clamp to canvas bounds
        a.x = Math.max(a.w / 2, Math.min(CANVAS_WIDTH  - a.w / 2, a.x))
        a.y = Math.max(a.h / 2, Math.min(CANVAS_HEIGHT - a.h / 2, a.y))
        b.x = Math.max(b.w / 2, Math.min(CANVAS_WIDTH  - b.w / 2, b.x))
        b.y = Math.max(b.h / 2, Math.min(CANVAS_HEIGHT - b.h / 2, b.y))

        moved = true
      }
    }

    if (!moved) break  // stable â€” stop early
  }

  // Return components with resolved positions as canvas_px
  return items.map(({ c, x, y }) => ({
    ...c,
    position: [Math.round(x), Math.round(y)],
    position_percent: undefined,   // clear percent so useComponentPos uses the new values
    _resolved_px: true,            // flag so useComponentPos treats as raw pixels
  }))
}

// â”€â”€â”€ Standalone component renderers (breadboard / agent mode) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function useComponentPos(component) {
  // _resolved_px means position is already in canvas pixels from resolveOverlaps
  if (component._resolved_px) return { x: component.position[0], y: component.position[1] }
  const pos = component.position_percent || component.position
  const isPercent = component.position_percent !== undefined
  return {
    x: isPercent ? (pos[0] / 100) * CANVAS_WIDTH : pos[0] * CELL,
    y: isPercent ? (pos[1] / 100) * CANVAS_HEIGHT : pos[1] * CELL,
  }
}

function Resistor({ component, onClick }) {
  const { x, y } = useComponentPos(component)
  const rotation = component.rotation || 0
  const label = component.value || component.id
  const W = CELL * 3.5, H = CELL * 1.2

  return (
    <Group x={x} y={y} rotation={rotation} onClick={onClick}>
      {/* leads */}
      <Line points={[-W / 2 - CELL * 0.8, 0, -W / 2, 0]} stroke="#9ca3af" strokeWidth={3} />
      <Line points={[W / 2, 0, W / 2 + CELL * 0.8, 0]} stroke="#9ca3af" strokeWidth={3} />
      {/* body */}
      <Rect x={-W / 2} y={-H / 2} width={W} height={H} fill="#d4a574" stroke="#8b6f47" strokeWidth={2} cornerRadius={3} />
      {/* color bands */}
      <Rect x={-W / 2 + W * 0.2} y={-H / 2} width={4} height={H} fill="#8b4513" />
      <Rect x={-W / 2 + W * 0.4} y={-H / 2} width={4} height={H} fill="#1f2937" />
      <Rect x={-W / 2 + W * 0.6} y={-H / 2} width={4} height={H} fill="#ef4444" />
      <Rect x={-W / 2 + W * 0.78} y={-H / 2} width={4} height={H} fill="#fbbf24" />
      {/* label below */}
      <Text x={0} y={H / 2 + 4} text={label} fontSize={11} fill="#e5e7eb" align="center" offsetX={label.length * 3} />
    </Group>
  )
}

function LED({ component, onClick }) {
  const { x, y } = useComponentPos(component)
  const rotation = component.rotation || 0
  const color = component.color || 'red'
  const fillColor = color === 'red' ? '#ef4444' : color === 'green' ? '#22c55e' : color === 'blue' ? '#3b82f6' : '#fbbf24'
  const glowColor = color === 'red' ? '#fca5a5' : color === 'green' ? '#86efac' : color === 'blue' ? '#93c5fd' : '#fde68a'
  const R = CELL * 0.85

  return (
    <Group x={x} y={y} rotation={rotation} onClick={onClick}>
      {/* leads */}
      <Line points={[-R - CELL * 0.8, 0, -R, 0]} stroke="#9ca3af" strokeWidth={3} />
      <Line points={[R, 0, R + CELL * 0.8, 0]} stroke="#9ca3af" strokeWidth={3} />
      {/* glow */}
      <Circle radius={R + 5} fill={glowColor} opacity={0.25} />
      {/* body */}
      <Circle radius={R} fill={fillColor} stroke="#1f2937" strokeWidth={2} />
      {/* flat edge (cathode) */}
      <Line points={[R * 0.6, -R * 0.8, R * 0.6, R * 0.8]} stroke="#1f2937" strokeWidth={2} />
      {/* label */}
      <Text x={0} y={R + 6} text={component.id} fontSize={11} fill="#e5e7eb" align="center" offsetX={component.id.length * 3} />
    </Group>
  )
}

function Capacitor({ component, onClick }) {
  const { x, y } = useComponentPos(component)
  const rotation = component.rotation || 0
  const label = component.value || component.id

  return (
    <Group x={x} y={y} rotation={rotation} onClick={onClick}>
      {/* leads */}
      <Line points={[-CELL * 0.9, 0, -CELL * 0.25, 0]} stroke="#9ca3af" strokeWidth={3} />
      <Line points={[CELL * 0.25, 0, CELL * 0.9, 0]} stroke="#9ca3af" strokeWidth={3} />
      {/* plates */}
      <Line points={[-CELL * 0.25, -CELL * 0.9, -CELL * 0.25, CELL * 0.9]} stroke="#9ca3af" strokeWidth={5} />
      <Line points={[CELL * 0.25, -CELL * 0.9, CELL * 0.25, CELL * 0.9]} stroke="#9ca3af" strokeWidth={5} />
      {/* label */}
      <Text x={0} y={CELL + 4} text={label} fontSize={11} fill="#e5e7eb" align="center" offsetX={label.length * 3} />
    </Group>
  )
}

function IC({ component, onClick }) {
  const { x, y } = useComponentPos(component)
  const rotation = component.rotation || 0
  const label = component.value || component.id
  const W = CELL * 5, H = CELL * 2.5

  return (
    <Group x={x} y={y} rotation={rotation} onClick={onClick}>
      <Rect x={-W / 2} y={-H / 2} width={W} height={H} fill="#1f2937" stroke="#4b5563" strokeWidth={2} cornerRadius={5} />
      {/* notch */}
      <Circle x={0} y={-H / 2} radius={5} fill="#111827" />
      {/* pin dots left */}
      {[0, 1, 2].map(i => <Circle key={`l${i}`} x={-W / 2} y={-H / 4 + i * (H / 4)} radius={3} fill="#6b7280" />)}
      {/* pin dots right */}
      {[0, 1, 2].map(i => <Circle key={`r${i}`} x={W / 2} y={-H / 4 + i * (H / 4)} radius={3} fill="#6b7280" />)}
      <Text x={0} y={-6} text={label} fontSize={12} fill="#e5e7eb" align="center" offsetX={label.length * 3.5} fontStyle="bold" />
    </Group>
  )
}

// â”€â”€â”€ Arduino Board â€” fixed schematic layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Board occupies a fixed region; all sub-components are placed at known pixel
// offsets so nothing ever overflows or overlaps.

// Pin header helper â€” renders a row of gold pins with labels
function PinHeader({ x, y, pins, direction = 'vertical', labelSide = 'right' }) {
  const PITCH = 20
  return (
    <Group>
      {pins.map((label, i) => {
        const px = direction === 'horizontal' ? x + i * PITCH : x
        const py = direction === 'horizontal' ? y : y + i * PITCH
        const isGnd = label === 'GND'
        const isPwr = label === '5V' || label === '3.3V' || label === 'VIN'
        const pinFill = isGnd ? '#374151' : isPwr ? '#dc2626' : '#ca8a04'
        const pinStroke = isGnd ? '#6b7280' : isPwr ? '#ef4444' : '#fbbf24'

        // Horizontal: label sits above the pin, centred
        if (direction === 'horizontal') {
          return (
            <Group key={label + i}>
              <Rect x={px - 4} y={py - 5} width={8} height={10}
                fill={pinFill} stroke={pinStroke} strokeWidth={1} cornerRadius={1} />
              <Text x={px} y={py - 19} text={label} fontSize={8}
                fill="#d1d5db" align="center" offsetX={label.length * 2.4} />
            </Group>
          )
        }

        // Vertical right-side (labelSide="left"):
        //   pin rect at pxÂ±5, label ends just before px-7 with right-align
        // Vertical left-side (labelSide="right"):
        //   pin rect at pxÂ±5, label starts just after px+7 with left-align
        if (labelSide === 'left') {
          // Text drawn right-aligned, ending 8px left of pin centre
          return (
            <Group key={label + i}>
              <Rect x={px - 5} y={py - 4} width={10} height={8}
                fill={pinFill} stroke={pinStroke} strokeWidth={1} cornerRadius={1} />
              <Text
                x={px - 8}
                y={py - 5}
                text={label}
                fontSize={9}
                fill="#d1d5db"
                align="right"
                width={52}
                offsetX={52}
              />
            </Group>
          )
        }

        // labelSide === 'right': text left-aligned, starting 8px right of pin centre
        return (
          <Group key={label + i}>
            <Rect x={px - 5} y={py - 4} width={10} height={8}
              fill={pinFill} stroke={pinStroke} strokeWidth={1} cornerRadius={1} />
            <Text
              x={px + 8}
              y={py - 5}
              text={label}
              fontSize={9}
              fill="#d1d5db"
              align="left"
              width={52}
            />
          </Group>
        )
      })}
    </Group>
  )
}

// Chip component â€” DIP/SMD package with label
function Chip({ x, y, w, h, label, sublabel = '' }) {
  return (
    <Group>
      <Rect x={x - w / 2} y={y - h / 2} width={w} height={h}
        fill="#111827" stroke="#4b5563" strokeWidth={2} cornerRadius={4} />
      <Circle x={x - w / 2 + 8} y={y - h / 2 + 8} radius={4} fill="#1f2937" />
      <Text x={x} y={y - 7} text={label} fontSize={11} fill="#e5e7eb"
        align="center" offsetX={label.length * 3.2} fontStyle="bold" />
      {sublabel ? (
        <Text x={x} y={y + 6} text={sublabel} fontSize={8} fill="#6b7280"
          align="center" offsetX={sublabel.length * 2.2} />
      ) : null}
    </Group>
  )
}

// Connector block
function Connector({ x, y, w, h, label, fill = '#6b7280', stroke = '#9ca3af' }) {
  return (
    <Group>
      <Rect x={x - w / 2} y={y - h / 2} width={w} height={h}
        fill={fill} stroke={stroke} strokeWidth={1.5} cornerRadius={3} />
      <Text x={x} y={y - 5} text={label} fontSize={9} fill="#f9fafb"
        align="center" offsetX={label.length * 2.5} fontStyle="bold" />
    </Group>
  )
}

// LED indicator dot
function LedDot({ x, y, color, label }) {
  const fills = { green: '#22c55e', red: '#ef4444', yellow: '#fbbf24', blue: '#3b82f6', orange: '#f97316' }
  const glows = { green: '#86efac', red: '#fca5a5', yellow: '#fde68a', blue: '#93c5fd', orange: '#fed7aa' }
  const f = fills[color] || fills.orange
  const g = glows[color] || glows.orange
  return (
    <Group>
      <Circle x={x} y={y} radius={9} fill={g} opacity={0.3} />
      <Circle x={x} y={y} radius={6} fill={f} stroke="#1f2937" strokeWidth={1.5} />
      <Text x={x} y={y + 10} text={label} fontSize={8} fill="#d1d5db"
        align="center" offsetX={label.length * 2} />
    </Group>
  )
}

// Reset button
function ResetButton({ x, y }) {
  return (
    <Group>
      <Rect x={x - 10} y={y - 10} width={20} height={20}
        fill="#1f2937" stroke="#4b5563" strokeWidth={1.5} cornerRadius={3} />
      <Circle x={x} y={y} radius={6} fill="#374151" stroke="#6b7280" strokeWidth={1.5} />
      <Text x={x} y={y + 14} text="RESET" fontSize={8} fill="#9ca3af"
        align="center" offsetX={12} />
    </Group>
  )
}

// â”€â”€â”€ Generic Board â€” renders any board from circuit JSON components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Used for all non-UNO boards (Nano, Mega, ESP32, Pico, custom, etc.)
// Board colour and label come from circuit metadata.

const BOARD_COLORS = {
  nano:    { pcb: '#1a5490', dark: '#0f3460', accent: '#93c5fd', label: 'Arduino Nano' },
  mega:    { pcb: '#1a5490', dark: '#0f3460', accent: '#93c5fd', label: 'Arduino Mega' },
  esp32:   { pcb: '#1a3a1a', dark: '#0f2a0f', accent: '#86efac', label: 'ESP32' },
  esp8266: { pcb: '#1a3a1a', dark: '#0f2a0f', accent: '#86efac', label: 'ESP8266' },
  pico:    { pcb: '#2a1a3a', dark: '#1a0f2a', accent: '#c4b5fd', label: 'Raspberry Pi Pico' },
  stm32:   { pcb: '#1a1a3a', dark: '#0f0f2a', accent: '#93c5fd', label: 'STM32' },
  unknown: { pcb: '#1e3a2a', dark: '#0f2a1a', accent: '#6ee7b7', label: 'Circuit Board' },
}

function GenericBoard({ components, boardName, boardType }) {
  const bx = ARD_X, by = ARD_Y, bw = ARD_W, bh = ARD_H
  const colors = BOARD_COLORS[boardType] || BOARD_COLORS.unknown
  const displayName = boardName || colors.label

  // Size component shapes based on type
  function compSize(type) {
    switch (type) {
      case 'ic':        return [70, 40]
      case 'connector': return [36, 24]
      case 'button':    return [16, 16]
      case 'led':       return [12, 12]  // circle
      case 'resistor':  return [30, 10]
      case 'capacitor': return [10, 18]
      case 'crystal':   return [22, 10]
      case 'pin':       return [8, 6]
      default:          return [24, 16]
    }
  }

  function compFill(type, value = '') {
    switch (type) {
      case 'ic':        return '#111827'
      case 'connector': return '#9ca3af'
      case 'button':    return '#374151'
      case 'led': {
        const v = value.toLowerCase()
        if (/green|pwr|on/.test(v)) return '#22c55e'
        if (/red/.test(v))          return '#ef4444'
        if (/blue/.test(v))         return '#3b82f6'
        if (/yellow|l$/.test(v))    return '#fbbf24'
        return '#f97316'
      }
      case 'resistor':  return '#d4a574'
      case 'capacitor': return '#4b5563'
      case 'crystal':   return '#c0c0c0'
      case 'pin':       return '#ca8a04'
      default:          return '#374151'
    }
  }

  // Place components using percent positions mapped onto the board area
  // Inner area: leave 30px margin on all sides, 50px at bottom for label strip
  const innerX = bx + 30, innerY = by + 30
  const innerW = bw - 60, innerH = bh - 80

  return (
    <Group>
      {/* PCB shadow */}
      <Rect x={bx+4} y={by+4} width={bw} height={bh} fill="#000" opacity={0.25} cornerRadius={12} />
      {/* PCB body */}
      <Rect x={bx} y={by} width={bw} height={bh} fill={colors.pcb} stroke={colors.dark} strokeWidth={3} cornerRadius={12} />
      {/* Bottom label strip */}
      <Rect x={bx} y={by+bh-44} width={bw} height={44} fill={colors.dark} cornerRadius={[0,0,12,12]} />
      <Text x={bx+22} y={by+bh-34} text={displayName} fontSize={16} fill="#fff" fontStyle="bold" />

      {/* Mounting holes */}
      {[[bx+18,by+18],[bx+bw-18,by+18],[bx+18,by+bh-18],[bx+bw-58,by+bh-18]].map(([hx,hy],i) => (
        <Group key={i}>
          <Circle x={hx} y={hy} radius={7} fill={colors.dark} stroke="#1e40af" strokeWidth={1} />
          <Circle x={hx} y={hy} radius={3} fill="#0a1f38" />
        </Group>
      ))}

      {/* Render components from circuit JSON */}
      {components && components.map((comp, idx) => {
        if (!comp || !comp.position) return null

        // Map percent or grid position onto inner board area
        let cx, cy
        if (comp.position_type === 'percent' || comp.position_percent) {
          const pos = comp.position_percent || comp.position
          cx = innerX + (pos[0] / 100) * innerW
          cy = innerY + (pos[1] / 100) * innerH
        } else if (comp._resolved_px) {
          cx = comp.position[0]
          cy = comp.position[1]
        } else {
          // grid coords â€” map onto inner area
          cx = innerX + Math.min(comp.position[0] / 50, 1) * innerW
          cy = innerY + Math.min(comp.position[1] / 35, 1) * innerH
        }

        const type = comp.type || 'generic'
        const value = comp.value || comp.id || ''
        const label = value.length > 10 ? value.slice(0, 9) + 'â€¦' : value
        const [w, h] = compSize(type)
        const fill = compFill(type, value)
        const isCircle = type === 'led' || type === 'button'
        const isPin = type === 'pin'

        return (
          <Group key={comp.id || idx}>
            {isCircle ? (
              <>
                <Circle x={cx} y={cy} radius={w/2 + 3} fill={fill} opacity={0.2} />
                <Circle x={cx} y={cy} radius={w/2} fill={fill} stroke="#1f2937" strokeWidth={1.5} />
              </>
            ) : isPin ? (
              <Rect x={cx-w/2} y={cy-h/2} width={w} height={h}
                fill={fill} stroke="#d97706" strokeWidth={1} cornerRadius={1} />
            ) : (
              <Rect x={cx-w/2} y={cy-h/2} width={w} height={h}
                fill={fill} stroke="#4b5563" strokeWidth={1.5} cornerRadius={2} />
            )}
            <Text
              x={cx} y={cy + (isCircle ? w/2+4 : h/2+4)}
              text={label} fontSize={8} fill={colors.accent}
              align="center" offsetX={label.length * 2.2}
            />
          </Group>
        )
      })}
    </Group>
  )
}

function ArduinoBoard({ components }) {
  const bx = ARD_X, by = ARD_Y, bw = ARD_W, bh = ARD_H

  // ── Overlap prevention ───────────────────────────────────────────────────
  const placed = []
  const MARGIN = 6  // minimum gap between any two elements

  function overlaps(x1, y1, x2, y2) {
    return placed.some(([px1, py1, px2, py2]) =>
      x1 < px2 + MARGIN && x2 > px1 - MARGIN &&
      y1 < py2 + MARGIN && y2 > py1 - MARGIN
    )
  }

  // Register a box and return its final [cx, cy] centre.
  // If it overlaps, nudge downward in steps until clear (or give up after 20 tries).
  function place(cx, cy, w, h) {
    let x1 = cx - w / 2, y1 = cy - h / 2
    let x2 = cx + w / 2, y2 = cy + h / 2
    let tries = 0
    while (overlaps(x1, y1, x2, y2) && tries < 20) {
      cy += h / 2 + MARGIN
      x1 = cx - w / 2; y1 = cy - h / 2
      x2 = cx + w / 2; y2 = cy + h / 2
      tries++
    }
    // Clamp inside board (leave 10px from edges, 50px from bottom strip)
    cx = Math.max(bx + w / 2 + 10, Math.min(bx + bw - w / 2 - 10, cx))
    cy = Math.max(by + h / 2 + 10, Math.min(by + bh - h / 2 - 50, cy))
    x1 = cx - w / 2; y1 = cy - h / 2
    x2 = cx + w / 2; y2 = cy + h / 2
    placed.push([x1, y1, x2, y2])
    return [cx, cy]
  }

  // â”€â”€ Pin definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Right edge: two groups of pins, 20px pitch, all inside the board
  // Top group: D8â€“SCL (10 pins), starting 60px from top
  const rightTopPins = ['D8','D9~','D10~','D11~','D12','D13','GND','AREF','SDA','SCL']
  // Bottom group: D7â€“RX (8 pins)
  const rightBotPins = ['D7','D6~','D5~','D4','D3~','D2','TX1','RX0']

  // Left edge: power header (7 pins), starting 200px from top
  const leftPins = ['IOREF','RESET','3.3V','5V','GND','GND','VIN']

  // Bottom edge: analog A0â€“A5, centred
  const analogPins = ['A0','A1','A2','A3','A4','A5']

  // Right-edge pin X â€” inset enough that labels (max ~52px wide) clear the board edge
  const pinRX = bx + bw - 42
  // Left-edge pin X
  const pinLX = bx + 22
  // Right-top group starts below the LED cluster (LEDs at y=44, glow radius ~18px)
  const pinRTopY = by + 80
  // Right-bot group: after top group + 30px gap for visual separation
  const pinRBotY = pinRTopY + rightTopPins.length * 20 + 30
  // Left group starts 200px from top
  const pinLY = by + 200
  // Analog row Y: 55px above bottom edge (above label strip)
  const pinAY = by + bh - 60
  // Analog row starts centred
  const pinAX = bx + bw / 2 - ((analogPins.length - 1) * 20) / 2

  return (
    <Group>
      {/* PCB shadow */}
      <Rect x={bx + 4} y={by + 4} width={bw} height={bh} fill="#000" opacity={0.25} cornerRadius={12} />
      {/* PCB body */}
      <Rect x={bx} y={by} width={bw} height={bh} fill="#1a5490" stroke="#0f3460" strokeWidth={3} cornerRadius={12} />
      {/* Bottom label strip */}
      <Rect x={bx} y={by + bh - 38} width={bw} height={38} fill="#0f3460" cornerRadius={[0, 0, 12, 12]} />
      <Text x={bx + 22} y={by + bh - 30} text="Arduino UNO" fontSize={16} fill="#fff" fontStyle="bold" />
      <Text x={bx + 22} y={by + bh - 14} text="REV3" fontSize={10} fill="#93c5fd" />

      {/* Mounting holes */}
      {[[bx+18,by+18],[bx+bw-18,by+18],[bx+18,by+bh-18],[bx+bw-58,by+bh-18]].map(([hx,hy],i) => (
        <Group key={i}>
          <Circle x={hx} y={hy} radius={7} fill="#0d2d52" stroke="#1e40af" strokeWidth={1} />
          <Circle x={hx} y={hy} radius={3} fill="#0a1f38" />
        </Group>
      ))}

      {/* â”€â”€ Connectors â”€â”€ */}
      <Connector x={bx+52} y={by+80}  w={44} h={32} label="USB-B" fill="#9ca3af" stroke="#6b7280" />
      <Connector x={bx+52} y={by+150} w={40} h={28} label="PWR"   fill="#374151" stroke="#6b7280" />

      {/* â”€â”€ ICs â”€â”€ */}
      {/* ATmega16U2: box 138â€“222, 74â€“116 */}
      <Chip x={bx+180} y={by+95}  w={84} h={42} label="ATmega16U2" sublabel="USB bridge" />
      {/* NCP1117: box 181â€“239, 200â€“230 â€” clear of ATmega16U2 bottom (116) by 84px */}
      <Chip x={bx+210} y={by+215} w={58} h={30} label="NCP1117"    sublabel="3.3V reg" />
      {/* ATmega328P: box 275â€“385, 290â€“348 â€” clear of NCP1117 bottom (230) by 60px, clear of MCU crystal */}
      <Chip x={bx+330} y={by+319} w={110} h={58} label="ATmega328P" sublabel="MCU" />

      {/* Crystals */}
      {/* USB crystal: below ATmega16U2 (bottom 116), above NCP1117 (top 200) â†’ y=155 */}
      <Group>
        <Rect x={bx+155} y={by+155} width={26} height={11} fill="#c0c0c0" stroke="#9ca3af" strokeWidth={1.5} cornerRadius={2} />
        <Text x={bx+168} y={by+169} text="16MHz" fontSize={7} fill="#9ca3af" align="center" offsetX={13} />
      </Group>
      {/* MCU crystal: above ATmega328P (top 290) â†’ y=265, right of NCP1117 (right 239) â†’ x=295 */}
      <Group>
        <Rect x={bx+295} y={by+265} width={26} height={11} fill="#c0c0c0" stroke="#9ca3af" strokeWidth={1.5} cornerRadius={2} />
        <Text x={bx+308} y={by+279} text="16MHz" fontSize={7} fill="#9ca3af" align="center" offsetX={13} />
      </Group>

      {/* ICSP headers */}
      {/* ICSP2: right of ATmega16U2 (right 222) â†’ x=268, same row */}
      <Group>
        <Rect x={bx+268} y={by+88} width={22} height={14} fill="#374151" stroke="#6b7280" strokeWidth={1} cornerRadius={2} />
        <Text x={bx+279} y={by+106} text="ICSP2" fontSize={7} fill="#9ca3af" align="center" offsetX={13} />
      </Group>
      {/* ICSP1: far right, same row â€” clear of pin header (pinRX = bx+bw-42 = 568) */}
      <Group>
        <Rect x={bx+440} y={by+88} width={22} height={14} fill="#374151" stroke="#6b7280" strokeWidth={1} cornerRadius={2} />
        <Text x={bx+451} y={by+106} text="ICSP1" fontSize={7} fill="#9ca3af" align="center" offsetX={13} />
      </Group>

      {/* LEDs â€” inset from top-right corner */}
      <LedDot x={bx+bw-110} y={by+44} color="orange" label="TX" />
      <LedDot x={bx+bw-86}  y={by+44} color="orange" label="RX" />
      <LedDot x={bx+bw-62}  y={by+44} color="yellow" label="L"  />
      <LedDot x={bx+bw-38}  y={by+44} color="green"  label="PWR"/>

      {/* Reset button */}
      <ResetButton x={bx+130} y={by+70} />

      {/* â”€â”€ Pin headers â”€â”€ */}
      {/* Right edge â€” top group (D8â€“SCL), labels point left (inside board) */}
      <PinHeader x={pinRX} y={pinRTopY} pins={rightTopPins} direction="vertical" labelSide="left" />
      {/* Right edge â€” bottom group (D7â€“RX0), labels point left (inside board) */}
      <PinHeader x={pinRX} y={pinRBotY} pins={rightBotPins} direction="vertical" labelSide="left" />
      {/* Left edge â€” power header, labels point right */}
      <PinHeader x={pinLX} y={pinLY} pins={leftPins} direction="vertical" labelSide="right" />
      {/* Bottom edge â€” analog A0â€“A5, labels above */}
      <PinHeader x={pinAX} y={pinAY} pins={analogPins} direction="horizontal" labelSide="right" />
    </Group>
  )
}

// â”€â”€â”€ Breadboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Breadboard({ externalComponents, wiringConnections }) {
  // Absolute Y for a given section (relative to canvas, not BB_Y)
  const innerY = BB_Y + BB_PAD  // top of inner content

  // Hole position helper
  function holePos(col, row, half) {
    const x = BB_X + BB_PAD + col * BB_PITCH
    const sectionY = half === 'top' ? BB_TOP_HOLES_Y : BB_BOT_HOLES_Y
    const y = innerY + sectionY + row * BB_PITCH
    return { x, y }
  }

  // Rail hole position helper
  function railHolePos(col, rail) {
    // rail: 'topPlus' | 'topMinus' | 'botPlus' | 'botMinus'
    const x = BB_X + BB_PAD + col * BB_PITCH
    const railY = {
      topPlus:  innerY + BB_TOP_RAIL_Y + BB_RAIL_H * 0.3,
      topMinus: innerY + BB_TOP_RAIL_Y + BB_RAIL_H * 0.7,
      botPlus:  innerY + BB_BOT_RAIL_Y + BB_RAIL_H * 0.3,
      botMinus: innerY + BB_BOT_RAIL_Y + BB_RAIL_H * 0.7,
    }[rail]
    return { x, y: railY }
  }

  const HOLE_R = 3.5

  // Build main hole grid
  const holes = []
  for (const half of ['top', 'bottom']) {
    for (let row = 0; row < BB_ROWS; row++) {
      for (let col = 0; col < BB_COLS; col++) {
        const { x, y } = holePos(col, row, half)
        holes.push(
          <Circle key={`${half}-${row}-${col}`} x={x} y={y}
            radius={HOLE_R} fill="#1a1a1a" stroke="#666" strokeWidth={0.8} />
        )
      }
    }
  }

  // Build rail holes
  const railHoles = []
  for (const rail of ['topPlus','topMinus','botPlus','botMinus']) {
    const color = rail.includes('Plus') ? '#ef4444' : '#3b82f6'
    for (let col = 0; col < BB_COLS; col++) {
      const { x, y } = railHolePos(col, rail)
      railHoles.push(
        <Circle key={`${rail}-${col}`} x={x} y={y}
          radius={HOLE_R} fill="#1a1a1a" stroke={color} strokeWidth={1} />
      )
    }
  }

  // Row labels
  const topLabels = ['a','b','c','d','e']
  const botLabels = ['f','g','h','i','j']
  const labelX = BB_X + BB_PAD + BB_COLS * BB_PITCH + 6

  // External components on breadboard
  const extComps = (externalComponents || []).map((comp, i) => {
    if (!comp.bb_position) return null
    const { col, row, half = 'top' } = comp.bb_position
    const { x, y } = holePos(col, row, half)
    const type = comp.type || ''
    const label = comp.value || comp.id || ''
    if (type === 'led' || /led/i.test(label)) {
      const fill = /green/i.test(label) ? '#22c55e' : /blue/i.test(label) ? '#3b82f6' : /yellow/i.test(label) ? '#fbbf24' : '#ef4444'
      return (
        <Group key={comp.id || i}>
          <Circle x={x} y={y} radius={9} fill={fill} stroke="#1f2937" strokeWidth={2} />
          <Text x={x} y={y+12} text={label} fontSize={9} fill="#e5e7eb" align="center" offsetX={label.length*2.5} />
        </Group>
      )
    }
    if (type === 'resistor' || /resistor|Î©/i.test(label)) {
      return (
        <Group key={comp.id || i}>
          <Rect x={x-16} y={y-6} width={32} height={12} fill="#d4a574" stroke="#8b6f47" strokeWidth={1.5} cornerRadius={3} />
          <Text x={x} y={y-4} text={label} fontSize={8} fill="#1f2937" align="center" offsetX={label.length*2} fontStyle="bold" />
        </Group>
      )
    }
    return (
      <Group key={comp.id || i}>
        <Rect x={x-12} y={y-8} width={24} height={16} fill="#374151" stroke="#6b7280" strokeWidth={1.5} cornerRadius={3} />
        <Text x={x} y={y-4} text={label.length>6?label.slice(0,5)+'â€¦':label} fontSize={8} fill="#e5e7eb" align="center" offsetX={label.length*2} />
      </Group>
    )
  })

  // Wiring connections
  const wires = (wiringConnections || []).map((wire, i) => {
    if (!wire.from_xy || wire.to_col == null) return null
    const { x: tx, y: ty } = holePos(wire.to_col, wire.to_row || 0, wire.to_half || 'top')
    const colors = ['#22c55e','#ef4444','#fbbf24','#3b82f6','#a855f7','#f97316']
    return (
      <Line key={i} points={[wire.from_xy[0], wire.from_xy[1], tx, ty]}
        stroke={colors[i % colors.length]} strokeWidth={2} tension={0.4} dash={[5,3]} opacity={0.85} />
    )
  })

  return (
    <Group>
      {/* Outer shell */}
      <Rect x={BB_X-6} y={BB_Y-6} width={BB_WIDTH+12} height={BB_HEIGHT+12}
        fill="#222" stroke="#555" strokeWidth={2} cornerRadius={8} />
      {/* Board surface */}
      <Rect x={BB_X} y={BB_Y} width={BB_WIDTH} height={BB_HEIGHT}
        fill="#f0ebe0" stroke="#c8b89a" strokeWidth={1.5} cornerRadius={6} />

      {/* Top power rail strip */}
      <Rect x={BB_X} y={innerY + BB_TOP_RAIL_Y}
        width={BB_WIDTH} height={BB_RAIL_H}
        fill="#fff0f0" stroke="#fca5a5" strokeWidth={1} />
      {/* Red line */}
      <Line points={[BB_X+BB_PAD, innerY+BB_TOP_RAIL_Y+BB_RAIL_H*0.3,
                     BB_X+BB_WIDTH-BB_PAD, innerY+BB_TOP_RAIL_Y+BB_RAIL_H*0.3]}
        stroke="#ef4444" strokeWidth={1.5} opacity={0.5} />
      {/* Blue line */}
      <Line points={[BB_X+BB_PAD, innerY+BB_TOP_RAIL_Y+BB_RAIL_H*0.7,
                     BB_X+BB_WIDTH-BB_PAD, innerY+BB_TOP_RAIL_Y+BB_RAIL_H*0.7]}
        stroke="#3b82f6" strokeWidth={1.5} opacity={0.5} />

      {/* Bottom power rail strip */}
      <Rect x={BB_X} y={innerY + BB_BOT_RAIL_Y}
        width={BB_WIDTH} height={BB_RAIL_H}
        fill="#f0f0ff" stroke="#93c5fd" strokeWidth={1} />
      {/* Red line */}
      <Line points={[BB_X+BB_PAD, innerY+BB_BOT_RAIL_Y+BB_RAIL_H*0.3,
                     BB_X+BB_WIDTH-BB_PAD, innerY+BB_BOT_RAIL_Y+BB_RAIL_H*0.3]}
        stroke="#ef4444" strokeWidth={1.5} opacity={0.5} />
      {/* Blue line */}
      <Line points={[BB_X+BB_PAD, innerY+BB_BOT_RAIL_Y+BB_RAIL_H*0.7,
                     BB_X+BB_WIDTH-BB_PAD, innerY+BB_BOT_RAIL_Y+BB_RAIL_H*0.7]}
        stroke="#3b82f6" strokeWidth={1.5} opacity={0.5} />

      {/* Centre divider */}
      <Rect x={BB_X} y={innerY + BB_TOP_HOLES_Y + BB_MAIN_H}
        width={BB_WIDTH} height={BB_MID_G}
        fill="#d8cdb8" />

      {/* Rail +/âˆ’ labels (left side) */}
      <Text x={BB_X-14} y={innerY+BB_TOP_RAIL_Y+BB_RAIL_H*0.3-5}  text="+" fontSize={10} fill="#ef4444" fontStyle="bold" />
      <Text x={BB_X-14} y={innerY+BB_TOP_RAIL_Y+BB_RAIL_H*0.7-5}  text="âˆ’" fontSize={10} fill="#3b82f6" fontStyle="bold" />
      <Text x={BB_X-14} y={innerY+BB_BOT_RAIL_Y+BB_RAIL_H*0.3-5}  text="+" fontSize={10} fill="#ef4444" fontStyle="bold" />
      <Text x={BB_X-14} y={innerY+BB_BOT_RAIL_Y+BB_RAIL_H*0.7-5}  text="âˆ’" fontSize={10} fill="#3b82f6" fontStyle="bold" />

      {/* Column numbers (above top holes) */}
      {Array.from({length: BB_COLS}, (_, col) => (
        <Text key={col}
          x={BB_X + BB_PAD + col * BB_PITCH - 3}
          y={innerY + BB_TOP_HOLES_Y - 11}
          text={String(col+1)} fontSize={6} fill="#9ca3af" />
      ))}

      {/* Row labels â€” top half (aâ€“e) */}
      {topLabels.map((r, i) => (
        <Text key={r} x={labelX}
          y={innerY + BB_TOP_HOLES_Y + i * BB_PITCH - 4}
          text={r} fontSize={8} fill="#6b7280" />
      ))}
      {/* Row labels â€” bottom half (fâ€“j) */}
      {botLabels.map((r, i) => (
        <Text key={r} x={labelX}
          y={innerY + BB_BOT_HOLES_Y + i * BB_PITCH - 4}
          text={r} fontSize={8} fill="#6b7280" />
      ))}

      {railHoles}
      {holes}
      {extComps}
      {wires}

      {/* Footer label */}
      <Text x={BB_X + BB_WIDTH/2} y={BB_Y + BB_HEIGHT + 8}
        text="Breadboard" fontSize={11} fill="#6b7280" fontStyle="bold"
        align="center" offsetX={40} />
    </Group>
  )
}

function GenericComponent({ component, onClick }) {
  const { x, y } = useComponentPos(component)
  const rotation = component.rotation || 0
  const label = component.id
  const W = CELL * 2.5, H = CELL * 1.2

  return (
    <Group x={x} y={y} rotation={rotation} onClick={onClick}>
      <Rect x={-W / 2} y={-H / 2} width={W} height={H} fill="#374151" stroke="#6b7280" strokeWidth={2} cornerRadius={3} />
      <Text x={0} y={-5} text={label} fontSize={11} fill="#e5e7eb" align="center" offsetX={label.length * 3} />
    </Group>
  )
}

export default function BreadboardCanvas({ circuit, setCircuit }) {
  const rawComponents = circuit?.components ?? []
  const traces = circuit?.traces ?? []
  const connections = circuit?.connections ?? []
  const canvasMode = circuit?.canvas_mode || 'agent'
  const externalComponents = circuit?.external_components ?? []
  const wiringConnections = circuit?.wiring_connections ?? []
  const [bgImage, setBgImage] = useState(null)
  const [currentMode, setCurrentMode] = useState(canvasMode)
  const [showBreadboard, setShowBreadboard] = useState(true)

  // Resolve overlaps for agent/generic mode â€” runs on every circuit change
  const components = resolveOverlaps(rawComponents)

  useEffect(() => { setCurrentMode(canvasMode) }, [canvasMode])

  function toggleCanvasMode() {
    const newMode = currentMode === 'arduino' ? 'agent' : 'arduino'
    setCurrentMode(newMode)
    if (setCircuit) setCircuit({ ...circuit, canvas_mode: newMode })
  }

  useEffect(() => {
    if ((currentMode === 'pcb' || currentMode === 'board_image' || currentMode === 'board_recreated') && circuit?.schematic_image) {
      const img = new window.Image()
      img.onload = () => setBgImage(img)
      img.onerror = () => setBgImage(null)
      img.src = `data:image/jpeg;base64,${circuit.schematic_image}`
    } else {
      setBgImage(null)
    }
  }, [circuit?.schematic_image, currentMode])

  function handleComponentClick(id) { console.log('Component clicked:', id) }

  function renderComponent(component, onClick) {
    switch (component.type) {
      case 'resistor': return <Resistor key={component.id} component={component} onClick={onClick} />
      case 'led':      return <LED      key={component.id} component={component} onClick={onClick} />
      case 'capacitor':return <Capacitor key={component.id} component={component} onClick={onClick} />
      case 'ic':       return <IC       key={component.id} component={component} onClick={onClick} />
      default:         return <GenericComponent key={component.id} component={component} onClick={onClick} />
    }
  }

  function renderTraces() {
    return traces.map((trace, i) => (
      <Line key={i} points={trace.path || [0, 0, 100, 100]} stroke="#fbbf24" strokeWidth={3} />
    ))
  }

  const modeLabel = {
    pcb: '(PCB Layout)',
    arduino: '(Arduino Board)',
    board_image: '(Board Image)',
    board_recreated: '(Recreated Board)',
    agent: '(Breadboard)',
  }[currentMode] || ''

  const boardType = circuit?.metadata?.board_type
  const boardName = circuit?.metadata?.name

  // Only show the hardcoded UNO schematic for explicit UNO circuits
  const showArduino = (currentMode === 'arduino' || currentMode === 'agent') &&
    boardType === 'uno'

  // Show generic board renderer for any other known board type
  const showGenericBoard = (currentMode === 'arduino' || currentMode === 'agent') &&
    boardType !== 'uno' && boardType !== undefined && boardType !== null

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Canvas {modeLabel}
          </span>
          {showArduino && (
            <span className="text-xs text-green-400">âœ“ Arduino UNO</span>
          )}
          {showGenericBoard && boardName && (
            <span className="text-xs text-blue-400">âœ“ {boardName}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Breadboard toggle â€” show for any board view */}
          {(showArduino || showGenericBoard) && (
            <button
              onClick={() => setShowBreadboard(b => !b)}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-md transition-colors ${
                showBreadboard ? 'bg-amber-700 hover:bg-amber-600 text-amber-100' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              {showBreadboard ? 'Hide Breadboard' : 'Show Breadboard'}
            </button>
          )}
        </div>
      </div>

      {/* Canvas */}
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
              {/* Board image background */}
              {(currentMode === 'board_image' || currentMode === 'board_recreated') && bgImage && (
                <KonvaImage image={bgImage} width={ARD_W + 60} height={ARD_H + 60} x={ARD_X - 30} y={ARD_Y - 30} opacity={0.8} />
              )}

              {/* Hardcoded UNO schematic â€” only for board_type === 'uno' */}
              {showArduino && <ArduinoBoard components={components} />}

              {/* Generic board â€” for Nano, Mega, ESP32, Pico, etc. */}
              {showGenericBoard && (
                <GenericBoard
                  components={components}
                  boardName={boardName}
                  boardType={boardType}
                />
              )}

              {/* Breadboard â€” shown alongside any board view */}
              {(showArduino || showGenericBoard) && showBreadboard && (
                <Breadboard
                  externalComponents={externalComponents}
                  wiringConnections={wiringConnections}
                />
              )}

              {/* PCB traces */}
              {currentMode === 'pcb' && renderTraces()}

              {/* Standalone components â€” agent mode with no board_type */}
              {currentMode === 'agent' && !showArduino && !showGenericBoard && components.map((c) =>
                renderComponent(c, () => handleComponentClick(c.id))
              )}

              {/* Grid dots â€” agent mode with no board */}
              {currentMode === 'agent' && !showArduino && !showGenericBoard && Array.from({ length: 30 }, (_, row) =>
                Array.from({ length: 25 }, (_, col) => (
                  <Circle
                    key={`${row}-${col}`}
                    x={col * CELL + CELL / 2}
                    y={row * CELL + CELL / 2}
                    radius={2}
                    fill="#374151"
                  />
                ))
              )}
            </Layer>
          </Stage>
        )}
      </div>
    </div>
  )
}
