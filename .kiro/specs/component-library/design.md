# Spec: Expanded Component Library

## Goal
Expand the component sidebar from 6 types to a full Tinkercad-style library with categorized, scrollable sections. All components are drag-and-drop onto the canvas.

---

## Component Categories & Types

### 🔌 Power & Breadboard
| Type Key | Label | Default Value | Pins |
|----------|-------|---------------|------|
| `breadboard_small` | Small Breadboard | — | — (visual only) |
| `breadboard_full` | Full Breadboard | — | — (visual only) |
| `power_supply` | DC Power Supply | 5V | positive, negative |
| `battery_9v` | 9V Battery | 9V | positive, negative |
| `battery_coin` | Coin Cell | 3V | positive, negative |
| `wire` | Jumper Wire | — | pin1, pin2 |
| `power_rail` | Power Rail | — | pin1, pin2 |

### 💡 Basic Components
| Type Key | Label | Default Value | Pins |
|----------|-------|---------------|------|
| `resistor` | Resistor | 10kΩ | pin1, pin2 |
| `capacitor` | Ceramic Capacitor | 100nF | pin1, pin2 |
| `capacitor_elec` | Electrolytic Capacitor | 100µF | positive, negative |
| `inductor` | Inductor | 10mH | pin1, pin2 |
| `potentiometer` | Potentiometer | 10kΩ | pin1, wiper, pin2 |
| `photoresistor` | Photoresistor (LDR) | — | pin1, pin2 |
| `thermistor` | Thermistor | 10kΩ | pin1, pin2 |

### 🔘 Input
| Type Key | Label | Default Value | Pins |
|----------|-------|---------------|------|
| `button` | Push Button | — | pin1, pin2 |
| `switch_slide` | Slide Switch | — | pin1, common, pin2 |
| `switch_toggle` | Toggle Switch | — | pin1, pin2 |
| `keypad` | 4x4 Keypad | — | r1, r2, r3, r4, c1, c2, c3, c4 |

### 🔊 Output
| Type Key | Label | Default Value | Pins |
|----------|-------|---------------|------|
| `led` | LED | — | anode, cathode |
| `led_rgb` | RGB LED | — | red, green, blue, cathode |
| `display_7seg` | 7-Segment Display | — | a–g, dp, common |
| `lcd_16x2` | LCD 16x2 | — | vss, vdd, vo, rs, rw, e, d4–d7 |
| `buzzer` | Buzzer | — | positive, negative |
| `motor_dc` | DC Motor | — | pin1, pin2 |
| `servo` | Servo Motor | — | signal, vcc, gnd |
| `motor_stepper` | Stepper Motor | — | a1, a2, b1, b2 |

### 🧠 Microcontrollers & ICs
| Type Key | Label | Default Value | Pins |
|----------|-------|---------------|------|
| `arduino_uno` | Arduino Uno | — | D0–D13, A0–A5, 5V, 3.3V, GND, VIN |
| `arduino_nano` | Arduino Nano | — | D0–D13, A0–A7, 5V, 3.3V, GND, VIN |
| `ic_555` | 555 Timer | — | gnd, trigger, output, reset, control, threshold, discharge, vcc |
| `ic_shift_reg` | Shift Register (74HC595) | — | qa–qh, ser, oe, rclk, srclk, srclr, vcc, gnd |
| `ic_logic_and` | AND Gate | — | a, b, out |
| `ic_logic_or` | OR Gate | — | a, b, out |
| `ic_logic_not` | NOT Gate | — | in, out |
| `ic_opamp` | Op-Amp | — | inv, noninv, out, vcc, gnd |

### 📡 Sensors
| Type Key | Label | Default Value | Pins |
|----------|-------|---------------|------|
| `sensor_ultrasonic` | Ultrasonic (HC-SR04) | — | vcc, trig, echo, gnd |
| `sensor_pir` | PIR Motion Sensor | — | vcc, out, gnd |
| `sensor_temp` | Temp Sensor (TMP36) | — | vcc, out, gnd |
| `sensor_light` | Light Sensor (LDR) | — | pin1, pin2 |
| `sensor_tilt` | Tilt Sensor | — | pin1, pin2 |
| `sensor_hall` | Hall Effect Sensor | — | vcc, out, gnd |

### ⚙️ Power & Control
| Type Key | Label | Default Value | Pins |
|----------|-------|---------------|------|
| `voltage_reg` | Voltage Regulator | 5V | vin, gnd, vout |
| `transistor_npn` | NPN Transistor | — | base, collector, emitter |
| `transistor_pnp` | PNP Transistor | — | base, collector, emitter |
| `mosfet` | MOSFET | — | gate, drain, source |
| `relay` | Relay | — | coil1, coil2, com, no, nc |

### 🧩 Modules
| Type Key | Label | Default Value | Pins |
|----------|-------|---------------|------|
| `hbridge` | H-Bridge (L293D) | — | en1, in1, in2, out1, out2, en2, in3, in4, out3, out4, vcc, gnd |
| `ir_receiver` | IR Receiver | — | vcc, out, gnd |

---

## Sidebar UI

- Scrollable left panel, grouped by category
- Each category has a collapsible header (emoji + name)
- Components show: schematic icon + label
- Drag-and-drop onto canvas (existing behavior)
- Dimmed when in Agent Mode (existing behavior)
- Search/filter bar at top (stretch goal)

## ComponentRenderer

- Each new type needs an entry in `COMPONENT_DEFS` with: `color`, `width`, `height`, `label`, `pins`
- Visual: simple geometric shapes (rect, circle, line) — no SVG images needed
- Microcontrollers (`arduino_uno`, `arduino_nano`): larger rect (6×4 cells) with labeled pin dots
- ICs: DIP-style rect with pins on both sides
- Sensors/modules: colored rect with label

## ID Prefix Map

Each type needs a prefix for auto-generated IDs (e.g., `R1`, `LED1`, `U1`):

```
resistor→R, capacitor→C, capacitor_elec→CE, inductor→L, potentiometer→POT,
photoresistor→LDR, thermistor→TH, button→BTN, switch_slide→SW, switch_toggle→SW,
keypad→KP, led→LED, led_rgb→RGB, display_7seg→SEG, lcd_16x2→LCD, buzzer→BUZ,
motor_dc→M, servo→SRV, motor_stepper→STP, arduino_uno→UNO, arduino_nano→NANO,
ic_555→U, ic_shift_reg→U, ic_logic_and→U, ic_logic_or→U, ic_logic_not→U,
ic_opamp→U, sensor_ultrasonic→US, sensor_pir→PIR, sensor_temp→TMP,
sensor_light→LDR, sensor_tilt→TILT, sensor_hall→HALL, voltage_reg→VR,
transistor_npn→Q, transistor_pnp→Q, mosfet→Q, relay→RL, hbridge→HB,
ir_receiver→IR, power_supply→PS, battery_9v→BAT, battery_coin→BAT,
wire→W, power_rail→PWR, breadboard_small→BB, breadboard_full→BB
```

## Files to Change

1. `ComponentSidebar.jsx` — new categorized list, scrollable, collapsible sections
2. `ComponentRenderer.jsx` — add `COMPONENT_DEFS` entries for all new types
3. `ComponentSidebar.jsx` — update `ID_PREFIX` map

## System Prompt Update

Update `SYSTEM_PROMPT` in `backend/main.py` to list all available component types so Claude can use them.
