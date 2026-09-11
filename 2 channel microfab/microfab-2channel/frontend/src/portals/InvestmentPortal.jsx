import { useState } from 'react'

const API = 'http://127.0.0.1:3000'

const ResponsePanel = ({ response, loading }) => {
  if (loading) return (
    <div className="flex items-center gap-3 py-4 text-white/40">
      <div className="w-4 h-4 border-2 border-pink-400/40 border-t-pink-400 rounded-full animate-spin" />
      <span className="text-sm">Processing on blockchain...</span>
    </div>
  )
  if (!response) return null
  return (
    <div className={`mt-4 p-4 rounded-xl border text-sm font-mono overflow-auto max-h-48 ${
      response.success ? 'bg-emerald-400/5 border-emerald-400/20 text-emerald-300'
                       : 'bg-red-400/5 border-red-400/20 text-red-300'
    }`}>
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
        <span>{response.success ? '✅' : '❌'}</span>
        <span className="text-white/60 text-xs">{response.success ? 'SUCCESS' : 'ERROR'}</span>
      </div>
      <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(response, null, 2)}</pre>
    </div>
  )
}

export default function InvestmentPortal() {
  const [tab, setTab] = useState('fund')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState(null)
  const [queryProjId, setQueryProjId] = useState('')

  const post = async (url, body) => {
    setLoading(true); setResponse(null)
    try {
      const r = await fetch(`${API}${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      setResponse(await r.json())
    } catch (e) { setResponse({ success: false, error: e.message }) }
    setLoading(false)
  }

  const TABS = [
    { id: 'fund',    label: '💰 Fund' },
    { id: 'release', label: '🔓 Release' },
    { id: 'refund',  label: '↩️ Refund' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setResponse(null) }}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
              ${tab === t.id ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30' : 'text-white/50 hover:text-white/70'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'fund' && (
        <div className="section-card space-y-5">
          <div>
            <h3 className="text-white font-semibold text-base">💰 Fund a Project</h3>
            <p className="text-white/40 text-sm mt-0.5">Investor must be APPROVED and project must be APPROVED before funding</p>
          </div>
          <div className="p-4 rounded-xl" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }}>
            <p className="text-yellow-400/80 text-sm">
              <span className="font-semibold">Prerequisites:</span> Startup registered ✓ → Startup approved ✓ → Project created ✓ → Project approved ✓ → Investor registered ✓ → Investor approved ✓
            </p>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Project ID</label>
                <input id="fund-proj" placeholder="e.g. p1" className="input-dark" />
              </div>
              <div>
                <label className="label">Investor ID</label>
                <input id="fund-inv" placeholder="e.g. i1" className="input-dark" />
              </div>
            </div>
            <div>
              <label className="label">Amount (₹)</label>
              <input id="fund-amount" type="number" placeholder="e.g. 500000" className="input-dark" />
            </div>
            <button disabled={loading}
              onClick={() => post('/api/investment/fund', {
                projectID: document.getElementById('fund-proj').value,
                investorID: document.getElementById('fund-inv').value,
                amount: Number(document.getElementById('fund-amount').value)
              })}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-600/25 transition-all disabled:opacity-50">
              {loading ? 'Processing on Blockchain...' : '💸 Fund Project'}
            </button>
          </div>
          <ResponsePanel response={response} loading={loading} />
        </div>
      )}

      {tab === 'release' && (
        <div className="section-card space-y-5">
          <div>
            <h3 className="text-white font-semibold text-base">🔓 Release Funds</h3>
            <p className="text-white/40 text-sm mt-0.5">Transfer collected funds to the startup. Project must be fully funded and goals met.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">Project ID</label>
              <input id="release-proj" placeholder="e.g. p1" className="input-dark" />
            </div>
            <button disabled={loading}
              onClick={() => post('/api/investment/release', { projectID: document.getElementById('release-proj').value })}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50">
              {loading ? 'Processing on Blockchain...' : '🔓 Release Funds to Startup'}
            </button>
          </div>
          <ResponsePanel response={response} loading={loading} />

          <div className="p-4 rounded-xl space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">How Fund Release Works</p>
            <ul className="text-white/40 text-sm space-y-1.5">
              <li>• Project must be in FUNDED state</li>
              <li>• Validators confirm milestone delivery</li>
              <li>• Smart contract transfers funds to startup wallet</li>
              <li>• Transaction is immutably recorded on both channels</li>
            </ul>
          </div>
        </div>
      )}

      {tab === 'refund' && (
        <div className="section-card space-y-5">
          <div>
            <h3 className="text-white font-semibold text-base">↩️ Refund Investment</h3>
            <p className="text-white/40 text-sm mt-0.5">Return investor's funds. Project must be in DISPUTE_RAISED state with resolution REFUND.</p>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Project ID</label>
                <input id="refund-proj" placeholder="e.g. p1" className="input-dark" />
              </div>
              <div>
                <label className="label">Investor ID</label>
                <input id="refund-inv" placeholder="e.g. i1" className="input-dark" />
              </div>
            </div>
            <button disabled={loading}
              onClick={() => post('/api/investment/refund', {
                projectID: document.getElementById('refund-proj').value,
                investorID: document.getElementById('refund-inv').value
              })}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/25 transition-all disabled:opacity-50">
              {loading ? 'Processing Refund on Blockchain...' : '↩️ Process Refund'}
            </button>
          </div>
          <ResponsePanel response={response} loading={loading} />
        </div>
      )}

      {/* Query investment at bottom */}
      <div className="section-card space-y-4">
        <div>
          <h3 className="text-white font-semibold">🔍 View Investment Details</h3>
          <p className="text-white/40 text-xs mt-0.5">Query investment record by Project ID from the investment channel</p>
        </div>
        <div className="flex gap-3">
          <input value={queryProjId} onChange={e => setQueryProjId(e.target.value)}
            placeholder="Enter Project ID..." className="input-dark flex-1" />
          <button disabled={loading || !queryProjId}
            onClick={async () => {
              setLoading(true)
              try {
                const r = await fetch(`${API}/api/project/${queryProjId}`)
                setResponse(await r.json())
              } catch (e) { setResponse({ success: false, error: e.message }) }
              setLoading(false)
            }}
            className="px-5 py-3 rounded-xl font-semibold text-sm bg-white/10 hover:bg-white/15 text-white transition-all disabled:opacity-50">
            {loading ? '...' : '🔍 View'}
          </button>
        </div>
        {response?.success && response.data && (
          <div className="grid grid-cols-2 gap-3 text-sm p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
            {[
              ['Project', response.data.projectID], ['Startup', response.data.startupID],
              ['Total Funded', `₹${(response.data.totalFunded || 0).toLocaleString()}`],
              ['Goal', `₹${(response.data.goal || 0).toLocaleString()}`],
              ['Status', response.data.status], ['Approval', response.data.approvalStatus],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-white/40 text-xs">{k}</p>
                <p className="text-white font-semibold text-base">{v}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
