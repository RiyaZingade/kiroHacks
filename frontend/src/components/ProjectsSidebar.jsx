import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ProjectsSidebar({ currentProjectId, onSelectProject, onNewProject, open, onClose }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    if (open) loadProjects()
  }, [open])

  async function loadProjects() {
    setLoading(true)
    if (!supabase) { setLoading(false); return }
    const { data } = await supabase
      .from('projects')
      .select('id, name, updated_at')
      .order('updated_at', { ascending: false })
    setProjects(data || [])
    setLoading(false)
  }

  async function handleNew() {
    const name = 'Untitled Circuit'
    const { data } = await supabase
      .from('projects')
      .insert({ name, circuit: {} })
      .select()
      .single()
    if (data) {
      await loadProjects()
      onNewProject(data.id)
      setEditingId(data.id)
      setEditName(name)
    }
  }

  async function handleRename(id) {
    const trimmed = editName.trim()
    if (!trimmed) { setEditingId(null); return }
    await supabase.from('projects').update({ name: trimmed }).eq('id', id)
    setProjects(p => p.map(proj => proj.id === id ? { ...proj, name: trimmed } : proj))
    setEditingId(null)
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    await supabase.from('projects').delete().eq('id', id)
    setProjects(p => p.filter(proj => proj.id !== id))
    if (id === currentProjectId) onNewProject(null)
  }

  if (!open) return null

  return (
    <div className="w-[240px] h-full bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Projects</span>
        <div className="flex items-center gap-1">
          <button onClick={handleNew} className="text-xs text-emerald-400 hover:text-emerald-300 px-1.5 py-0.5 rounded hover:bg-gray-800" title="New project">
            + New
          </button>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded hover:bg-gray-800" title="Close">
            ✕
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-xs text-gray-500 p-3">Loading…</p>
        ) : projects.length === 0 ? (
          <p className="text-xs text-gray-500 p-3">No projects yet</p>
        ) : (
          projects.map(p => (
            <div
              key={p.id}
              onClick={() => { if (editingId !== p.id) onSelectProject(p.id) }}
              className={`group flex items-center justify-between px-3 py-2 cursor-pointer text-sm transition-colors ${
                p.id === currentProjectId ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
              }`}
            >
              {editingId === p.id ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => handleRename(p.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRename(p.id); if (e.key === 'Escape') setEditingId(null) }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-gray-700 text-white text-sm px-1.5 py-0.5 rounded outline-none w-full mr-2"
                />
              ) : (
                <span
                  className="truncate"
                  onDoubleClick={(e) => { e.stopPropagation(); setEditingId(p.id); setEditName(p.name) }}
                  title="Double-click to rename"
                >
                  {p.name}
                </span>
              )}
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100">
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingId(p.id); setEditName(p.name) }}
                  className="text-gray-500 hover:text-blue-400 text-xs"
                  title="Rename"
                >
                  ✏️
                </button>
                <button
                  onClick={(e) => handleDelete(p.id, e)}
                  className="text-gray-500 hover:text-red-400 text-xs"
                  title="Delete"
                >
                  🗑
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
