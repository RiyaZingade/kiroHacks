// P2 owns this file
// POST /api/upload-pdf → { extracted_text, components_hint, circuit_id }
export default function PDFUpload({ onCircuitExtracted }) {
  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/upload-pdf', { method: 'POST', body: form })
      const data = await res.json()
      onCircuitExtracted?.(data)
    } catch {
      alert('Upload failed.')
    }
  }

  return (
    <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-lg p-8 cursor-pointer hover:border-blue-500 transition-colors">
      <span className="text-gray-400 text-sm">Drop a PDF or click to upload</span>
      <input type="file" accept=".pdf" className="hidden" onChange={handleFile} />
    </label>
  )
}
