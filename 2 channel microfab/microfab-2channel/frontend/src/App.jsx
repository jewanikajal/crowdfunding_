import { useState } from 'react'
import StartupPortal from './portals/StartupPortal.jsx'
import ValidatorPortal from './portals/ValidatorPortal.jsx'
import InvestorPortal from './portals/InvestorPortal.jsx'
import ProjectPortal from './portals/ProjectPortal.jsx'
import InvestmentPortal from './portals/InvestmentPortal.jsx'
import PerformanceDashboard from './portals/PerformanceDashboard.jsx'

const NAV = [
  { id: 'startup',     label: 'Startup Portal',    icon: '🚀', color: 'from-violet-500 to-purple-600' },
  { id: 'validator',   label: 'Validator Portal',   icon: '🛡️', color: 'from-blue-500 to-cyan-600' },
  { id: 'investor',    label: 'Investor Portal',    icon: '💼', color: 'from-emerald-500 to-teal-600' },
  { id: 'project',     label: 'Project Board',      icon: '📋', color: 'from-orange-500 to-amber-600' },
  { id: 'investment',  label: 'Investment Desk',    icon: '💹', color: 'from-pink-500 to-rose-600' },
  { id: 'performance', label: 'Performance Analysis', icon: '📊', color: 'from-indigo-500 to-blue-600' },
]

function App() {
  const [active, setActive] = useState('startup')
  const current = NAV.find(n => n.id === active)

  const renderPortal = () => {
    switch (active) {
      case 'startup':     return <StartupPortal />
      case 'validator':   return <ValidatorPortal />
      case 'investor':    return <InvestorPortal />
      case 'project':     return <ProjectPortal />
      case 'investment':  return <InvestmentPortal />
      case 'performance': return <PerformanceDashboard />
      default:            return null
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #0a0a1a 0%, #0f0a2e 50%, #0a0a1a 100%)' }}>
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col" style={{ background: 'rgba(10,10,30,0.8)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Logo */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>⛓️</div>
            <div>
              <p className="text-white font-bold text-sm leading-none">ChainFund</p>
              <p className="text-white/40 text-xs mt-0.5">Hyperledger Fabric</p>
            </div>
          </div>
        </div>

        {/* Network Status */}
        <div className="mx-4 mb-4 px-3 py-2 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-xs font-medium">Microfab Online</span>
          </div>
          <p className="text-white/30 text-xs mt-0.5 ml-4">localhost:9090</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-left
                ${active === item.id
                  ? 'text-white shadow-lg'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}
              style={active === item.id ? { background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(79,70,229,0.2))', border: '1px solid rgba(124,58,237,0.3)' } : {}}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
              {active === item.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400" />}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 mt-auto">
          <div className="px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-white/30 text-xs">Channels</p>
            <p className="text-purple-400/80 text-xs mt-1 font-mono">gov-validation-channel</p>
            <p className="text-blue-400/80 text-xs mt-0.5 font-mono">investment-channel</p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Header */}
        <header className="px-8 py-5 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h1 className="text-white font-bold text-xl">{current.icon} {current.label}</h1>
            <p className="text-white/40 text-sm mt-0.5">Hyperledger Fabric Crowdfunding Platform</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa' }}>
              govcc · investcc
            </span>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {renderPortal()}
        </div>
      </main>
    </div>
  )
}

export default App
