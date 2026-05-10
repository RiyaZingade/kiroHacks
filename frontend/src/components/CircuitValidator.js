/**
 * CircuitValidator — pure-function module for circuit connectivity validation.
 *
 * Builds an undirected graph from components + connections, then uses BFS
 * reachability from VCC and GND to determine which nodes sit on valid paths.
 * Each LED is evaluated independently; disconnected components and broken
 * wires are identified and reported.
 *
 * NO React or Konva imports — this module is UI-free and unit-testable.
 */

// ---------------------------------------------------------------------------
// 1. Pin definitions
// ---------------------------------------------------------------------------

/**
 * Returns the pin names for a given component type.
 * @param {string} type - one of the 6 MVP component types
 * @returns {string[]} pin names
 */
export function getComponentPins(type) {
  if (type === 'led') return ['anode', 'cathode']
  if (type === 'battery_9v' || type === 'battery_coin' || type === 'power_supply') return ['positive', 'negative']
  if (type === 'transistor_npn' || type === 'transistor_pnp') return ['base', 'collector', 'emitter']
  if (type === 'mosfet') return ['gate', 'drain', 'source']
  return ['pin1', 'pin2']
}

// ---------------------------------------------------------------------------
// 2. Graph construction
// ---------------------------------------------------------------------------

/**
 * Builds an undirected adjacency graph (Map<string, Set<string>>) from the
 * circuit's components and connections arrays.
 *
 * - Adds internal pin-to-pin edges for every component (all types conduct).
 * - Adds edges for every entry in the connections array.
 * - Ensures VCC and GND nodes always exist in the graph.
 *
 * @param {Array<{id: string, type: string}>} components
 * @param {Array<{from: string, to: string}>} connections
 * @returns {Map<string, Set<string>>}
 */
const POWER_TYPES = new Set(['battery_9v', 'battery_coin', 'power_supply'])
const POSITIVE_PINS = new Set(['positive', 'anode', 'vcc', 'plus'])
const NEGATIVE_PINS = new Set(['negative', 'cathode', 'gnd', 'minus'])

const SWITCH_TYPES = new Set(['button', 'switch_slide', 'switch_toggle'])

export function buildAdjacencyGraph(components, connections, interactiveStates = {}) {
  /** @type {Map<string, Set<string>>} */
  const graph = new Map()

  function addEdge(a, b) {
    if (!graph.has(a)) graph.set(a, new Set())
    if (!graph.has(b)) graph.set(b, new Set())
    graph.get(a).add(b)
    graph.get(b).add(a)
  }

  // Internal component pin-to-pin edges
  for (const comp of components) {
    const pins = getComponentPins(comp.type)
    if (pins.length >= 2) {
      // Switches/buttons: only add internal conduction edge when closed/pressed
      if (SWITCH_TYPES.has(comp.type)) {
        const state = interactiveStates[comp.id] ?? {}
        const closed = comp.type === 'button' ? !!state.pressed : !!state.on
        if (closed) addEdge(`${comp.id}.${pins[0]}`, `${comp.id}.${pins[1]}`)
        // Always add the nodes so they appear in the graph
        if (!graph.has(`${comp.id}.${pins[0]}`)) graph.set(`${comp.id}.${pins[0]}`, new Set())
        if (!graph.has(`${comp.id}.${pins[1]}`)) graph.set(`${comp.id}.${pins[1]}`, new Set())
      } else {
        addEdge(`${comp.id}.${pins[0]}`, `${comp.id}.${pins[1]}`)
      }
    }
    // Power sources: alias positive pin → VCC, negative pin → GND
    if (POWER_TYPES.has(comp.type)) {
      addEdge(`${comp.id}.positive`, 'VCC')
      addEdge(`${comp.id}.negative`, 'GND')
    }
    // Arduino boards: alias 5V/3.3V pins → VCC, GND pins → GND
    if (comp.type === 'arduino_uno' || comp.type === 'arduino_nano') {
      addEdge(`${comp.id}.5V`, 'VCC')
      addEdge(`${comp.id}.3.3V`, 'VCC')
      addEdge(`${comp.id}.GND`, 'GND')
      addEdge(`${comp.id}.VIN`, 'VCC')
    }
  }

  // Connection edges
  for (const conn of connections) {
    if (!conn || typeof conn !== 'object') continue
    addEdge(conn.from, conn.to)
  }

  // Ensure VCC and GND always exist
  if (!graph.has('VCC')) graph.set('VCC', new Set())
  if (!graph.has('GND')) graph.set('GND', new Set())

  return graph
}

// ---------------------------------------------------------------------------
// 3. BFS reachability
// ---------------------------------------------------------------------------

/**
 * Standard breadth-first search returning the Set of all nodes reachable
 * from `startNode` (inclusive).
 *
 * @param {Map<string, Set<string>>} graph - adjacency map
 * @param {string} startNode
 * @returns {Set<string>}
 */
