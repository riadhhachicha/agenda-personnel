import React, { useState } from 'react'
import { 
  Bell, 
  Volume2, 
  VolumeX, 
  Settings, 
  Check, 
  ShieldAlert,
  Send,
  Calendar,
  AlertTriangle
} from 'lucide-react'

export default function NotificationCenter({ 
  items, 
  reminderSettings, 
  onSaveReminderSettings 
}) {
  const [soundActive, setSoundActive] = useState(reminderSettings.sound_active ?? true)
  const [browserActive, setBrowserActive] = useState(reminderSettings.browser_notifications ?? false)
  const [offset, setOffset] = useState(reminderSettings.default_reminder_offset ?? 15)
  const [saved, setSaved] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState(
    'Notification' in window ? Notification.permission : 'unsupported'
  )

  const handleSave = () => {
    onSaveReminderSettings({
      default_reminder_offset: Number(offset),
      sound_active: soundActive,
      browser_notifications: browserActive
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const requestBrowserPermission = async () => {
    if (!('Notification' in window)) {
      alert("Votre navigateur ne prend pas en charge les notifications de bureau.")
      return
    }
    
    try {
      const permission = await Notification.requestPermission()
      setPermissionStatus(permission)
      if (permission === 'granted') {
        setBrowserActive(true)
      } else {
        setBrowserActive(false)
      }
    } catch (e) {
      console.error('Error requesting permission', e)
    }
  }

  // Trigger a test notification immediately
  const triggerTestNotification = () => {
    // 1. Audio sound if enabled
    if (soundActive) {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
        const oscillator = audioCtx.createOscillator()
        const gainNode = audioCtx.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioCtx.destination)
        
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime) // D5 note
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime)
        
        oscillator.start()
        
        setTimeout(() => {
          oscillator.frequency.setValueAtTime(880, audioCtx.currentTime) // A5 note
        }, 120)
        
        setTimeout(() => {
          oscillator.stop()
        }, 300)
      } catch (e) {
        console.warn('Audio play failed', e)
      }
    }

    // 2. Browser visual notification if enabled & granted
    if (browserActive && permissionStatus === 'granted') {
      try {
        new Notification("Agenda Personnel - Notification de Test", {
          body: "Ceci est une notification de test pour valider le bon fonctionnement de vos rappels !",
          icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234338CA' stroke-width='2'%3E%3Cpath d='M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9'%3E%3C/path%3E%3Cpath d='M13.73 21a2 2 0 0 1-3.46 0'%3E%3C/path%3E%3C/svg%3E"
        })
      } catch (e) {
        console.warn('Browser notification failed', e)
        alert('Notification envoyée (simulée via alert car échec API) : Rappel actif !')
      }
    } else {
      // In-app backup
      alert('🔔 Rappel Actif (Notification de test in-app sans push)')
    }
  }

  // Extract upcoming active reminders
  const upcomingReminders = items
    .filter(item => item.reminder_active && item.status !== 'completed' && item.status !== 'cancelled')
    .filter(item => {
      if (!item.reminder_time) return false
      return new Date(item.reminder_time).getTime() > Date.now()
    })
    .sort((a, b) => new Date(a.reminder_time).getTime() - new Date(b.reminder_time).getTime())
    .slice(0, 10) // Limit to 10

  const getTypeLabel = (type) => {
    switch (type) {
      case 'task': return 'Tâche'
      case 'appointment': return 'RDV'
      case 'event': return 'Événement'
      case 'call': return 'Appel'
      default: return type
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
      
      {/* NOTIFICATION SETTINGS */}
      <div className="settings-card">
        <div>
          <h2 className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={20} /> Paramètres de notification
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Configurez la façon dont vous souhaitez recevoir les rappels de vos tâches, appels et rendez-vous importants.
          </p>
        </div>

        {/* Browser Permission Panel */}
        <div style={{ background: 'var(--bg-app)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Autorisation Navigateur</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: permissionStatus === 'granted' ? '#10b981' : '#f59e0b' }}>
              {permissionStatus === 'granted' ? 'Autorisé' : permissionStatus === 'denied' ? 'Refusé' : 'Non configuré'}
            </span>
          </div>
          {permissionStatus !== 'granted' && (
            <button 
              type="button" 
              className="btn-primary" 
              onClick={requestBrowserPermission}
              style={{ fontSize: '0.8rem', alignSelf: 'flex-start', padding: '0.45rem 0.75rem' }}
            >
              Demander l'autorisation push
            </button>
          )}
        </div>

        {/* Toggle Sound */}
        <div className="toggle-switch-container" style={{ marginBottom: 0 }}>
          <span className="switch-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {soundActive ? <Volume2 size={16} /> : <VolumeX size={16} />}
            Activer l'alerte sonore
          </span>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={soundActive} 
              onChange={(e) => setSoundActive(e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>

        {/* Toggle Browser Notifications */}
        <div className="toggle-switch-container" style={{ marginBottom: 0 }}>
          <span className="switch-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={16} />
            Activer les notifications système (Push)
          </span>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={browserActive} 
              disabled={permissionStatus !== 'granted'}
              onChange={(e) => setBrowserActive(e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>

        {/* Default offset */}
        <div className="form-group">
          <label htmlFor="default_offset">Délai de rappel par défaut</label>
          <select 
            id="default_offset"
            className="form-control"
            value={offset}
            onChange={(e) => setOffset(Number(e.target.value))}
            style={{ background: 'white' }}
          >
            <option value="5">5 minutes avant</option>
            <option value="15">15 minutes avant</option>
            <option value="30">30 minutes avant</option>
            <option value="60">1 heure avant</option>
            <option value="1440">1 jour avant</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: '1rem', marginTop: '0.5rem' }}>
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={triggerTestNotification}
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Send size={14} /> Envoyer un test
          </button>
          
          <button 
            type="button" 
            className="btn-primary" 
            onClick={handleSave}
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            {saved ? <Check size={16} /> : <Bell size={16} />}
            {saved ? 'Enregistré !' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {/* UPCOMING REMINDERS LIST */}
      <div className="settings-card">
        <div>
          <h2 className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={20} /> Rappels planifiés
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Liste ordonnée de vos alertes à venir pour les prochains jours.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flexGrow: 1, overflowY: 'auto', maxHeight: '380px' }}>
          {upcomingReminders.length > 0 ? (
            upcomingReminders.map(item => (
              <div 
                key={item.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem', 
                  padding: '0.75rem', 
                  borderRadius: '10px', 
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-app)' 
                }}
              >
                <div 
                  style={{ 
                    padding: '0.4rem', 
                    borderRadius: '8px', 
                    background: item.priority === 'urgent' ? 'var(--accent-urgent-bg)' : 'var(--primary-light)',
                    color: item.priority === 'urgent' ? 'var(--accent-urgent-text)' : 'var(--primary)'
                  }}
                >
                  <Bell size={16} />
                </div>
                <div style={{ flexGrow: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>
                    {item.title} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>({getTypeLabel(item.type)})</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Événement : {new Date(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à {item.start_time}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.75rem', alignSelf: 'flex-start' }}>
                  <div style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Rappel à :</div>
                  <div style={{ color: 'var(--text-muted)' }}>
                    {new Date(item.reminder_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-light)', padding: '3rem 0', gap: '0.5rem' }}>
              <Calendar size={32} strokeWidth={1.5} />
              <span style={{ fontSize: '0.85rem' }}>Aucun rappel planifié pour le moment</span>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
