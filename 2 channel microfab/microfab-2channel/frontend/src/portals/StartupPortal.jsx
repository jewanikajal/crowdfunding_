import { useState } from 'react'

const API = 'http://127.0.0.1:3000'

const InputField = ({ label, name, type = 'text', placeholder, onChange, required, value }) => (
  <div>
    <label className="label">{label}</label>
    <input
      name={name}
      type={type}
      placeholder={placeholder || label}
      onChange={onChange}
      required={required}
      value={value}
      className="input-dark"
    />
  </div>
)

const ResponsePanel = ({ response, loading }) => {
  if (loading) return (
    <div className="flex items-center gap-3 py-4 text-white/40">
      <div className="w-4 h-4 border-2 border-purple-400/40 border-t-purple-400 rounded-full animate-spin" />
      <span className="text-sm">Processing on blockchain...</span>
    </div>
  )
  if (!response) return null
  return (
    <div className={`mt-4 p-4 rounded-xl border text-sm font-mono overflow-auto max-h-48 ${
      response.success
        ? 'bg-emerald-400/5 border-emerald-400/20 text-emerald-300'
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

export default function StartupPortal() {
  const [tab, setTab] = useState('register')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState(null)
  const [form, setForm] = useState({
    id: '', name: '', email: '', panNumber: '', gstNumber: '',
    incorporationDate: '', industry: '', businessType: '', country: '',
    state: '', city: '', website: '', description: '', foundedYear: '', founderName: ''
  })
  const [validateForm, setValidateForm] = useState({ startupID: '', decision: 'APPROVED' })
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
    { id: 'validate', label: '✅ Validate' },
    { id: 'query',    label: '🔍 Query' },
  ]

  return (
    <div className="space-y-6">
      {/* Tab Bar */}
      <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setResponse(null) }}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
              ${tab === t.id ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'text-white/50 hover:text-white/70'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Register Tab */}
      {tab === 'register' && (
        <div className="section-card space-y-5">
          <div>
            <h3 className="text-white font-semibold text-base">Register New Startup</h3>
            <p className="text-white/40 text-sm mt-0.5">Creates startup on gov-validation-channel + investment-channel</p>
          </div>
          <form onSubmit={e => { e.preventDefault(); post('/api/startup/register', form) }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Startup ID" name="id" placeholder="e.g. s001" onChange={handle} required />
              <InputField label="Startup Name" name="name" placeholder="e.g. GreenTech Inc" onChange={handle} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Email" name="email" type="email" placeholder="founder@startup.com" onChange={handle} required />
              <InputField label="Founder Name" name="founderName" placeholder="e.g. Raj Sharma" onChange={handle} required />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <InputField label="PAN Number" name="panNumber" placeholder="ABCDE1234F" onChange={handle} required />
              <InputField label="GST Number" name="gstNumber" placeholder="27XXXXX1234Z1Z5" onChange={handle} required />
              <InputField label="Incorporation Date" name="incorporationDate" type="date" onChange={handle} required />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <InputField label="Industry" name="industry" placeholder="e.g. Fintech" onChange={handle} required />
              <InputField label="Business Type" name="businessType" placeholder="e.g. Pvt Ltd" onChange={handle} required />
              <InputField label="Founded Year" name="foundedYear" type="number" placeholder="2022" onChange={handle} required />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <InputField label="Country" name="country" placeholder="India" onChange={handle} required />
              <InputField label="State" name="state" placeholder="Karnataka" onChange={handle} required />
              <InputField label="City" name="city" placeholder="Bangalore" onChange={handle} required />
            </div>
            <InputField label="Website" name="website" placeholder="www.startup.com" onChange={handle} />
            <div>
              <label className="label">Description</label>
              <textarea name="description" rows={3} onChange={handle} placeholder="Brief description of your startup..."
                className="input-dark resize-none" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Submitting to Blockchain...' : '🚀 Register Startup'}
            </button>
          </form>
          <ResponsePanel response={response} loading={loading} />
        </div>
      )}

      {/* Validate Tab */}
      {tab === 'validate' && (
        <div className="section-card space-y-5">
          <div>
            <h3 className="text-white font-semibold text-base">Validate Startup KYC</h3>
            <p className="text-white/40 text-sm mt-0.5">Approve or reject a registered startup (requires PAN, GST, and incorporation date)</p>
          </div>
          <div className="space-y-4">
            <InputField label="Startup ID" name="startupID" placeholder="Enter startup ID to validate"
              onChange={e => setValidateForm(f => ({ ...f, startupID: e.target.value }))} required />
            <div>
              <label className="label">Decision</label>
              <div className="grid grid-cols-2 gap-3">
                {['APPROVED', 'REJECTED'].map(d => (
                  <button key={d} onClick={() => setValidateForm(f => ({ ...f, decision: d }))}
                    className={`py-3 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                      validateForm.decision === d
                        ? d === 'APPROVED'
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                          : 'bg-red-500/20 border-red-500/50 text-red-400'
                        : 'border-white/10 text-white/40 hover:bg-white/5'
                    }`}>
                    {d === 'APPROVED' ? '✅ APPROVE' : '❌ REJECT'}
                  </button>
                ))}
              </div>
            </div>
            <button disabled={loading || !validateForm.startupID}
              onClick={() => post('/api/startup/validate', validateForm)}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 ${
                validateForm.decision === 'APPROVED' ? 'btn-success' : 'btn-danger'
              }`}>
              {loading ? 'Processing...' : `${validateForm.decision === 'APPROVED' ? '✅' : '❌'} ${validateForm.decision} Startup`}
            </button>
          </div>
          <ResponsePanel response={response} loading={loading} />
        </div>
      )}

      {/* Query Tab */}
      {tab === 'query' && (
        <div className="section-card space-y-5">
          <div>
            <h3 className="text-white font-semibold text-base">Query Startup</h3>
            <p className="text-white/40 text-sm mt-0.5">Fetch startup details from the blockchain ledger</p>
          </div>
          <div className="flex gap-3">
            <input value={queryId} onChange={e => setQueryId(e.target.value)}
              placeholder="Enter Startup ID..." className="input-dark flex-1" />
            <button disabled={loading || !queryId}
              onClick={async () => {
                setLoading(true); setResponse(null)
                try {
                  const r = await fetch(`${API}/api/startup/${queryId}`)
                  setResponse(await r.json())
                } catch (e) { setResponse({ success: false, error: e.message }) }
                setLoading(false)
              }}
              className="btn-primary px-5">
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
                  ['ID', response.data.id], ['Industry', response.data.industry],
                  ['Country', response.data.country], ['City', response.data.city],
                  ['PAN', response.data.panNumber], ['GST', response.data.gstNumber],
                  ['Founded', response.data.foundedYear], ['Founder', response.data.founderName],
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
    </div>
  )
}
