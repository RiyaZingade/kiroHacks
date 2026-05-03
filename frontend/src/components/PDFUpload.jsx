import { useState, useRef } from 'react'

export default function PDFUpload({ onCircuitExtracted, onSeedMessage }) {
  const [status, setStatus] = useState('idle') // idle | uploading | success | error
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [schematicData, setSchematicData] = useState(null) // Store PDF circuit data
  const [boardImageData, setBoardImageData] = useState(null) // Store board image
  const [schematicFile, setSchematicFile] = useState(null) // Store schematic file info
  const [imageFile, setImageFile] = useState(null) // Store image file info
  const pdfInputRef = useRef(null)
  const imageInputRef = useRef(null)

  async function uploadFile(file, type) {
    setStatus('uploading')
    setProgress(10)
    setErrorMsg('')

    const form = new FormData()
    form.append('file', file)

    try {
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 10, 85))
      }, 400)

      const endpoint = type === 'pdf' ? '/api/upload-pdf' : '/api/upload-image'
      const res = await fetch(endpoint, { method: 'POST', body: form })
      clearInterval(progressInterval)
      setProgress(95)

      // Check if response is ok first
      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`Upload failed: ${res.status} ${res.statusText}. ${errorText}`)
      }

      // Try to parse JSON with better error handling
      let data
      try {
        const responseText = await res.text()
        data = JSON.parse(responseText)
      } catch (jsonError) {
        console.error('JSON parsing error:', jsonError)
        throw new Error('Server returned invalid response. Please try again.')
      }

      if (data.error) {
        setErrorMsg(data.error)
        setStatus('error')
        return
      }

      setProgress(100)
      setStatus('idle') // Reset to allow more uploads

      // Store the data based on file type
      if (type === 'pdf') {
        setSchematicData(data)
        setSchematicFile({ name: file.name, size: file.size })
      } else {
        setBoardImageData(data)
        setImageFile({ name: file.name, size: file.size })
      }

    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  function handlePdfUpload(e) {
    const file = e.target.files[0]
    if (!file || file.type !== 'application/pdf') {
      setErrorMsg('Please upload a PDF file.')
      setStatus('error')
      return
    }
    uploadFile(file, 'pdf')
  }

  function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/svg+xml']
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Please upload an image file (JPG, PNG, SVG, etc.).')
      setStatus('error')
      return
    }
    uploadFile(file, 'image')
  }

  function combineSchematicAndBoard(schematicCircuit, boardCircuit) {
    return {
      ...schematicCircuit, // Use schematic for functionality
      components: [
        ...schematicCircuit.components, // Keep schematic components
        ...boardCircuit.components.filter(comp => 
          !schematicCircuit.components.some(sComp => sComp.id === comp.id)
        ) // Add unique board components
      ],
      connections: [
        ...schematicCircuit.connections,
        ...boardCircuit.connections.filter(conn => 
          !schematicCircuit.connections.some(sConn => 
            sConn.from === conn.from && sConn.to === conn.to
          )
        )
      ],
      canvas_mode: "arduino", // Start in Arduino mode with toggle available
      metadata: {
        ...schematicCircuit.metadata,
        name: "Arduino Board (Recreated)",
        has_schematic: true,
        has_board_image: true,
        can_toggle_breadboard: true
      }
    }
  }

  function handleCombine() {
    if (schematicData && boardImageData) {
      const combinedCircuit = combineSchematicAndBoard(schematicData.circuit, boardImageData.circuit)
      onCircuitExtracted?.(combinedCircuit)
      onSeedMessage?.(`✓ Board recreated successfully! Combined ${combinedCircuit.components?.length || 0} components. Use the toggle to switch between Arduino board and breadboard views.`)
    } else if (schematicData && !boardImageData) {
      // Just schematic - show Arduino board layout with toggle
      const circuit = { ...schematicData.circuit, metadata: { ...schematicData.circuit.metadata, can_toggle_breadboard: true } }
      onCircuitExtracted?.(circuit)
      onSeedMessage?.(`✓ Schematic loaded with ${circuit?.components?.length || 0} components. Use the toggle to switch between Arduino board and breadboard views.`)
    } else if (boardImageData && !schematicData) {
      // Just board image - recreated circuit with toggle
      const circuit = { ...boardImageData.circuit, metadata: { ...boardImageData.circuit.metadata, can_toggle_breadboard: true } }
      onCircuitExtracted?.(circuit)
      onSeedMessage?.(`✓ Board recreated from image with ${circuit?.components?.length || 0} components. Use the toggle to switch between Arduino board and breadboard views.`)
    }
  }

  function onDrop(e) {
    e.preventDefault()
    // Handle drop - determine file type and route accordingly
    const file = e.dataTransfer.files[0]
    if (file) {
      if (file.type === 'application/pdf') {
        uploadFile(file, 'pdf')
      } else {
        const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/svg+xml']
        if (validImageTypes.includes(file.type)) {
          uploadFile(file, 'image')
        } else {
          setErrorMsg('Please drop a PDF schematic or board image (JPG, PNG, SVG, etc.).')
          setStatus('error')
        }
      }
    }
  }

  function onDragOver(e) {
    e.preventDefault()
  }

  function reset() {
    setStatus('idle')
    setProgress(0)
    setErrorMsg('')
    setSchematicData(null)
    setBoardImageData(null)
    setSchematicFile(null)
    setImageFile(null)
    if (pdfInputRef.current) pdfInputRef.current.value = ''
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  return (
    <div className="px-4 py-3 border-b border-gray-800">
      {status === 'idle' && (
        <div className="space-y-3">
          {/* Drop zone */}
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            className="flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-lg p-3 hover:border-blue-500 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span className="text-gray-400 text-xs text-center">Drop files here or use buttons below</span>
          </div>

          {/* Upload buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => pdfInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-3 border border-gray-600 rounded-lg hover:border-blue-500 hover:bg-gray-800 transition-colors"
            >
              <svg className="w-5 h-5 text-blue-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-xs text-gray-300">Upload Schematic</span>
              <span className="text-xs text-gray-500">PDF</span>
            </button>

            <button
              onClick={() => imageInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-3 border border-gray-600 rounded-lg hover:border-purple-500 hover:bg-gray-800 transition-colors"
            >
              <svg className="w-5 h-5 text-purple-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs text-gray-300">Upload Board Image</span>
              <span className="text-xs text-gray-500">JPG, PNG, SVG</span>
            </button>
          </div>

          {/* File status */}
          {(schematicFile || imageFile) && (
            <div className="space-y-2">
              {schematicFile && (
                <div className="flex items-center gap-2 text-xs">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-400">Schematic: {schematicFile.name}</span>
                </div>
              )}
              {imageFile && (
                <div className="flex items-center gap-2 text-xs">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-purple-400">Board Image: {imageFile.name}</span>
                </div>
              )}
            </div>
          )}

          {/* Combine button */}
          {(schematicFile || imageFile) && (
            <button
              onClick={handleCombine}
              className="w-full flex items-center justify-center gap-2 p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {schematicFile && imageFile ? 'Recreate Board' : schematicFile ? 'Load Schematic' : 'Load Board Image'}
            </button>
          )}

          {/* Hidden file inputs */}
          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handlePdfUpload}
          />
          <input
            ref={imageInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.bmp,.webp,.svg"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>
      )}

      {status === 'uploading' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Processing file...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col gap-2">
          <p className="text-red-400 text-xs">{errorMsg}</p>
          <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-200 underline self-start">
            Try again
          </button>
        </div>
      )}
    </div>
  )
}