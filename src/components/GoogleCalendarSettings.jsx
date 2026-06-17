import React, { useState, useEffect } from 'react'
import { 
  Calendar, 
  Key, 
  RefreshCw, 
  HelpCircle,
  FileText,
  Github,
  Upload,
  Shield,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { getItems } from '../db/db'
import { 
  getGithubConfig, 
  saveGithubConfig, 
  pushToGithub, 
  verifyGithubPAT, 
  getLastGithubSync,
  isGithubConfigured 
} from '../services/githubSync'

export default function GoogleCalendarSettings({ 
  googleConfig, 
  onSaveGoogleConfig,
  googleStatus,
  onConnectGoogle,
  onDisconnectGoogle,
  syncLogs,
  onRefreshLogs
}) {
  // Google config state
  const [clientId, setClientId] = useState(googleConfig.clientId || '')
  const [apiKey, setApiKey] = useState(googleConfig.apiKey || '')
  const [googleSaved, setGoogleSaved] = useState(false)

  // GitHub Backup state
  const githubDefaults = getGithubConfig()
  const [githubPat, setGithubPat] = useState(githubDefaults.pat)
  const [githubOwner, setGithubOwner] = useState(githubDefaults.owner || 'riadhhachicha')
  const [githubRepo, setGithubRepo] = useState(githubDefaults.repo || 'agenda-personnel')
  const [githubBranch, setGithubBranch] = useState(githubDefaults.branch || 'main')
  const [githubPath, setGithubPath] = useState(githubDefaults.path || 'data/agenda_backup.json')
  const [githubAutoSync, setGithubAutoSync] = useState(githubDefaults.autoSync)
  const [githubStatus, setGithubStatus] = useState({ verified: isGithubConfigured() ? 'saved' : null })
  const [githubMsg, setGithubMsg] = useState('')
  const [githubLoading, setGithubLoading] = useState(false)
  const [lastSync, setLastSync] = useState(getLastGithubSync())

  // ─── Google handlers ───────────────────────────────────────────────────────
  const handleSaveGoogle = (e) => {
    e.preventDefault()
    onSaveGoogleConfig({ clientId: clientId.trim(), apiKey: apiKey.trim() })
    setGoogleSaved(true)
    setTimeout(() => setGoogleSaved(false), 3000)
  }

  // ─── GitHub Handlers ───────────────────────────────────────────────────────
  const handleSaveGithub = async (e) => {
    e.preventDefault()
    if (!githubPat.trim()) {
      setGithubMsg('⚠️ Le Personal Access Token est requis.')
      return
    }
    setGithubLoading(true)
    setGithubMsg('Vérification du token GitHub...')

    const result = await verifyGithubPAT(githubPat.trim(), githubOwner.trim(), githubRepo.trim())
    if (!result.valid) {
      setGithubMsg(`❌ ${result.error}`)
      setGithubStatus({ verified: 'error' })
      setGithubLoading(false)
      return
    }

    saveGithubConfig({
      pat: githubPat.trim(),
      owner: githubOwner.trim(),
      repo: githubRepo.trim(),
      branch: githubBranch.trim(),
      path: githubPath.trim(),
      autoSync: githubAutoSync
    })
    setGithubStatus({ verified: 'ok', repoName: result.repoName })
    setGithubMsg(`✅ Connexion réussie ! Dépôt : ${result.repoName}`)
    setGithubLoading(false)
    setTimeout(() => setGithubMsg(''), 5000)
  }

  const handleGithubBackupNow = async () => {
    setGithubLoading(true)
    setGithubMsg('Sauvegarde en cours...')
    try {
      const items = await getItems()
      await pushToGithub(items)
      const ts = getLastGithubSync()
      setLastSync(ts)
      setGithubMsg(`✅ ${items.length} éléments sauvegardés sur GitHub.`)
    } catch (e) {
      setGithubMsg(`❌ Erreur : ${e.message}`)
    } finally {
      setGithubLoading(false)
      setTimeout(() => setGithubMsg(''), 6000)
    }
  }

  const formatLastSync = (isoStr) => {
    if (!isoStr) return null
    try {
      return new Date(isoStr).toLocaleString('fr-FR', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
      })
    } catch { return isoStr }
  }

  const formatLogTime = (isoString) => {
    try {
      return new Date(isoString).toLocaleString('fr-FR', {
        day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      })
    } catch (e) { return isoString }
  }

  const githubConnected = githubStatus.verified === 'ok' || githubStatus.verified === 'saved'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ══════════════════════════════════════════════════
          1. GITHUB SYNC (en premier — c'est la priorité)
          ══════════════════════════════════════════════════ */}
      <div className="settings-card" style={{ borderLeft: '3px solid #24292f' }}>
        <div>
          <h2 className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Github size={20} /> Synchronisation GitHub
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Vos données agenda sont sauvegardées automatiquement dans votre dépôt{' '}
            <a href="https://github.com/riadhhachicha/agenda-personnel" target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--primary)', textDecoration: 'underline', fontWeight: '600' }}>
              riadhhachicha/agenda-personnel
            </a>.
          </p>
        </div>

        {/* Status indicator */}
        <div className="sync-status-box">
          <div className={`status-indicator ${
            githubConnected ? 'success' : 
            githubStatus.verified === 'error' ? 'error' : 'warning'
          }`} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {githubConnected 
                ? <><CheckCircle size={15} style={{ color: '#16a34a' }} /> Connecté — {githubStatus.repoName || `${githubOwner}/${githubRepo}`}</>
                : githubStatus.verified === 'error' 
                  ? <><XCircle size={15} style={{ color: '#dc2626' }} /> Erreur de connexion</>
                  : '⚙️ Non configuré — entrez votre PAT ci-dessous'}
            </div>
            {lastSync && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                <Clock size={11} /> Dernière sauvegarde : <strong>{formatLastSync(lastSync)}</strong>
              </div>
            )}
          </div>
          {githubConnected && (
            <button
              type="button"
              className="btn-primary"
              onClick={handleGithubBackupNow}
              disabled={githubLoading}
              style={{ padding: '0.45rem 1rem', display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}
            >
              <Upload size={14} className={githubLoading ? 'animate-spin' : ''} />
              Sauvegarder maintenant
            </button>
          )}
        </div>

        {githubMsg && (
          <div style={{
            fontSize: '0.85rem', fontWeight: '600',
            padding: '0.6rem 0.85rem', borderRadius: '10px',
            background: githubMsg.startsWith('✅') ? '#f0fdf4' : githubMsg.startsWith('❌') ? '#fef2f2' : 'var(--bg-app)',
            border: `1px solid ${githubMsg.startsWith('✅') ? '#bbf7d0' : githubMsg.startsWith('❌') ? '#fecaca' : 'var(--border-light)'}`,
            color: githubMsg.startsWith('✅') ? '#15803d' : githubMsg.startsWith('❌') ? '#b91c1c' : 'inherit'
          }}>
            {githubMsg}
          </div>
        )}

        <form onSubmit={handleSaveGithub} style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-main)' }}>
            <Shield size={14} /> Configuration du token GitHub
          </h3>

          {/* PAT input */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="github-pat" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Personal Access Token (PAT) *</span>
              <a 
                href="https://github.com/settings/tokens/new?scopes=repo&description=Agenda+Backup" 
                target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'underline' }}
              >
                → Créer un token sur GitHub
              </a>
            </label>
            <input
              id="github-pat"
              type="password"
              className="form-control"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={githubPat}
              onChange={e => setGithubPat(e.target.value)}
              autoComplete="new-password"
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px', display: 'block' }}>
              Scope requis : <strong>repo</strong> (lecture + écriture)
            </span>
          </div>

          {/* Repo info (pre-filled, collapsible) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="github-owner">Propriétaire</label>
              <input id="github-owner" type="text" className="form-control"
                value={githubOwner} onChange={e => setGithubOwner(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="github-repo">Dépôt</label>
              <input id="github-repo" type="text" className="form-control"
                value={githubRepo} onChange={e => setGithubRepo(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="github-branch">Branche</label>
              <input id="github-branch" type="text" className="form-control"
                value={githubBranch} onChange={e => setGithubBranch(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="github-path">Fichier de sauvegarde</label>
              <input id="github-path" type="text" className="form-control"
                value={githubPath} onChange={e => setGithubPath(e.target.value)} />
            </div>
          </div>

          {/* Auto-sync toggle */}
          <div className="toggle-switch-container">
            <span className="switch-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RefreshCw size={14} /> Sauvegarde automatique à chaque modification
            </span>
            <label className="switch">
              <input type="checkbox" checked={githubAutoSync} onChange={e => setGithubAutoSync(e.target.checked)} />
              <span className="slider" />
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary" disabled={githubLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              {githubLoading ? <RefreshCw size={14} className="animate-spin" /> : <Shield size={14} />}
              {githubLoading ? 'Vérification...' : 'Vérifier & Enregistrer'}
            </button>
          </div>
        </form>
      </div>

      {/* ══════════════════════════════════════════════════
          2. GOOGLE CALENDAR
          ══════════════════════════════════════════════════ */}
      <div className="settings-card">
        <div>
          <h2 className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={20} /> Intégration Google Agenda
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Synchronisez vos rendez-vous avec <strong>riadh.hachicha@gmail.com</strong>.
          </p>
        </div>

        {/* Connection status */}
        <div className="sync-status-box">
          <div className={`status-indicator ${googleStatus.connected ? 'success' : 'error'}`} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>
              {googleStatus.connected 
                ? `✅ Connecté — ${googleStatus.email || 'riadh.hachicha@gmail.com'}${googleStatus.isMock ? ' (Démo)' : ''}`
                : '❌ Non connecté'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {googleStatus.connected 
                ? 'Agenda et contacts Gmail synchronisés.'
                : 'Entrez vos clés API Google ci-dessous pour vous connecter.'}
            </div>
          </div>
          <div>
            {googleStatus.connected ? (
              <button className="btn-danger-outline" onClick={onDisconnectGoogle} style={{ padding: '0.45rem 1rem' }}>
                Déconnecter
              </button>
            ) : (
              <button className="btn-primary" onClick={() => onConnectGoogle(clientId, apiKey)} style={{ padding: '0.45rem 1rem' }}>
                Se connecter
              </button>
            )}
          </div>
        </div>

        {/* Credentials form */}
        <form onSubmit={handleSaveGoogle} style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Key size={14} /> Clés API Google Cloud
          </h3>

          {!clientId && (
            <div style={{ display: 'flex', gap: '8px', padding: '0.65rem', borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.8rem', marginBottom: '1rem', alignItems: 'flex-start' }}>
              <HelpCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                <strong>Mode Démo :</strong> Sans clés, l'app simule la synchro avec des événements fictifs.
                Pour la vraie connexion, créez un projet sur{' '}
                <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer"
                  style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                  console.cloud.google.com
                </a>
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div className="form-group" style={{ flexGrow: 1, minWidth: '240px', marginBottom: 0 }}>
              <label htmlFor="clientId">Client ID OAuth 2.0</label>
              <input 
                id="clientId" type="text" className="form-control"
                placeholder="123456-abcdef.apps.googleusercontent.com"
                value={clientId} onChange={(e) => setClientId(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ flexGrow: 1, minWidth: '240px', marginBottom: 0 }}>
              <label htmlFor="apiKey">Clé d'API</label>
              <input 
                id="apiKey" type="text" className="form-control"
                placeholder="AIzaSyA123456789..."
                value={apiKey} onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {googleSaved ? '✅ Enregistré !' : 'Sauvegarder les clés'}
            </button>
          </div>
        </form>
      </div>

      {/* ══════════════════════════════════════════════════
          3. JOURNAL DES SYNC
          ══════════════════════════════════════════════════ */}
      <div className="settings-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
              <FileText size={20} /> Journal des synchronisations
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Historique des imports, exports et connexions Google Calendar.
            </p>
          </div>
          <button className="btn-icon" onClick={onRefreshLogs} title="Actualiser">
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="sync-logs-list">
          {syncLogs.length > 0 ? (
            syncLogs.map(log => {
              const isSuccess = log.status === 'success'
              return (
                <div key={log.id} className={`sync-log-row ${isSuccess ? 'success' : 'error'}`}>
                  <div>
                    <strong style={{ marginRight: '6px' }}>[{log.operation.toUpperCase()}]</strong>
                    <span>{log.details}</span>
                    {log.error_message && (
                      <div style={{ fontSize: '0.75rem', marginTop: '2px', opacity: 0.8 }}>
                        Erreur : {log.error_message}
                      </div>
                    )}
                  </div>
                  <div style={{ whiteSpace: 'nowrap', fontSize: '0.75rem', opacity: 0.8, alignSelf: 'flex-start' }}>
                    {formatLogTime(log.sync_time)}
                  </div>
                </div>
              )
            })
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Aucun journal disponible.
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
