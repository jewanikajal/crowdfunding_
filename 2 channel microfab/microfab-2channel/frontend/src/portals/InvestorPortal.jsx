import { useState } from 'react'

const API = 'http://127.0.0.1:3000'

const InputField = ({ label, name, type = 'text', placeholder, onChange }) => (
  <div>
    <label className="label">{label}</label>
    <input name={name} type={type} placeholder={placeholder || label} onChange={onChange} className="input-dark" />
  </div>
)

const ResponsePanel = ({ response, loading }) => {
  if (loading) return (
    <div className="flex items-center gap-3 py-4 text-white/40">
      <div className="w-4 h-4 border-2 border-emerald-400/40 border-t-emerald-400 rounded-full animate-spin" />
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

export default function InvestorPortal() {
  const [tab, setTab] = useState('register')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState(null)
  const [form, setForm] = useState({
    id: '', name: '', email: '', panNumber: '', aadharNumber: '',
    investorType: 'individual', country: '', state: '', city: '',
    investmentFocus: '', portfolioSize: '', annualIncome: '', organizationName: ''
  })
  const [queryId, setQueryId] = useState('')

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  const post = async (url, body) => {
    setLoading(true); setResponse(null)
    try {
      const r = await fetch(`${API}${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      setResponse(await r.json())
    } catch (e) { setResponse({ success: false, error: e.message }) }
    setLoading(false)
  }

  const TABS = [
    { id: 'register', label: '📝 Register' },
    { id: 'query',    label: '🔍 Query' },
    { id: 'dispute',  label: '⚖️ Dispute' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setResponse(null) }}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
              ${tab === t.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : 'text-white/50 hover:text-white/70'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'register' && (
        <div className="section-card space-y-5">
          <div>
            <h3 className="text-white font-semibold text-base">Register New Investor</h3>
            <p className="text-white/40 text-sm mt-0.5">Registers on gov-validation-channel and investment-channel. Annual income ≥ ₹5,00,000 required for approval.</p>
          </div>
          <form onSubmit={e => { e.preventDefault(); post('/api/investor/register', { ...form, portfolioSize: form.portfolioSize, annualIncome: Number(form.annualIncome) }) }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Investor ID" name="id" placeholder="e.g. inv001" onChange={handle} />
              <InputField label="Full Name" name="name" placeholder="e.g. Amit Patel" onChange={handle} />
            </div>
            <InputField label="Email Address" name="email" type="email" placeholder="investor@fund.com" onChange={handle} />
            <div className="grid grid-cols-2 gap-4">
              <InputField label="PAN Number" name="panNumber" placeholder="ABCDE1234F" onChange={handle} />
              <InputField label="Aadhar Number" name="aadharNumber" placeholder="1234 5678 9012" onChange={handle} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Investor Type</label>
                <select name="investorType" onChange={handle} className="input-dark">
                  <option value="individual">Individual</option>
                  <option value="angel">Angel Investor</option>
                  <option value="vc">Venture Capital</option>
                  <option value="institutional">Institutional</option>
                </select>
              </div>
              <InputField label="Organization (Optional)" name="organizationName" placeholder="e.g. Sequoia Capital" onChange={handle} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <InputField label="Country" name="country" placeholder="India" onChange={handle} />
              <InputField label="State" name="state" placeholder="Maharashtra" onChange={handle} />
              <InputField label="City" name="city" placeholder="Mumbai" onChange={handle} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <InputField label="Investment Focus" name="investmentFocus" placeholder="e.g. Fintech" onChange={handle} />
              <InputField label="Portfolio Size" name="portfolioSize" placeholder="e.g. large / 50Cr" onChange={handle} />
              <div>
                <InputField label="Annual Income (₹)" name="annualIncome" type="number" placeholder="e.g. 1000000" onChange={handle} />
                <p className="text-yellow-400/70 text-xs mt-1">⚠️ Must be ≥ 5,00,000 to get approved</p>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 disabled:opacity-50">
              {loading ? 'Submitting to Blockchain...' : '💼 Register Investor'}
            </button>
          </form>
          <ResponsePanel response={response} loading={loading} />
        </div>
      )}

      {tab === 'query' && (
        <div className="section-card space-y-5">
          <div>
            <h3 className="text-white font-semibold text-base">Query Investor</h3>
            <p className="text-white/40 text-sm mt-0.5">Fetch investor details from the blockchain ledger</p>
          </div>
          <div className="flex gap-3">
            <input value={queryId} onChange={e => setQueryId(e.target.value)}
              placeholder="Enter Investor ID..." className="input-dark flex-1" />
            <button disabled={loading || !queryId}
              onClick={async () => {
                setLoading(true); setResponse(null)
                try {
                  const r = await fetch(`${API}/api/investor/${queryId}`)
                  setResponse(await r.json())
                } catch (e) { setResponse({ success: false, error: e.message }) }
                setLoading(false)
              }}
              className="btn-success px-5">
              {loading ? '...' : '🔍 Query'}
            </button>
          </div>
          {response?.success && response.data && (
            <div className="glass rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-semibold">{response.data.name}</h4>
                <span className={response.data.validationStatus === 'APPROVED' ? 'badge-approved' : response.data.validationStatus === 'REJECTED' ? 'badge-rejected' : 'badge-pending'}>
                  {response.data.validationStatus}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['ID', response.data.id], ['Type', response.data.investorType],
                  ['PAN', response.data.panNumber], ['Annual Income', `₹${(response.data.annualIncome || 0).toLocaleString()}`],
                  ['Focus', response.data.investmentFocus], ['Portfolio', response.data.portfolioSize],
                  ['City', response.data.city], ['Country', response.data.country],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-white/40 text-xs">{k}</p>
                    <p className="text-white/80 font-medium">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(!response?.success && response) && <ResponsePanel response={response} loading={false} />}
        </div>
      )}

      {tab === 'dispute' && (
        <div className="section-card space-y-5">
          <div>
            <h3 className="text-white font-semibold text-base">⚖️ Raise Dispute</h3>
            <p className="text-white/40 text-sm mt-0.5">Raise a dispute against a funded project within the dispute window (7 days)</p>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Project ID</label>
                <input id="disp-proj" placeholder="e.g. proj001" className="input-dark" />
              </div>
              <div>
                <label className="label">Your Investor ID</label>
                <input id="disp-inv" placeholder="e.g. inv001" className="input-dark" />
              </div>
            </div>
            <div>
              <label className="label">Reason for Dispute</label>
              <textarea id="disp-reason" rows={3} placeholder="Describe the reason for raising a dispute..."
                className="input-dark resize-none" />
            </div>
            <button disabled={loading}
              onClick={() => post('/api/dispute/raise', {
                projectID: document.getElementById('disp-proj').value,
                investorID: document.getElementById('disp-inv').value,
                reason: document.getElementById('disp-reason').value
              })}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-orange-600 hover:bg-orange-500 text-white transition-all disabled:opacity-50">
              {loading ? 'Raising Dispute on Blockchain...' : '⚖️ Raise Dispute'}
            </button>
          </div>
          <ResponsePanel response={response} loading={loading} />
        </div>
      )}
    </div>
  )
}
