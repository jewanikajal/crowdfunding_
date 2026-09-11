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
      <div className="w-4 h-4 border-2 border-blue-400/40 border-t-blue-400 rounded-full animate-spin" />
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

export default function ValidatorPortal() {
  const [tab, setTab] = useState('register')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState(null)
  const [form, setForm] = useState({ id: '', name: '', email: '', orgName: '', licenseNumber: '', country: '', state: '', specialization: '', yearsOfExperience: '' })

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
    { id: 'actions',  label: '⚡ Actions' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setResponse(null) }}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
              ${tab === t.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-white/50 hover:text-white/70'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'register' && (
        <div className="section-card space-y-5">
          <div>
            <h3 className="text-white font-semibold text-base">Register Validator</h3>
            <p className="text-white/40 text-sm mt-0.5">Add a validator who can approve startups, investors and projects</p>
          </div>
          <form onSubmit={e => { e.preventDefault(); post('/api/validator/register', form) }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Validator ID" name="id" placeholder="e.g. val001" onChange={handle} />
              <InputField label="Full Name" name="name" placeholder="e.g. Priya Mehta" onChange={handle} />
            </div>
            <InputField label="Email Address" name="email" type="email" placeholder="validator@org.com" onChange={handle} />
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Organization Name" name="orgName" placeholder="e.g. SEBI India" onChange={handle} />
              <InputField label="License Number" name="licenseNumber" placeholder="e.g. SEBI/HO/001" onChange={handle} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Country" name="country" placeholder="India" onChange={handle} />
              <InputField label="State" name="state" placeholder="Maharashtra" onChange={handle} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Specialization" name="specialization" placeholder="e.g. Fintech, CleanTech" onChange={handle} />
              <InputField label="Years of Experience" name="yearsOfExperience" type="number" placeholder="e.g. 8" onChange={handle} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 disabled:opacity-50">
              {loading ? 'Registering on Blockchain...' : '🛡️ Register Validator'}
            </button>
          </form>
          <ResponsePanel response={response} loading={loading} />
        </div>
      )}

      {tab === 'actions' && (
        <div className="grid gap-5">
          {/* Validate Startup */}
          <div className="section-card space-y-4">
            <div>
              <h3 className="text-white font-semibold">✅ Validate Startup</h3>
              <p className="text-white/40 text-xs mt-0.5">Approve or reject a registered startup's KYC on both channels</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="label">Startup ID</label>
                <input id="vs-id" placeholder="e.g. s100" className="input-dark w-full" />
              </div>
              <div>
                <label className="label">Decision</label>
                <select id="vs-dec" className="input-dark w-full">
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={() => post('/api/startup/validate', { startupID: document.getElementById('vs-id').value, decision: document.getElementById('vs-dec').value })}
                  disabled={loading} className="btn-primary w-full h-[46px]">
                  Submit Validation
                </button>
              </div>
            </div>
          </div>

          {/* Validate Investor */}
          <div className="section-card space-y-4">
            <div>
              <h3 className="text-white font-semibold">💼 Validate Investor</h3>
              <p className="text-white/40 text-xs mt-0.5">Annual income must be ≥ ₹5,00,000 for approval</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="label">Investor ID</label>
                <input id="vi-id" placeholder="e.g. i100" className="input-dark w-full" />
              </div>
              <div>
                <label className="label">Decision</label>
                <select id="vi-dec" className="input-dark w-full">
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={() => post('/api/investor/validate', { investorID: document.getElementById('vi-id').value, decision: document.getElementById('vi-dec').value })}
                  disabled={loading} className="btn-primary w-full h-[46px]">
                  Submit Validation
                </button>
              </div>
            </div>
          </div>

          {/* Approve Project */}
          <div className="section-card space-y-4">
            <div>
              <h3 className="text-white font-semibold">📋 Approve / Reject Project</h3>
              <p className="text-white/40 text-xs mt-0.5">Generates approval hash on gov-channel and mirrors to investment-channel</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="label">Project ID</label>
                <input id="proj-id" placeholder="e.g. p100" className="input-dark w-full" />
              </div>
              <div className="flex items-end gap-3 md:col-span-2">
                <button onClick={() => post('/api/project/approve', { projectID: document.getElementById('proj-id').value })}
                  disabled={loading} className="btn-success flex-1 h-[46px]">
                  ✅ Approve
                </button>
                <button onClick={() => post('/api/project/reject', { projectID: document.getElementById('proj-id').value })}
                  disabled={loading} className="btn-danger flex-1 h-[46px]">
                  ❌ Reject
                </button>
              </div>
            </div>
          </div>

          {/* Resolve Dispute */}
          <div className="section-card space-y-4">
            <div>
              <h3 className="text-white font-semibold">⚖️ Resolve Dispute</h3>
              <p className="text-white/40 text-xs mt-0.5">Resolve a raised dispute on both channels</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Project ID</label>
                <input id="dis-proj" placeholder="e.g. p100" className="input-dark w-full" />
              </div>
              <div>
                <label className="label">Investor ID</label>
                <input id="dis-inv" placeholder="e.g. i100" className="input-dark w-full" />
              </div>
              <div>
                <label className="label">Resolution</label>
                <select id="dis-res" className="input-dark w-full">
                  <option value="REFUND">REFUND</option>
                  <option value="DISMISS">DISMISS</option>
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={() => post('/api/dispute/resolve', {
                  projectID: document.getElementById('dis-proj').value,
                  investorID: document.getElementById('dis-inv').value,
                  resolution: document.getElementById('dis-res').value
                })} disabled={loading} className="btn-primary w-full h-[46px]">
                  Resolve Dispute
                </button>
              </div>
            </div>
          </div>

          <ResponsePanel response={response} loading={loading} />
        </div>
      )}
    </div>
  )
}
