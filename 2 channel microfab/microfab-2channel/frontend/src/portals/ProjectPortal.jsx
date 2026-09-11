import { useState } from 'react'

const API = 'http://127.0.0.1:3000'

const ResponsePanel = ({ response, loading }) => {
  if (loading) return (
    <div className="flex items-center gap-3 py-4 text-white/40">
      <div className="w-4 h-4 border-2 border-orange-400/40 border-t-orange-400 rounded-full animate-spin" />
      <span className="text-sm">Processing on blockchain...</span>
    </div>
  )
  if (!response) return null
  return (
    <div className={`mt-4 p-4 rounded-xl border text-sm font-mono overflow-auto max-h-52 ${
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

const StatusBadge = ({ status }) => {
  const map = {
    APPROVED: 'badge-approved', REJECTED: 'badge-rejected',
    OPEN: 'badge-open', FUNDED: 'badge-funded', PENDING: 'badge-pending'
  }
  return <span className={map[status] || 'badge-pending'}>{status}</span>
}

export default function ProjectPortal() {
  const [tab, setTab] = useState('create')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState(null)
  const [queryId, setQueryId] = useState('')
  const [projectData, setProjectData] = useState(null)
  const [form, setForm] = useState({
    projectID: '', startupID: '', title: '', description: '',
    goal: '', duration: '', industry: '', projectType: 'equity',
    country: '', targetMarket: '', currentStage: 'idea'
  })

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
    { id: 'create',   label: '🆕 Create' },
    { id: 'manage',   label: '⚙️ Manage' },
    { id: 'query',    label: '🔍 Query' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setResponse(null); setProjectData(null) }}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
              ${tab === t.id ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30' : 'text-white/50 hover:text-white/70'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'create' && (
        <div className="section-card space-y-5">
          <div>
            <h3 className="text-white font-semibold text-base">Create Funding Project</h3>
            <p className="text-white/40 text-sm mt-0.5">Startup must be APPROVED before creating a project. Creates on both channels.</p>
          </div>
          <form onSubmit={e => { e.preventDefault(); post('/api/project/create', { ...form, goal: Number(form.goal), duration: Number(form.duration) }) }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Project ID</label>
                <input name="projectID" placeholder="e.g. proj001" onChange={handle} className="input-dark" required />
              </div>
              <div>
                <label className="label">Startup ID (must be APPROVED)</label>
                <input name="startupID" placeholder="e.g. s001" onChange={handle} className="input-dark" required />
              </div>
            </div>
            <div>
              <label className="label">Project Title</label>
              <input name="title" placeholder="e.g. Green Solar Energy Platform" onChange={handle} className="input-dark" required />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea name="description" rows={3} placeholder="Describe your project goals and vision..." onChange={handle} className="input-dark resize-none" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Funding Goal (₹)</label>
                <input name="goal" type="number" placeholder="e.g. 1000000" onChange={handle} className="input-dark" required />
              </div>
              <div>
                <label className="label">Duration (days)</label>
                <input name="duration" type="number" placeholder="e.g. 30" onChange={handle} className="input-dark" required />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Industry</label>
                <input name="industry" placeholder="e.g. CleanTech" onChange={handle} className="input-dark" required />
              </div>
              <div>
                <label className="label">Project Type</label>
                <select name="projectType" onChange={handle} className="input-dark">
                  <option value="equity">Equity</option>
                  <option value="debt">Debt</option>
                  <option value="grant">Grant</option>
                </select>
              </div>
              <div>
                <label className="label">Current Stage</label>
                <select name="currentStage" onChange={handle} className="input-dark">
                  <option value="idea">Idea</option>
                  <option value="mvp">MVP</option>
                  <option value="growth">Growth</option>
                  <option value="scaling">Scaling</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Country</label>
                <input name="country" placeholder="India" onChange={handle} className="input-dark" required />
              </div>
              <div>
                <label className="label">Target Market</label>
                <input name="targetMarket" placeholder="e.g. SMEs, Consumers" onChange={handle} className="input-dark" required />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/25 disabled:opacity-50">
              {loading ? 'Creating on Blockchain...' : '📋 Create Project'}
            </button>
          </form>
          <ResponsePanel response={response} loading={loading} />
        </div>
      )}

      {tab === 'manage' && (
        <div className="space-y-5">
          <div className="section-card space-y-4">
            <div>
              <h3 className="text-white font-semibold">✅ Approve Project</h3>
              <p className="text-white/40 text-xs mt-0.5">Generates immutable approval hash stored on both channels</p>
            </div>
            <div className="flex gap-3">
              <input id="approve-id" placeholder="Project ID" className="input-dark flex-1" />
              <button onClick={() => post('/api/project/approve', { projectID: document.getElementById('approve-id').value })}
                disabled={loading} className="btn-success whitespace-nowrap px-6">
                {loading ? '...' : '✅ Approve'}
              </button>
            </div>
          </div>

          <div className="section-card space-y-4">
            <div>
              <h3 className="text-white font-semibold">❌ Reject Project</h3>
              <p className="text-white/40 text-xs mt-0.5">Reject a pending project — it cannot receive investments</p>
            </div>
            <div className="flex gap-3">
              <input id="reject-id" placeholder="Project ID" className="input-dark flex-1" />
              <button onClick={() => post('/api/project/reject', { projectID: document.getElementById('reject-id').value })}
                disabled={loading} className="btn-danger whitespace-nowrap px-6">
                {loading ? '...' : '❌ Reject'}
              </button>
            </div>
          </div>

          <ResponsePanel response={response} loading={loading} />
        </div>
      )}

      {tab === 'query' && (
        <div className="section-card space-y-5">
          <div>
            <h3 className="text-white font-semibold text-base">Query Project</h3>
            <p className="text-white/40 text-sm mt-0.5">Inspect project state on the investment channel</p>
          </div>
          <div className="flex gap-3">
            <input value={queryId} onChange={e => setQueryId(e.target.value)}
              placeholder="Enter Project ID..." className="input-dark flex-1" />
            <button disabled={loading || !queryId}
              onClick={async () => {
                setLoading(true); setResponse(null); setProjectData(null)
                try {
                  const r = await fetch(`${API}/api/project/${queryId}`)
                  const data = await r.json()
                  setResponse(data)
                  if (data.success) setProjectData(data.data)
                } catch (e) { setResponse({ success: false, error: e.message }) }
                setLoading(false)
              }}
              className="px-5 py-3 rounded-xl font-semibold text-sm bg-orange-600 hover:bg-orange-500 text-white transition-all disabled:opacity-50">
              {loading ? '...' : '🔍 Query'}
            </button>
          </div>
          {projectData && (
            <div className="glass rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-white font-semibold text-base">{projectData.title}</h4>
                  <p className="text-white/50 text-sm mt-0.5">{projectData.description}</p>
                </div>
                <div className="flex gap-2 flex-col items-end">
                  <StatusBadge status={projectData.approvalStatus} />
                  <StatusBadge status={projectData.status} />
                </div>
              </div>
              <div className="h-px bg-white/8" />
              {/* Funding Progress */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/50">Funding Progress</span>
                  <span className="text-white font-semibold">₹{(projectData.totalFunded || 0).toLocaleString()} / ₹{(projectData.goal || 0).toLocaleString()}</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div className="bg-gradient-to-r from-orange-500 to-amber-400 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, ((projectData.totalFunded || 0) / (projectData.goal || 1)) * 100)}%` }} />
                </div>
                <p className="text-white/40 text-xs mt-1 text-right">
                  {Math.round(((projectData.totalFunded || 0) / (projectData.goal || 1)) * 100)}% funded
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                {[
                  ['Project ID', projectData.projectID],
                  ['Startup', projectData.startupID],
                  ['Industry', projectData.industry],
                  ['Type', projectData.projectType],
                  ['Stage', projectData.currentStage],
                  ['Duration', `${projectData.duration} days`],
                  ['Country', projectData.country],
                  ['Target Market', projectData.targetMarket],
                  ['Approval Hash', projectData.approvalHash ? projectData.approvalHash.slice(0, 12) + '...' : 'N/A'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-white/40 text-xs">{k}</p>
                    <p className="text-white/80 font-medium truncate">{v}</p>
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
