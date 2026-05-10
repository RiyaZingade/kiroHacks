import { useState } from 'react'
import { getComponentDef } from './ComponentRenderer'

let _currentDragType = null
export function getCurrentDragType() { return _currentDragType }

const CATEGORIES = [
  { name: '🔌 Power & Breadboard', types: [
    { type: 'power_rail', label: 'Power Rail', abbr: 'PWR', defaultValue: '' },
    { type: 'wire', label: 'Jumper Wire', abbr: 'W', defaultValue: '' },
    { type: 'power_supply', label: 'DC Power Supply', abbr: 'PS', defaultValue: '5V' },
    { type: 'battery_9v', label: '9V Battery', abbr: 'BAT', defaultValue: '9V' },
    { type: 'battery_coin', label: 'Coin Cell', abbr: 'BAT', defaultValue: '3V' },
  ]},
  { name: '💡 Basic Components', types: [
    { type: 'resistor', label: 'Resistor', abbr: 'R', defaultValue: '10kΩ' },
    { type: 'capacitor', label: 'Ceramic Capacitor', abbr: 'C', defaultValue: '100nF' },
    { type: 'capacitor_elec', label: 'Electrolytic Cap', abbr: 'CE', defaultValue: '100µF' },
    { type: 'inductor', label: 'Inductor', abbr: 'L', defaultValue: '10mH' },
    { type: 'potentiometer', label: 'Potentiometer', abbr: 'POT', defaultValue: '10kΩ' },
    { type: 'photoresistor', label: 'Photoresistor', abbr: 'LDR', defaultValue: '' },
    { type: 'thermistor', label: 'Thermistor', abbr: 'TH', defaultValue: '10kΩ' },
  ]},
  { name: '🔘 Input', types: [
    { type: 'button', label: 'Push Button', abbr: 'BTN', defaultValue: '' },
    { type: 'switch_slide', label: 'Slide Switch', abbr: 'SW', defaultValue: '' },
    { type: 'switch_toggle', label: 'Toggle Switch', abbr: 'SW', defaultValue: '' },
    { type: 'keypad', label: '4x4 Keypad', abbr: 'KP', defaultValue: '' },
  ]},
  { name: '🔊 Output', types: [
    { type: 'led', label: 'LED', abbr: 'LED', defaultValue: '', defaultColor: 'red' },
    { type: 'led_rgb', label: 'RGB LED', abbr: 'RGB', defaultValue: '' },
    { type: 'display_7seg', label: '7-Segment Display', abbr: 'SEG', defaultValue: '' },
    { type: 'lcd_16x2', label: 'LCD 16x2', abbr: 'LCD', defaultValue: '' },
    { type: 'buzzer', label: 'Buzzer', abbr: 'BUZ', defaultValue: '' },
    { type: 'motor_dc', label: 'DC Motor', abbr: 'M', defaultValue: '' },
    { type: 'servo', label: 'Servo Motor', abbr: 'SRV', defaultValue: '' },
    { type: 'motor_stepper', label: 'Stepper Motor', abbr: 'STP', defaultValue: '' },
  ]},
  { name: '🧠 MCUs & ICs', types: [
    { type: 'arduino_uno', label: 'Arduino Uno', abbr: 'UNO', defaultValue: '' },
    { type: 'arduino_nano', label: 'Arduino Nano', abbr: 'NANO', defaultValue: '' },
    { type: 'ic_555', label: '555 Timer', abbr: 'U', defaultValue: '' },
    { type: 'ic_shift_reg', label: 'Shift Register', abbr: 'U', defaultValue: '' },
    { type: 'ic_logic_and', label: 'AND Gate', abbr: 'U', defaultValue: '' },
    { type: 'ic_logic_or', label: 'OR Gate', abbr: 'U', defaultValue: '' },
    { type: 'ic_logic_not', label: 'NOT Gate', abbr: 'U', defaultValue: '' },
    { type: 'ic_opamp', label: 'Op-Amp', abbr: 'U', defaultValue: '' },
  ]},
  { name: '📡 Sensors', types: [
    { type: 'sensor_ultrasonic', label: 'Ultrasonic', abbr: 'US', defaultValue: '' },
    { type: 'sensor_pir', label: 'PIR Motion', abbr: 'PIR', defaultValue: '' },
    { type: 'sensor_temp', label: 'Temp (TMP36)', abbr: 'TMP', defaultValue: '' },
    { type: 'sensor_light', label: 'Light Sensor', abbr: 'LDR', defaultValue: '' },
    { type: 'sensor_tilt', label: 'Tilt Sensor', abbr: 'TILT', defaultValue: '' },
    { type: 'sensor_hall', label: 'Hall Effect', abbr: 'HALL', defaultValue: '' },
  ]},
  { name: '⚙️ Power & Control', types: [
    { type: 'voltage_reg', label: 'Voltage Regulator', abbr: 'VR', defaultValue: '5V' },
    { type: 'transistor_npn', label: 'NPN Transistor', abbr: 'Q', defaultValue: '' },
    { type: 'transistor_pnp', label: 'PNP Transistor', abbr: 'Q', defaultValue: '' },
    { type: 'mosfet', label: 'MOSFET', abbr: 'Q', defaultValue: '' },
    { type: 'relay', label: 'Relay', abbr: 'RL', defaultValue: '' },
  ]},
  { name: '🧩 Modules', types: [
    { type: 'hbridge', label: 'H-Bridge (L293D)', abbr: 'HB', defaultValue: '' },
    { type: 'ir_receiver', label: 'IR Receiver', abbr: 'IR', defaultValue: '' },
  ]},
]

