import { describe, it, expect } from 'vitest'
import {
  getComponentPins,
  buildAdjacencyGraph,
  bfs,
  validateCircuit,
} from './CircuitValidator.js'

// ---------------------------------------------------------------------------
// getComponentPins
// ---------------------------------------------------------------------------
describe('getComponentPins', () => {
  it('returns ["anode", "cathode"] for led', () => {
    expect(getComponentPins('led')).toEqual(['anode', 'cathode'])
  })

  it.each(['resistor', 'capacitor', 'button', 'wire', 'power_rail'])(
    'returns ["pin1", "pin2"] for %s',
    (type) => {
      expect(getComponentPins(type)).toEqual(['pin1', 'pin2'])
    },
  )
})

// ---------------------------------------------------------------------------
// buildAdjacencyGraph
// ---------------------------------------------------------------------------
describe('buildAdjacencyGraph', () => {
  it('always includes VCC and GND nodes even with empty inputs', () => {
    const graph = buildAdjacencyGraph([], [])
    expect(graph.has('VCC')).toBe(true)
    expect(graph.has('GND')).toBe(true)
  })

  it('creates internal pin-to-pin edges for each component', () => {
    const components = [{ id: 'R1', type: 'resistor' }]
    const graph = buildAdjacencyGraph(components, [])
    expect(graph.get('R1.pin1').has('R1.pin2')).toBe(true)
    expect(graph.get('R1.pin2').has('R1.pin1')).toBe(true)
  })

  it('creates internal edges for LED with anode/cathode', () => {
    const components = [{ id: 'LED1', type: 'led' }]
    const graph = buildAdjacencyGraph(components, [])
    expect(graph.get('LED1.anode').has('LED1.cathode')).toBe(true)
    expect(graph.get('LED1.cathode').has('LED1.anode')).toBe(true)
  })

  it('creates bidirectional connection edges', () => {
    const connections = [{ from: 'VCC', to: 'R1.pin1' }]
    const graph = buildAdjacencyGraph([], connections)
    expect(graph.get('VCC').has('R1.pin1')).toBe(true)
    expect(graph.get('R1.pin1').has('VCC')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// bfs
// ---------------------------------------------------------------------------
describe('bfs', () => {
  it('always includes the start node', () => {
    const graph = new Map([['A', new Set()]])
    const visited = bfs(graph, 'A')
    expect(visited.has('A')).toBe(true)
  })

  it('finds all reachable nodes in a chain', () => {
    const graph = new Map([
      ['A', new Set(['B'])],
      ['B', new Set(['A', 'C'])],
      ['C', new Set(['B'])],
    ])
    const visited = bfs(graph, 'A')
    expect(visited).toEqual(new Set(['A', 'B', 'C']))
  })

  it('does not reach disconnected nodes', () => {
    const graph = new Map([
      ['A', new Set(['B'])],
      ['B', new Set(['A'])],
      ['C', new Set()],
    ])
    const visited = bfs(graph, 'A')
    expect(visited.has('C')).toBe(false)
  })

  it('handles start node not in graph gracefully', () => {
    const graph = new Map()
    const visited = bfs(graph, 'X')
    expect(visited).toEqual(new Set(['X']))
  })
})

// ---------------------------------------------------------------------------
// validateCircuit
// ---------------------------------------------------------------------------
describe('validateCircuit', () => {
  it('returns valid for an empty circuit', () => {
    const result = validateCircuit([], [])
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.ledStates.size).toBe(0)
    expect(result.brokenConnectionIndices.size).toBe(0)
  })

  it('validates a complete VCC → R → LED → GND circuit', () => {
    const components = [
      { id: 'R1', type: 'resistor' },
      { id: 'LED1', type: 'led' },
    ]
    const connections = [
      { from: 'VCC', to: 'R1.pin1' },
      { from: 'R1.pin2', to: 'LED1.anode' },
      { from: 'LED1.cathode', to: 'GND' },
    ]
    const result = validateCircuit(components, connections)
    expect(result.valid).toBe(true)
    expect(result.ledStates.get('LED1')).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.brokenConnectionIndices.size).toBe(0)
  })

  it('detects LED missing GND connection', () => {
    const components = [
      { id: 'R1', type: 'resistor' },
      { id: 'LED1', type: 'led' },
    ]
    const connections = [
      { from: 'VCC', to: 'R1.pin1' },
      { from: 'R1.pin2', to: 'LED1.anode' },
      // Missing: LED1.cathode → GND
    ]
    const result = validateCircuit(components, connections)
    expect(result.valid).toBe(false)
    expect(result.ledStates.get('LED1')).toBe(false)
    expect(result.errors).toContain('LED1 has no connection to GND')
  })

  it('detects LED missing VCC connection', () => {
    const components = [
      { id: 'R1', type: 'resistor' },
      { id: 'LED1', type: 'led' },
    ]
    const connections = [
      { from: 'R1.pin2', to: 'LED1.anode' },
      { from: 'LED1.cathode', to: 'GND' },
      // R1.pin1 not connected to VCC
    ]
    const result = validateCircuit(components, connections)
    expect(result.valid).toBe(false)
    expect(result.ledStates.get('LED1')).toBe(false)
    expect(result.errors).toContain('LED1 has no connection to VCC')
  })

  it('detects LED with no VCC or GND connection', () => {
    const components = [{ id: 'LED1', type: 'led' }]
    const connections = []
    const result = validateCircuit(components, connections)
    expect(result.valid).toBe(false)
    expect(result.ledStates.get('LED1')).toBe(false)
    expect(result.errors).toContain('LED1 has no connection to VCC or GND')
  })

  it('evaluates multiple LEDs independently', () => {
    const components = [
      { id: 'R1', type: 'resistor' },
      { id: 'LED1', type: 'led' },
      { id: 'LED2', type: 'led' },
    ]
    const connections = [
      { from: 'VCC', to: 'R1.pin1' },
      { from: 'R1.pin2', to: 'LED1.anode' },
      { from: 'LED1.cathode', to: 'GND' },
      // LED2 has no connections at all — fully isolated
    ]
    const result = validateCircuit(components, connections)
    expect(result.ledStates.get('LED1')).toBe(true)
    expect(result.ledStates.get('LED2')).toBe(false)
    expect(result.errors).toContain('LED2 has no connection to VCC or GND')
  })

  it('treats buttons as always conducting', () => {
    const components = [
      { id: 'R1', type: 'resistor' },
      { id: 'LED1', type: 'led' },
      { id: 'BTN1', type: 'button' },
    ]
    const connections = [
      { from: 'VCC', to: 'R1.pin1' },
      { from: 'R1.pin2', to: 'LED1.anode' },
      { from: 'LED1.cathode', to: 'BTN1.pin1' },
      { from: 'BTN1.pin2', to: 'GND' },
    ]
    const result = validateCircuit(components, connections)
    expect(result.valid).toBe(true)
    expect(result.ledStates.get('LED1')).toBe(true)
  })

  it('detects disconnected non-LED components', () => {
    const components = [
      { id: 'R1', type: 'resistor' },
      { id: 'R2', type: 'resistor' },
    ]
    const connections = [
      { from: 'VCC', to: 'R1.pin1' },
      { from: 'R1.pin2', to: 'GND' },
      // R2 has no connections at all
    ]
    const result = validateCircuit(components, connections)
    expect(result.errors).toContain('R2 has no connections')
  })

  it('reports "No complete path from VCC to GND" when appropriate', () => {
    const components = [{ id: 'R1', type: 'resistor' }]
    const connections = [
      { from: 'VCC', to: 'R1.pin1' },
      // R1.pin2 not connected to GND
    ]
    const result = validateCircuit(components, connections)
    expect(result.valid).toBe(false)
    // R1 has an external connection so it's not "disconnected",
    // but there's no complete path
    expect(result.errors).toContain('No complete path from VCC to GND')
  })

  it('identifies broken connection indices', () => {
    const components = [
      { id: 'R1', type: 'resistor' },
      { id: 'LED1', type: 'led' },
    ]
    const connections = [
      { from: 'VCC', to: 'R1.pin1' },       // index 0
      { from: 'R1.pin2', to: 'LED1.anode' }, // index 1
      // LED1.cathode not connected to GND — so the path is broken
    ]
    const result = validateCircuit(components, connections)
    // All connections are broken because none of the endpoints are on
    // a valid VCC→GND path (no complete path exists)
    expect(result.brokenConnectionIndices.size).toBeGreaterThan(0)
    for (const idx of result.brokenConnectionIndices) {
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThan(connections.length)
    }
  })

  it('handles duplicate connections gracefully', () => {
    const components = [{ id: 'R1', type: 'resistor' }]
    const connections = [
      { from: 'VCC', to: 'R1.pin1' },
      { from: 'VCC', to: 'R1.pin1' }, // duplicate
      { from: 'R1.pin2', to: 'GND' },
    ]
    const result = validateCircuit(components, connections)
    expect(result.valid).toBe(true)
  })

  it('valid result always equals errors.length === 0', () => {
    const result1 = validateCircuit([], [])
    expect(result1.valid).toBe(result1.errors.length === 0)

    const result2 = validateCircuit([{ id: 'LED1', type: 'led' }], [])
    expect(result2.valid).toBe(result2.errors.length === 0)
  })
})
