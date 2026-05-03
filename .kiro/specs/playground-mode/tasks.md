# Tasks: Playground Mode

## Task 1: Create CircuitValidator Module
- [x] 1.1 Create `frontend/src/components/CircuitValidator.js` with `getComponentPins(type)` helper that returns pin names for each of the 6 MVP component types (led → ["anode", "cathode"], others → ["pin1", "pin2"]).
- [x] 1.2 Implement `buildAdjacencyGraph(components, connections)` that creates an undirected adjacency Map with internal component pin-to-pin edges and connection edges, ensuring VCC and GND nodes always exist.
- [x] 1.3 Implement `bfs(graph, startNode)` that returns a Set of all nodes reachable from the start node via breadth-first search.
- [x] 1.4 Implement `validateCircuit(components, connections)` that builds the graph, runs BFS from VCC and GND, computes valid path nodes as the intersection, evaluates each LED's anode/cathode reachability, identifies disconnected components, and returns a ValidationResult with `valid`, `ledStates`, `errors`, `brokenConnectionIndices`, and `validPathNodes`.
- [x] 1.5 Export `validateCircuit` as the module's public API (also export `buildAdjacencyGraph`, `bfs`, `getComponentPins` for testing).

## Task 2: Add Playground Mode Toggle to BreadboardCanvas
- [x] 2.1 Add `playgroundActive` and `validationResult` state variables to BreadboardCanvas.
- [x] 2.2 Implement `togglePlaygroundMode()` function that: on entry — calls `validateCircuit()`, stores result, clears wiring/selection state; on exit — clears validation result.
- [x] 2.3 Add a "Playground Mode" button to the toolbar (after the Agent/Manual toggle) with a circuit/play icon, styled with Tailwind dark theme. When active, show green background (`bg-green-600`); when inactive, show gray (`bg-gray-700`).
- [x] 2.4 When `playgroundActive` is true, disable the Agent/Manual toggle buttons (add `pointer-events-none opacity-50` classes).

## Task 3: Enforce Read-Only Canvas in Playground Mode
- [x] 3.1 When `playgroundActive` is true, set component `draggable` to false regardless of the current Agent/Manual mode by passing an effective mode to ComponentRenderer.
- [x] 3.2 When `playgroundActive` is true, make `handlePinClick` a no-op (early return).
- [x] 3.3 When `playgroundActive` is true, make `handleDrop` a no-op (early return, ignore sidebar drops).
- [x] 3.4 When `playgroundActive` is true, disable the "Clear board" button (add `disabled` attribute and dimmed styling).

## Task 4: LED Glow Effect in ComponentRenderer
- [x] 4.1 Add an `isLit` prop to ComponentRenderer's props interface.
- [x] 4.2 In the LED case of `renderShape()`, when `isLit` is true: increase dome Circle opacity to 1.0, add `shadowColor` matching the LED's fill color, set `shadowBlur` to 20, and set `shadowOpacity` to 0.8 for a glow effect.
- [x] 4.3 In BreadboardCanvas, pass `isLit={playgroundActive && validationResult?.ledStates?.get(c.id) === true}` to each ComponentRenderer instance.

## Task 5: Wire Highlighting in WireRenderer
- [x] 5.1 Add a `brokenIndices` prop (Set of numbers) to WireRenderer's props interface.
- [x] 5.2 In the wire rendering loop, if the wire's index is in `brokenIndices` and it is not the selected wire, render it with red stroke (`#ef4444`), strokeWidth 2, and a dashed pattern (`[8, 4]`).
- [x] 5.3 In BreadboardCanvas, pass `brokenIndices={playgroundActive ? (validationResult?.brokenConnectionIndices ?? new Set()) : new Set()}` to WireRenderer.

## Task 6: Current Flow Animation Integration
- [x] 6.1 When `playgroundActive` is true and `validationResult?.valid` is true, pass `playing={true}` to CurrentFlowAnimation.
- [x] 6.2 When `playgroundActive` is false or validation is invalid, ensure the existing `playing` prop logic from RunPanel is preserved (playground mode does not interfere with RunPanel's play/pause).
- [x] 6.3 Compute the effective `playing` state as: `playing || (playgroundActive && validationResult?.valid === true)` and pass it to CurrentFlowAnimation.

## Task 7: Status Banner
- [x] 7.1 Create a `PlaygroundStatusBanner` inline component (or section within BreadboardCanvas) that renders conditionally when `playgroundActive` is true.
- [x] 7.2 When `validationResult.valid` is true and components exist, display a green-themed banner (`bg-green-900/60 text-green-300`) with text "Circuit works!".
- [x] 7.3 When `validationResult.valid` is false, display a red-themed banner (`bg-red-900/60 text-red-300`) with text "Circuit incomplete — check your connections" and the first error message as detail text below.
- [x] 7.4 When components array is empty, display an amber-themed banner (`bg-yellow-900/60 text-yellow-300`) with text "No components to simulate".
- [x] 7.5 Position the banner in the toolbar area, after the Playground Mode button, so it's visible without overlapping the canvas.
