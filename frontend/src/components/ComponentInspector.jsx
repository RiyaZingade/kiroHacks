import { useState, useEffect, useRef } from 'react'
import { getComponentDef } from './ComponentRenderer'

// P3 owns this file
// Click a component → overlay showing type, value editor, rotation, pin list, delete

export default function ComponentInspector({
  component,
  onUpdateValue,
  onRotate,
  onDelete,
  onClose,
}) {
  const [value, setValue] = useState(component?.value ?? '')
  const ref = useRef(null)

  // Sync local value when selected component changes
  useEffect(() => {
    setValue(component?.value ?? '')
  }, [component?.id, component?.value])

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Close on click outside
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose()
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick)
    }, 100)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

  if (!component) return null

  const def = getComponentDef(component.type)
  const pins = Object.keys(def.pins)
  const currentRotation = component.rotation ?? 0

  const handleSave = () => {
    onUpdateValue(component.id, value)
  }

  return (
    <div
      ref={ref}
      className="absolute top-4 right-4 z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-4 w-64"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">{component.id}</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 text-lg leading-none"
          aria-label="Close inspector"
        >
          ×
        </button>
      </div>

      <div className="space-y-3 text-sm">
        {/* Type (read-only) */}
        <div>
          <label className="text-gray-500 text-xs uppercase tracking-wide">Type</label>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="w-3 h-3 rounded-sm inline-block"
              style={{ backgroundColor: def.color }}
            />
            <span className="text-gray-200">{component.type}</span>
          </div>
        </div>

        {/* Value (editable) */}
        <div>
          <label className="text-gray-500 text-xs uppercase tracking-wide">Value</label>
          <div className="flex gap-1 mt-0.5">
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
              }}
              placeholder="e.g. 10kΩ"
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 text-sm focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleSave}
              className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs text-white"
            >
              Set
            </button>
          </div>
        </div>

        {/* Position */}
        <div>
          <label className="text-gray-500 text-xs uppercase tracking-wide">Position</label>
          <span className="text-gray-300 ml-2">
            [{component.position[0]}, {component.position[1]}]
          </span>
        </div>

        {/* Rotation */}
        <div>
          <label className="text-gray-500 text-xs uppercase tracking-wide">Rotation</label>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-gray-300">{currentRotation}°</span>
            <button
              onClick={() => onRotate(component.id)}
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-xs text-gray-200 flex items-center gap-1"
            >
              ↻ Rotate 90°
            </button>
          </div>
        </div>

        {/* Pins */}
        <div>
          <label className="text-gray-500 text-xs uppercase tracking-wide">Pins</label>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {pins.map((pin) => (
              <span
                key={pin}
                className="px-2 py-0.5 bg-gray-800 rounded text-gray-400 text-xs"
              >
                {pin}
              </span>
            ))}
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={() => onDelete(component.id)}
          className="w-full mt-2 px-3 py-1.5 bg-red-900/50 hover:bg-red-800/60 border border-red-800 rounded text-red-300 text-xs"
        >
          Delete Component
        </button>
      </div>
    </div>
  )
}
