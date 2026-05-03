# Requirements: Playground Mode

## Requirement 1: Playground Mode Toggle Button

### User Story
As an engineering student, I want to press a "Playground Mode" button on the canvas toolbar so I can enter and exit simulation mode.

### Acceptance Criteria
- 1.1 A button labeled "Playground Mode" is visible in the BreadboardCanvas toolbar, next to the existing Agent/Manual mode toggle.
- 1.2 Clicking the button toggles playground mode on (active) and off (inactive).
- 1.3 When playground mode is active, the button has a distinct visual state (e.g., green/highlighted background) to indicate it is on.
- 1.4 When playground mode is active, the existing Agent/Manual toggle is disabled (non-clickable, visually dimmed).
- 1.5 Toggling playground mode off clears all playground visual effects (LED glow, wire highlights, status banner, animation).

---

## Requirement 2: Read-Only Canvas in Playground Mode

### User Story
As a user in playground mode, I want the board to be read-only so I can observe the simulation without accidentally modifying my circuit.

### Acceptance Criteria
- 2.1 While playground mode is active, component dragging is disabled — components cannot be repositioned.
- 2.2 While playground mode is active, pin clicking does not initiate wiring — clicking a pin has no effect.
- 2.3 While playground mode is active, dropping new components from the sidebar onto the canvas is disabled.
- 2.4 While playground mode is active, the "Clear board" button is disabled.
- 2.5 Exiting playground mode restores full interactivity based on the current Agent/Manual mode.

---

## Requirement 3: Circuit Validation on Entry

### User Story
As a user, I want the system to validate my circuit when I enter playground mode so I know immediately if something is wrong.

### Acceptance Criteria
- 3.1 On entering playground mode, the system builds an adjacency graph from the circuit's components and connections arrays.
- 3.2 The system performs BFS from VCC and BFS from GND to determine reachable nodes.
- 3.3 A node is considered on a valid path if and only if it is reachable from both VCC and GND.
- 3.4 If no complete path from VCC to GND exists, the validation result includes an error message "No complete path from VCC to GND".
- 3.5 If a component has no connections at all, the validation result includes an error message identifying that component (e.g., "R1 has no connections").
- 3.6 Buttons are treated as always conducting (assumed pressed) during validation.
- 3.7 Validation is a pure frontend operation — no backend API calls are made.

---

## Requirement 4: LED Behavior

### User Story
As a user, I want each LED to independently light up or stay off based on whether it has a complete path, so I can see which parts of my circuit work.

### Acceptance Criteria
- 4.1 Each LED is evaluated independently by checking if both its anode and cathode nodes are on valid VCC→GND paths.
- 4.2 If an LED has a complete path, it visually glows — the LED dome increases in opacity and gains a Konva shadow glow effect using the LED's color.
- 4.3 If an LED does not have a complete path, it remains in its default unlit visual state.
- 4.4 If an LED's anode is not on a valid path, the error message states "{LED_ID} has no connection to VCC".
- 4.5 If an LED's cathode is not on a valid path, the error message states "{LED_ID} has no connection to GND".
- 4.6 If neither anode nor cathode is on a valid path, the error message states "{LED_ID} has no connection to VCC or GND".
- 4.7 Multiple LEDs in the same circuit are each evaluated and displayed independently — one can glow while another stays off.

---

## Requirement 5: Visual Feedback — Wire Highlighting

### User Story
As a user, I want to see which connections are broken so I can quickly identify and fix wiring issues.

### Acceptance Criteria
- 5.1 Connections where one or both endpoints are not on a valid VCC→GND path are highlighted in red (#ef4444) with a dashed stroke pattern.
- 5.2 Connections where both endpoints are on valid paths retain their default cyan color (#22d3ee).
- 5.3 Wire selection highlighting (yellow, for deletion) takes precedence over broken-wire red highlighting.

---

## Requirement 6: Visual Feedback — Current Flow Animation

### User Story
As a user, I want to see animated current flowing along valid wires so I can visualize how electricity moves through my circuit.

### Acceptance Criteria
- 6.1 When playground mode is active and the circuit has at least one valid VCC→GND path, the existing CurrentFlowAnimation component is activated (playing=true).
- 6.2 When playground mode is deactivated, the current flow animation stops.
- 6.3 The animation reuses the existing CurrentFlowAnimation component and its requestAnimationFrame-based dot animation.

---

## Requirement 7: Status Banner

### User Story
As a user, I want to see a clear status message telling me whether my circuit works or has issues.

### Acceptance Criteria
- 7.1 When playground mode is active and the circuit is valid, a green-themed banner displays "Circuit works!" in the toolbar area.
- 7.2 When playground mode is active and the circuit is invalid, an amber/red-themed banner displays "Circuit incomplete — check your connections".
- 7.3 When the circuit is invalid, the first error message from the validation result is shown as detail text below the main status message.
- 7.4 The status banner is not visible when playground mode is inactive.
- 7.5 When the canvas has no components, the banner displays "No components to simulate".

---

## Requirement 8: CircuitValidator Module

### User Story
As a developer, I want the validation logic in a separate pure-function module so it can be unit tested independently of the UI.

### Acceptance Criteria
- 8.1 The CircuitValidator is implemented as a standalone module exporting a `validateCircuit(components, connections)` function.
- 8.2 The function returns a ValidationResult object with: `valid` (boolean), `ledStates` (Map), `errors` (array of strings), `brokenConnectionIndices` (Set of numbers), `validPathNodes` (Set of strings).
- 8.3 `result.valid` is true if and only if `result.errors` is empty.
- 8.4 The module has no UI dependencies (no React, no Konva imports).
- 8.5 The module does not add any new runtime dependencies.
- 8.6 An empty circuit (no components, no connections) returns a valid result with no errors.