const ID_PREFIX = {
  resistor: 'R', capacitor: 'C', capacitor_elec: 'CE', inductor: 'L',
  potentiometer: 'POT', photoresistor: 'LDR', thermistor: 'TH',
  button: 'BTN', switch_slide: 'SW', switch_toggle: 'SW', keypad: 'KP',
  led: 'LED', led_rgb: 'RGB', display_7seg: 'SEG', lcd_16x2: 'LCD',
  buzzer: 'BUZ', motor_dc: 'M', servo: 'SRV', motor_stepper: 'STP',
  arduino_uno: 'UNO', arduino_nano: 'NANO',
  ic_555: 'U', ic_shift_reg: 'U', ic_logic_and: 'U', ic_logic_or: 'U',
  ic_logic_not: 'U', ic_opamp: 'U',
  sensor_ultrasonic: 'US', sensor_pir: 'PIR', sensor_temp: 'TMP',
  sensor_light: 'LDR', sensor_tilt: 'TILT', sensor_hall: 'HALL',
  voltage_reg: 'VR', transistor_npn: 'Q', transistor_pnp: 'Q',
  mosfet: 'Q', relay: 'RL', hbridge: 'HB', ir_receiver: 'IR',
  power_supply: 'PS', battery_9v: 'BAT', battery_coin: 'BAT',
  wire: 'W', power_rail: 'PWR',
}

export function generateId(type, existingComponents) {
  const prefix = ID_PREFIX[type] ?? 'X'
  const existing = existingComponents.filter((c) => c.type === type)
  return `${prefix}${existing.length + 1}`
}

function CompIcon({ type }) {
  const def = getComponentDef(type)
  return (
    <div
      className="w-6 h-6 rounded flex items-center justify-center text-[8px] font-bold text-white shrink-0"
      style={{ backgroundColor: def.color }}
    >
      {def.label.slice(0, 3)}
    </div>
  )
}

const ALL_TYPES = CATEGORIES.flatMap(c => c.types)

export default function ComponentSidebar({ mode }) {
  const isManual = mode === 'manual'
  const [openCats, setOpenCats] = useState(() => new Set(CATEGORIES.map(c => c.name)))
  const [query, setQuery] = useState('')

  const suggestions = query.trim().length > 0
    ? ALL_TYPES.filter(ct => ct.label.toLowerCase().includes(query.toLowerCase()))
    : []

  const toggle = (name) => {
    setOpenCats(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  const handleDragStart = (e, ct) => {
    _currentDragType = ct.type
    e.dataTransfer.setData('component-type', ct.type)
    e.dataTransfer.setData('default-value', ct.defaultValue || '')
    if (ct.defaultColor) e.dataTransfer.setData('default-color', ct.defaultColor)
    e.dataTransfer.effectAllowed = 'copy'
    const ghost = document.createElement('div')
    ghost.style.cssText = 'width:1px;height:1px;opacity:0;position:absolute;top:-1000px'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    requestAnimationFrame(() => document.body.removeChild(ghost))
  }

  return (
    <div className={`flex flex-col border-r border-gray-800 bg-gray-950 w-48 shrink-0 overflow-y-auto transition-opacity ${
      isManual ? 'opacity-100' : 'opacity-40 pointer-events-none'
    }`}>
      <div className="sticky top-0 bg-gray-950 z-10 px-2 pt-2 pb-1">
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Components</span>
        <div className="relative mt-1">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search components…"
            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-[11px] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>
      {query.trim().length > 0 && suggestions.length > 0 && (
        <div className="flex flex-col gap-0.5 px-1 pb-1 pt-1">
          {suggestions.map((ct) => (
            <div
              key={ct.type}
              draggable={isManual}
              onDragStart={(e) => handleDragStart(e, ct)}
              className={`flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors ${
                isManual ? 'text-gray-300 hover:bg-gray-800 cursor-grab active:cursor-grabbing' : 'text-gray-500'
              }`}
            >
              <CompIcon type={ct.type} />
              <span className="truncate">{ct.label}</span>
            </div>
          ))}
        </div>
      )}
      {query.trim().length > 0 && suggestions.length === 0 && (
        <p className="text-[10px] text-gray-600 px-2 py-2">No components found</p>
      )}
      {query.trim().length === 0 && CATEGORIES.map((cat) => (
        <div key={cat.name}>
          <button
            onClick={() => toggle(cat.name)}
            className="w-full flex items-center justify-between px-2 py-1.5 text-[11px] font-medium text-gray-400 hover:text-gray-200 hover:bg-gray-900 transition-colors"
          >
            <span>{cat.name}</span>
            <span className="text-[10px]">{openCats.has(cat.name) ? '▾' : '▸'}</span>
          </button>
          {openCats.has(cat.name) && (
            <div className="flex flex-col gap-0.5 px-1 pb-1">
              {cat.types.map((ct) => (
                <div
                  key={ct.type}
                  draggable={isManual}
                  onDragStart={(e) => handleDragStart(e, ct)}
                  className={`flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors ${
                    isManual ? 'text-gray-300 hover:bg-gray-800 cursor-grab active:cursor-grabbing' : 'text-gray-500'
                  }`}
                >
                  <CompIcon type={ct.type} />
                  <span className="truncate">{ct.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {!isManual && (
        <p className="text-[10px] text-gray-600 px-2 py-2">Switch to Manual Mode to drag components</p>
      )}
      <div className="h-16 shrink-0" />
    </div>
  )
}
