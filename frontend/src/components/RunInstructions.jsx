export default function RunInstructions({ runInstructions }) {
  if (!runInstructions) return null
  const { power_requirements, wiring_steps, safety_flags } = runInstructions

  const hasContent = power_requirements || wiring_steps?.length || safety_flags?.length
  if (!hasContent) return null

  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Run Instructions</h3>

      {power_requirements && (
        <p className="text-yellow-400 font-medium">⚡ {power_requirements}</p>
      )}

      {wiring_steps?.length > 0 && (
        <ol className="list-decimal list-inside text-gray-300 text-xs space-y-1">
          {wiring_steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      )}

      {safety_flags?.length > 0 && (
        <div className="bg-red-900/40 border border-red-700 rounded p-2 text-xs text-red-300 space-y-1">
          {safety_flags.map((f, i) => <p key={i}>⚠ {f}</p>)}
        </div>
      )}
    </div>
  )
}
