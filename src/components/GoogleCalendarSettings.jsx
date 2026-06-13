import React, { useState, useEffect } from 'react'
import { 
  Calendar, 
  Database, 
  Key, 
  User, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  HelpCircle,
  FileText,
  AlertTriangle
} from 'lucide-react'
import { getSupabaseStatus, initSupabase, syncLocalToRemote } from '../db/db'

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

  // Supabase config state
  const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem('supabase_url') || '')
  const [supabaseKey, setSupabaseKey] = useState(localStorage.getItem('supabase_key') || '')
  const [supabaseSaved, setSupabaseSaved] = useState(false)
  const [supabaseStatus, setSupabaseStatusState] = useState(getSupabaseStatus())
  const [syncStatusMsg, setSyncStatusMsg] = useState('')
  const [syncingDb, setSyncingDb] = useState(false)

  useEffect(() => {
    setSupabaseStatusState(getSupabaseStatus())
  }, [])

  const handleSaveGoogle = (e) => {
    e.preventDefault()
    onSaveGoogleConfig({ clientId: clientId.trim(), apiKey: apiKey.trim() })
    setGoogleSaved(true)
    setTimeout(() => setGoogleSaved(false), 3000)
  }

  const handleSaveSupabase = (e) => {
    e.preventDefault()
    const url = supabaseUrl.trim()
    const key = supabaseKey.trim()
    
    if (url && key) {
      localStorage.setItem('supabase_url', url)
      localStorage.setItem('supabase_key', key)
      const success = initSupabase(url, key)
      if (success) {
        setSyncStatusMsg('Client Supabase connecté !')
      } else {
        setSyncStatusMsg('Erreur d’initialisation Supabase.')
      }
    } else {
      localStorage.removeItem('supabase_url')
      localStorage.removeItem('supabase_key')
      initSupabase(null, null)
      setSyncStatusMsg('Identifiants Supabase supprimés. Mode LocalStorage activé.')
    }

    setSupabaseStatusState(getSupabaseStatus())
    setSupabaseSaved(true)
    setTimeout(() => {
      setSupabaseSaved(false)
      setSyncStatusMsg('')
    }, 4000)
  }

  const handleSyncLocalData = async () => {
    setSyncingDb(true)
    setSyncStatusMsg('Synchronisation des données en cours...')
    try {
      const result = await syncLocalToRemote()
      setSyncStatusMsg(result.message)
    } catch (error) {
      setSyncStatusMsg('Erreur de synchronisation : ' + error.message)
    } finally {
      setSyncingDb(false)
      setTimeout(() => setSyncStatusMsg(''), 6000)
    }
  }

  const formatLogTime = (isoString) => {
    try {
      return new Date(isoString).toLocaleString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } catch (e) {
      return isoString
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* GOOGLE CALENDAR CONFIG */}
      <div className="settings-card">
        <div>
          <h2 className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={20} /> Intégration Google Agenda
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Synchronisez vos rendez-vous avec le compte <strong>riadh.hachicha@gmail.com</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          {/* Status Box */}
          <div className="sync-status-box" style={{ flexGrow: 1, minWidth: '280px' }}>
            <div className={`status-indicator ${googleStatus.connected ? 'success' : 'error'}`}></div>
            <div>
              <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                {googleStatus.connected ? 'Connecté à Google Calendar' : 'Non connecté'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {googleStatus.connected 
                  ? `Compte : ${googleStatus.email || 'riadh.hachicha@gmail.com'} ${googleStatus.isMock ? '(Simulé)' : ''}`
                  : 'Veuillez configurer vos clés ou vous connecter en mode démo.'}
              </div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
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
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSaveGoogle} style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Key size={14} /> Clés d'API Google Cloud (Optionnel pour Démo)
          </h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div className="form-group" style={{ flexGrow: 1, minWidth: '240px', marginBottom: 0 }}>
              <label htmlFor="clientId">Client ID Google *</label>
              <input 
                id="clientId"
                type="text" 
                className="form-control" 
                placeholder="Ex: 123456-abcdef.apps.googleusercontent.com"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ flexGrow: 1, minWidth: '240px', marginBottom: 0 }}>
              <label htmlFor="apiKey">Clé d'API Google *</label>
              <input 
                id="apiKey"
                type="text" 
                className="form-control" 
                placeholder="Ex: AIzaSyA123456789..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
          </div>

          {!clientId && (
            <div style={{ display: 'flex', gap: '8px', padding: '0.65rem', borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.8rem', marginBottom: '1rem', alignItems: 'flex-start' }}>
              <HelpCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                <strong>Mode Démo Actif :</strong> Si vous laissez les clés vides et cliquez sur <strong>"Se connecter"</strong>, l'application simulera la synchronisation Google avec des événements de test réalistes.
              </span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {googleSaved ? 'Enregistré !' : 'Sauvegarder les clés'}
            </button>
          </div>
        </form>
      </div>

      {/* SUPABASE CONFIG */}
      <div className="settings-card">
        <div>
          <h2 className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={20} /> Configuration de la Base de Données Supabase
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Sauvegardez durablement vos données sur votre propre projet Supabase au lieu du stockage local du navigateur.
          </p>
        </div>

        <div className="sync-status-box">
          <div className={`status-indicator ${supabaseStatus.active ? 'success' : 'warning'}`}></div>
          <div>
            <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>
              {supabaseStatus.active ? 'Supabase Actif' : 'Stockage Local Uniquement'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {supabaseStatus.active 
                ? 'Les modifications sont synchronisées en temps réel sur Supabase.' 
                : 'Les données sont sauvegardées uniquement dans le stockage local de votre navigateur.'}
            </div>
          </div>
          {supabaseStatus.active && (
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={handleSyncLocalData}
              disabled={syncingDb}
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <RefreshCw size={14} className={syncingDb ? 'animate-spin' : ''} />
              Transférer le Local vers Supabase
            </button>
          )}
        </div>

        <form onSubmit={handleSaveSupabase} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flexGrow: 1, minWidth: '240px', marginBottom: 0 }}>
              <label htmlFor="supabaseUrl">Supabase URL</label>
              <input 
                id="supabaseUrl"
                type="text" 
                className="form-control" 
                placeholder="Ex: https://xyz.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ flexGrow: 1, minWidth: '240px', marginBottom: 0 }}>
              <label htmlFor="supabaseKey">Supabase Anon Key</label>
              <input 
                id="supabaseKey"
                type="password" 
                className="form-control" 
                placeholder="Clé anonyme de l'API..."
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
              />
            </div>
          </div>

          {syncStatusMsg && (
            <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '600' }}>
              {syncStatusMsg}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
              <span>N'oubliez pas d'exécuter le script SQL fourni dans votre éditeur Supabase.</span>
            </div>
            
            <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {supabaseSaved ? 'Sauvegardé !' : 'Enregistrer la configuration'}
            </button>
          </div>
        </form>
      </div>

      {/* SYNC LOGS TABLE */}
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
          <button className="btn-icon" onClick={onRefreshLogs} title="Actualiser le journal">
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
              Aucun journal de synchronisation disponible.
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