export function bfs(graph, startNode) {
  const visited = new Set()
  const queue = [startNode]
  visited.add(startNode)

  while (queue.length > 0) {
    const current = queue.shift()
    const neighbors = graph.get(current) ?? new Set()

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push(neighbor)
      }
    }
  }

  return visited
}

// ---------------------------------------------------------------------------
// 4. Main validation
// ---------------------------------------------------------------------------

/**
 * Validates a circuit's connectivity and returns a ValidationResult.
 *
 * @param {Array<{id: string, type: string}>} components
 * @param {Array<{from: string, to: string}>} connections
 * @returns {{
 *   valid: boolean,
 *   ledStates: Map<string, boolean>,
 *   errors: string[],
 *   brokenConnectionIndices: Set<number>,
 *   validPathNodes: Set<string>
 * }}
 */
export function validateCircuit(components, connections, interactiveStates = {}) {
  // Step 1: Build adjacency graph
  const graph = buildAdjacencyGraph(components, connections, interactiveStates)

  // Step 2: BFS from VCC and GND
  const reachableFromVCC = bfs(graph, 'VCC')
  const reachableFromGND = bfs(graph, 'GND')

  // Step 3: Valid path nodes = intersection
  const validPathNodes = new Set()
  for (const node of reachableFromVCC) {
    if (reachableFromGND.has(node)) {
      validPathNodes.add(node)
    }
  }

  // Step 4: Evaluate each LED
  // Use individual reachability sets (not just the intersection) so we can
  // produce specific "no connection to VCC" vs "no connection to GND" messages.
  const ledStates = new Map()
  const errors = []

  for (const comp of components) {
    if (comp.type !== 'led') continue

    const anodeNode = `${comp.id}.anode`
    const cathodeNode = `${comp.id}.cathode`

    const anodeReachesVCC = reachableFromVCC.has(anodeNode)
    const cathodeReachesVCC = reachableFromVCC.has(cathodeNode)
    const anodeReachesGND = reachableFromGND.has(anodeNode)
    const cathodeReachesGND = reachableFromGND.has(cathodeNode)

    // LED is lit if both pins are on a valid VCC→GND path
    const anodeValid = validPathNodes.has(anodeNode)
    const cathodeValid = validPathNodes.has(cathodeNode)

    if (anodeValid && cathodeValid) {
      ledStates.set(comp.id, true)
    } else {
      ledStates.set(comp.id, false)
      // Determine which rail is missing using individual reachability
      const hasVCC = anodeReachesVCC || cathodeReachesVCC
      const hasGND = anodeReachesGND || cathodeReachesGND
      if (!hasVCC && !hasGND) {
        errors.push(`${comp.id} has no connection to VCC or GND`)
      } else if (!hasVCC) {
        errors.push(`${comp.id} has no connection to VCC`)
      } else {
        errors.push(`${comp.id} has no connection to GND`)
      }
    }
  }

  // Step 5: Check for disconnected components (non-LED)
  // Build a set of all component IDs that appear in at least one connection
  const connectedIds = new Set()
  for (const conn of connections) {
    if (!conn || typeof conn !== 'object') continue
    for (const endpoint of [conn.from, conn.to]) {
      const id = endpoint.split('.')[0]
      if (id !== 'VCC' && id !== 'GND') connectedIds.add(id)
    }
  }

  const SKIP_DISCONNECT_CHECK = new Set(['arduino_uno', 'arduino_nano', 'power_supply', 'battery_9v', 'battery_coin'])
  for (const comp of components) {
    if (comp.type === 'led') continue
    if (SKIP_DISCONNECT_CHECK.has(comp.type)) continue
    if (!connectedIds.has(comp.id)) {
      errors.push(`${comp.id} has no connections`)
    }
  }

  // Step 6: Check overall VCC→GND path — skip if an Arduino/power source is present
  // (Arduino provides its own power via UNO1.5V→VCC alias)
  const hasPowerSource = components.some(c => POWER_TYPES.has(c.type) || c.type === 'arduino_uno' || c.type === 'arduino_nano')
  const hasCompletePath = validPathNodes.has('VCC') && validPathNodes.has('GND')
  if (components.length > 0 && !hasCompletePath && !hasPowerSource && errors.length === 0) {
    errors.push('No complete path from VCC to GND')
  }

  // Step 7: Identify broken connection indices
  const brokenConnectionIndices = new Set()
  connections.forEach((conn, idx) => {
    const fromValid = validPathNodes.has(conn.from)
    const toValid = validPathNodes.has(conn.to)
    if (!fromValid || !toValid) {
      brokenConnectionIndices.add(idx)
    }
  })

  return {
    valid: errors.length === 0,
    ledStates,
    errors,
    brokenConnectionIndices,
    validPathNodes,
  }
}
