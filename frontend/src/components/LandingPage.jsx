import { useState, useEffect } from 'react'

export default function LandingPage() {
  const [visible, setVisible] = useState(false)
  const [sparkles, setSparkles] = useState([])

  useEffect(() => {
    setVisible(true)
    // Generate random sparkle positions
    setSparkles(Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3,
      size: Math.random() * 3 + 1,
    })))
  }, [])

  return (
    <div className="relative min-h-screen bg-gray-950 overflow-hidden flex flex-col items-center justify-center">
      {/* Animated grid background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(16,185,129,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
      </div>

      {/* Floating sparkles */}
      {sparkles.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full bg-emerald-400 animate-pulse"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDelay: `${s.delay}s`,
            animationDuration: '2s',
            opacity: 0.6,
          }}
        />
      ))}

      {/* Glowing orb behind logo */}
      <div className="absolute w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />

      {/* Content */}
      <div className={`relative z-10 flex flex-col items-center gap-8 transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* PCB board */}
              <rect x="2" y="2" width="60" height="60" rx="8" fill="#065f46" stroke="#10b981" strokeWidth="1.5" />
              {/* Traces */}
              <path d="M12 20h10v12h8v-6h10" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 44h6v-8h12v8h10" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M40 20v24" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M50 14v10h-10" stroke="#34d399" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
              <path d="M50 50v-6h-10" stroke="#34d399" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
              {/* Resistor */}
              <rect x="18" y="17" width="8" height="6" rx="1" fill="#a47149" stroke="#d4a574" strokeWidth="0.5" />
              <line x1="19.5" y1="18" x2="19.5" y2="22" stroke="#d4a574" strokeWidth="0.5" />
              <line x1="21" y1="18" x2="21" y2="22" stroke="#d4a574" strokeWidth="0.5" />
              <line x1="24.5" y1="18" x2="24.5" y2="22" stroke="#d4a574" strokeWidth="0.5" />
              {/* LED */}
              <circle cx="40" cy="32" r="4" fill="#ef4444" opacity="0.9" />
              <circle cx="40" cy="32" r="4" fill="none" stroke="#fca5a5" strokeWidth="0.5" />
              <circle cx="40" cy="32" r="6" fill="none" stroke="#ef4444" strokeWidth="0.5" opacity="0.3" />
              {/* Capacitor */}
              <rect x="26" y="40" width="3" height="8" rx="0.5" fill="#3b82f6" />
              <rect x="30" y="40" width="3" height="8" rx="0.5" fill="#3b82f6" />
              {/* IC chip */}
              <rect x="46" y="22" width="10" height="14" rx="1" fill="#1e293b" stroke="#475569" strokeWidth="0.5" />
              <circle cx="49" cy="25" r="1" fill="#475569" />
              {[0,1,2,3].map(i => <rect key={`l${i}`} x="44" y={String(24+i*3)} width="3" height="1.5" rx="0.5" fill="#94a3b8" />)}
              {[0,1,2,3].map(i => <rect key={`r${i}`} x="55" y={String(24+i*3)} width="3" height="1.5" rx="0.5" fill="#94a3b8" />)}
              {/* Solder pads */}
              <circle cx="12" cy="20" r="2" fill="#fbbf24" opacity="0.8" />
              <circle cx="12" cy="44" r="2" fill="#fbbf24" opacity="0.8" />
              <circle cx="50" cy="14" r="1.5" fill="#fbbf24" opacity="0.6" />
              <circle cx="50" cy="50" r="1.5" fill="#fbbf24" opacity="0.6" />
              {/* Vias */}
              <circle cx="30" cy="26" r="1.5" fill="none" stroke="#34d399" strokeWidth="0.5" />
              <circle cx="30" cy="26" r="0.5" fill="#34d399" />
              <circle cx="22" cy="38" r="1.5" fill="none" stroke="#34d399" strokeWidth="0.5" />
              <circle cx="22" cy="38" r="0.5" fill="#34d399" />
            </svg>
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-400 animate-ping" />
          </div>
          <h1 className="text-6xl font-bold tracking-tight">
            <span className="text-white">Cir</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">Kit</span>
          </h1>
        </div>

        {/* Tagline */}
        <p className="text-xl text-gray-400 text-center max-w-lg">
          <span className="text-emerald-300/90">AI-powered</span> electronics prototyping.
          <br />
          <span className="text-gray-500">Design, simulate, and build circuits — all in your browser.</span>
        </p>

        {/* Feature pills */}
        <div className={`flex gap-3 flex-wrap justify-center transition-all duration-1000 delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {[
            { label: '🤖 AI Agent', href: '/app?mode=agent&chat=open' },
            { label: '📋 PDF Import', href: '/app?upload=pdf' },
            { label: '🔧 Manual Mode', href: '/app?mode=manual' },
            { label: '🎮 Playground', href: '/app' },
          ].map((f) => (
            <a key={f.label} href={f.href} className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-800/80 text-gray-300 border border-gray-700/50 hover:border-emerald-500/50 hover:text-emerald-300 transition-colors cursor-pointer">
              {f.label}
            </a>
          ))}
        </div>

        {/* CTA Button */}
        <a
          href="/app"
          className={`group relative mt-4 transition-all duration-1000 delay-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 opacity-70 blur group-hover:opacity-100 transition-opacity" />
          <button className="relative px-8 py-3 rounded-xl bg-gray-950 text-white font-semibold text-lg flex items-center gap-2 border border-emerald-500/30 group-hover:border-emerald-400/60 transition-colors">
            Start Prototyping
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </a>

        {/* Subtle circuit animation hint */}
        <div className={`flex items-center gap-2 mt-8 transition-all duration-1000 delay-700 ${visible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-1">
            <div className="w-8 h-0.5 bg-emerald-500/40 rounded" />
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse shadow-sm shadow-yellow-400/50" />
            <div className="w-12 h-0.5 bg-emerald-500/40 rounded" />
            <div className="w-3 h-3 rounded border border-emerald-500/40" />
            <div className="w-8 h-0.5 bg-emerald-500/40 rounded" />
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse shadow-sm shadow-yellow-400/50" style={{ animationDelay: '0.5s' }} />
            <div className="w-12 h-0.5 bg-emerald-500/40 rounded" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-xs text-gray-600">
        Built in 12 hours · Hackathon 2026
      </div>
    </div>
  )
}
