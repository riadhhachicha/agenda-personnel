import React, { useState, useEffect } from 'react'
import { 
  Calendar, 
  ListTodo, 
  Settings as SettingsIcon, 
  Bell, 
  Sparkles,
  Phone,
  CalendarDays,
  CheckSquare,
  AlertOctagon,
  X,
  Volume2
} from 'lucide-react'
import WeeklyDashboard from './components/WeeklyDashboard'
import ItemFormModal from './components/ItemFormModal'
import ListView from './components/ListView'
import ColorSettings from './components/ColorSettings'
import GoogleCalendarSettings from './components/GoogleCalendarSettings'
import NotificationCenter from './components/NotificationCenter'

import { 
  getItems, 
  saveItem, 
  deleteItem, 
  getColorSettings, 
  saveColorSettings, 
  getReminderSettings, 
  saveReminderSettings, 
  getSyncLogs, 
  addSyncLog,
  updateCssVariables
} from './db/db'

import { 
  connectGoogleCalendar, 
  disconnectGoogleCalendar, 
  importGoogleEvents, 
  exportItemToGoogle,
  getAccessToken
} from './services/googleCalendar'

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard', 'list', 'settings'
  const [settingsSubTab, setSettingsSubTab] = useState('colors') // 'colors', 'google', 'notifications'

  // Application Data States
  const [items, setItems] = useState([])
  const [colors, setColors] = useState({
    task: '#E0E7FF', task_text: '#4338CA',
    appointment: '#D1FAE5', appointment_text: '#065F46',
    event: '#FEF3C7', event_text: '#92400E',
    call: '#FFE4E6', call_text: '#9F1239'
  })
  const [reminderSettings, setReminderSettings] = useState({
    default_reminder_offset: 15,
    sound_active: true,
    browser_notifications: false
  })
  const [syncLogs, setSyncLogs] = useState([])

  // Dashboard Filters & Date
  const [activeDate, setActiveDate] = useState(new Date())
  const [filters, setFilters] = useState({ task: true, appointment: true, event: true, call: true })
  const [searchQuery, setSearchQuery] = useState('')

  // Modal control
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [defaultModalDate, setDefaultModalDate] = useState('')

  // Syncing states
  const [syncingGcal, setSyncingGcal] = useState(false)
  const [googleConfig, setGoogleConfig] = useState({
    clientId: localStorage.getItem('gcal_client_id') || '',
    apiKey: localStorage.getItem('gcal_api_key') || ''
  })
  const [googleStatus, setGoogleStatus] = useState({
    connected: false,
    error: null,
    token: null,
    isMock: false,
    email: ''
  })

  // Alert Center
  const [activeAlert, setActiveAlert] = useState(null)
  const [dismissedReminders, setDismissedReminders] = useState([])

  // ==========================================
  // INITIAL LOADING
  // ==========================================
  useEffect(() => {
    async function loadData() {
      // 1. Load color settings
      const dbColors = await getColorSettings()
      setColors(dbColors)
      updateCssVariables(dbColors)

      // 2. Load reminder settings
      const dbReminders = await getReminderSettings()
      setReminderSettings(dbReminders)

      // 3. Load items
      const dbItems = await getItems()
      setItems(dbItems)

      // 4. Load sync logs
      const dbLogs = await getSyncLogs()
      setSyncLogs(dbLogs)

      // 5. Restore google token status if valid
      const gcalToken = localStorage.getItem('gcal_token')
      if (gcalToken) {
        try {
          const authData = JSON.parse(gcalToken)
          if (authData.expires_at > Date.now()) {
            setGoogleStatus({
              connected: true,
              error: null,
              token: authData.access_token,
              isMock: authData.access_token.startsWith('mock-token-'),
              email: authData.email || 'riadh.hachicha@gmail.com'
            })
          }
        } catch (e) {
          console.error('Error reading google credentials', e)
        }
      }
    }
    loadData()
  }, [])

  // ==========================================
  // PERIODIC REMINDER ENGINE (POLLING)
  // ==========================================
  useEffect(() => {
    const checkRemindersInterval = setInterval(() => {
      const nowMs = Date.now()
      
      items.forEach(item => {
        // Skip completed/cancelled or inactive reminders
        if (
          !item.reminder_active || 
          !item.reminder_time || 
          item.status === 'completed' || 
          item.status === 'cancelled'
        ) return

        const reminderTimeMs = new Date(item.reminder_time).getTime()
        
        // Trigger if time is reached, but not older than 2 minutes (avoid triggering expired history)
        const isTime = nowMs >= reminderTimeMs && nowMs < (reminderTimeMs + 120000)
        const isAlreadyDismissed = dismissedReminders.includes(item.id)
        const isCurrentlyShowing = activeAlert && activeAlert.id === item.id

        if (isTime && !isAlreadyDismissed && !isCurrentlyShowing) {
          triggerReminder(item)
        }
      })
    }, 15000) // check every 15 seconds

    return () => clearInterval(checkRemindersInterval)
  }, [items, reminderSettings, dismissedReminders, activeAlert])

  const triggerReminder = (item) => {
    // 1. Play Sound
    if (reminderSettings.sound_active) {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
        const osc = audioCtx.createOscillator()
        const gain = audioCtx.createGain()
        osc.connect(gain)
        gain.connect(audioCtx.destination)
        
        osc.type = 'sine'
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime) // E5
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime)
        
        osc.start()
        setTimeout(() => osc.frequency.setValueAtTime(880, audioCtx.currentTime), 120) // A5
        setTimeout(() => osc.stop(), 300)
      } catch (e) {
        console.warn('Audio play failure:', e)
      }
    }

    // 2. Desktop Push Notification
    if (
      reminderSettings.browser_notifications && 
      'Notification' in window && 
      Notification.permission === 'granted'
    ) {
      try {
        new Notification(`Rappel: ${item.title}`, {
          body: `${item.start_time} - ${item.description || 'Pas de description'}`,
          tag: item.id
        })
      } catch (e) {
        console.warn('Push notification failure:', e)
      }
    }

    // 3. Show In-App Banner Modal
    setActiveAlert(item)
  }

  const handleDismissReminder = (itemId) => {
    setDismissedReminders(prev => [...prev, itemId])
    setActiveAlert(null)
  }

  // ==========================================
  // FRONTEND CRUD ACTIONS
  // ==========================================
  const handleSaveItem = async (savedData) => {
    const saved = await saveItem(savedData)
    
    // Refresh items state
    const updatedItems = await getItems()
    setItems(updatedItems)
    setShowFormModal(false)
    setEditingItem(null)

    // Trigger google export auto if item is modified/created and google is connected
    if (googleStatus.connected && (saved.type === 'appointment' || saved.type === 'event')) {
      try {
        await exportItemToGoogle(saved, googleConfig.clientId, googleConfig.apiKey)
        const refreshed = await getItems()
        setItems(refreshed)
      } catch (e) {
        console.error('Auto google sync failed', e)
      }
    }
  }

  const handleDeleteItem = async (id) => {
    await deleteItem(id)
    const updatedItems = await getItems()
    setItems(updatedItems)
    setShowFormModal(false)
    setEditingItem(null)
  }

  const handleToggleComplete = async (item) => {
    const updated = {
      ...item,
      status: item.status === 'completed' ? 'todo' : 'completed'
    }
    await saveItem(updated)
    const refreshed = await getItems()
    setItems(refreshed)
  }

  const handleRescheduleItem = async (itemId, newDateString) => {
    const itemToMove = items.find(i => i.id === itemId)
    if (!itemToMove) return

    // Recalculate reminder time if active based on new date
    let reminder_time = itemToMove.reminder_time
    if (itemToMove.reminder_active && itemToMove.reminder_time && itemToMove.start_time) {
      try {
        const oldItemTime = new Date(`${itemToMove.date}T${itemToMove.start_time}:00`).getTime()
        const oldReminderTime = new Date(itemToMove.reminder_time).getTime()
        const offsetMs = oldItemTime - oldReminderTime

        const newItemTime = new Date(`${newDateString}T${itemToMove.start_time}:00`).getTime()
        reminder_time = new Date(newItemTime - offsetMs).toISOString()
      } catch (e) {
        reminder_time = null
      }
    }

    const updated = {
      ...itemToMove,
      date: newDateString,
      reminder_time
    }

    await saveItem(updated)
    const refreshed = await getItems()
    setItems(refreshed)

    // Trigger auto google export if connected
    if (googleStatus.connected && (updated.type === 'appointment' || updated.type === 'event')) {
      try {
        await exportItemToGoogle(updated, googleConfig.clientId, googleConfig.apiKey)
        const finalRefreshed = await getItems()
        setItems(finalRefreshed)
      } catch (e) {
        console.error('Auto google sync rescheduled failed', e)
      }
    }
  }

  // ==========================================
  // COLOR ACTIONS
  // ==========================================
  const handleSaveColors = async (newColors) => {
    await saveColorSettings(newColors)
    setColors(newColors)
  }

  // ==========================================
  // GOOGLE CALENDAR ACTIONS
  // ==========================================
  const handleSaveGoogleConfig = (config) => {
    localStorage.setItem('gcal_client_id', config.clientId)
    localStorage.setItem('gcal_api_key', config.apiKey)
    setGoogleConfig(config)
  }

  const handleConnectGoogle = (clientId, apiKey) => {
    connectGoogleCalendar(clientId, apiKey, async (status) => {
      setGoogleStatus(status)
      const logs = await getSyncLogs()
      setSyncLogs(logs)
    })
  }

  const handleDisconnectGoogle = async () => {
    disconnectGoogleCalendar()
    setGoogleStatus({ connected: false, error: null, token: null, isMock: false, email: '' })
    const logs = await getSyncLogs()
    setSyncLogs(logs)
  }

  const handleSyncGoogleCalendar = async () => {
    if (!googleStatus.connected) {
      alert('Veuillez d’abord connecter votre compte Google dans les paramètres.')
      return
    }

    setSyncingGcal(true)
    try {
      const stats = await importGoogleEvents(items, googleConfig.clientId, googleConfig.apiKey)
      
      // Reload everything
      const updatedItems = await getItems()
      setItems(updatedItems)
      const logs = await getSyncLogs()
      setSyncLogs(logs)

      alert(`Synchronisation terminée avec succès !\nÉléments importés : ${stats.imported}\nDoublons évités : ${stats.duplicates}`)
    } catch (error) {
      console.error(error)
      alert(`Erreur lors de la synchronisation : ${error.message}`)
    } finally {
      setSyncingGcal(false)
    }
  }

  const handleExportSingleItem = async (item) => {
    try {
      await exportItemToGoogle(item, googleConfig.clientId, googleConfig.apiKey)
      const updated = await getItems()
      setItems(updated)
      alert('Élément exporté avec succès vers Google Calendar !')
    } catch (error) {
      alert(`Erreur lors de l'exportation : ${error.message}`)
    }
  }

  const handleRefreshLogs = async () => {
    const logs = await getSyncLogs()
    setSyncLogs(logs)
  }

  // Helper to get category icons for Alert Banner
  const getAlertIcon = (type) => {
    switch (type) {
      case 'task': return <CheckSquare size={20} />
      case 'appointment': return <CalendarDays size={20} />
      case 'event': return <Sparkles size={20} />
      case 'call': return <Phone size={20} />
      default: return <Calendar size={20} />
    }
  }

  return (
    <div className="app-container">
      {/* HEADER WITH GLASSMORPHISM */}
      <header className="header-glass">
        <div className="brand">
          <Calendar size={28} />
          <h1>Mon Agenda Personnel</h1>
        </div>

        {/* Global tab routing */}
        <nav className="nav-menu">
          <button 
            className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <Calendar size={16} /> Semaine
          </button>
          <button 
            className={`nav-link ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            <ListTodo size={16} /> Liste Complète
          </button>
          <button 
            className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <SettingsIcon size={16} /> Paramètres
          </button>
        </nav>

        <div className="header-actions">
          {/* Quick status bar */}
          <div style={{ display: 'flex', gap: '10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className={`status-indicator ${googleStatus.connected ? 'success' : 'error'}`} style={{ width: '8px', height: '8px' }}></span>
              Google Calendar
            </span>
          </div>
        </div>
      </header>

      {/* RENDER ACTIVE TAB */}
      <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'dashboard' && (
          <WeeklyDashboard 
            items={items}
            activeDate={activeDate}
            setActiveDate={setActiveDate}
            onAddItem={(dayDate) => {
              setDefaultModalDate(dayDate)
              setEditingItem(null)
              setShowFormModal(true)
            }}
            onEditItem={(item) => {
              setEditingItem(item)
              setShowFormModal(true)
            }}
            onToggleComplete={handleToggleComplete}
            onSyncGoogleCalendar={handleSyncGoogleCalendar}
            syncing={syncingGcal}
            filters={filters}
            setFilters={setFilters}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onRescheduleItem={handleRescheduleItem}
          />
        )}

        {activeTab === 'list' && (
          <ListView 
            items={items}
            onEditItem={(item) => {
              setEditingItem(item)
              setShowFormModal(true)
            }}
          />
        )}

        {activeTab === 'settings' && (
          <div className="settings-layout">
            <aside className="settings-sidebar">
              <button 
                className={`settings-tab ${settingsSubTab === 'colors' ? 'active' : ''}`}
                onClick={() => setSettingsSubTab('colors')}
              >
                🎨 Couleurs des catégories
              </button>
              <button 
                className={`settings-tab ${settingsSubTab === 'google' ? 'active' : ''}`}
                onClick={() => setSettingsSubTab('google')}
              >
                📅 Google Calendar & Supabase
              </button>
              <button 
                className={`settings-tab ${settingsSubTab === 'notifications' ? 'active' : ''}`}
                onClick={() => setSettingsSubTab('notifications')}
              >
                🔔 Rappels & Alertes
              </button>
            </aside>

            <section style={{ flexGrow: 1 }}>
              {settingsSubTab === 'colors' && (
                <ColorSettings 
                  colors={colors}
                  onSaveColors={handleSaveColors}
                />
              )}
              {settingsSubTab === 'google' && (
                <GoogleCalendarSettings 
                  googleConfig={googleConfig}
                  onSaveGoogleConfig={handleSaveGoogleConfig}
                  googleStatus={googleStatus}
                  onConnectGoogle={handleConnectGoogle}
                  onDisconnectGoogle={handleDisconnectGoogle}
                  syncLogs={syncLogs}
                  onRefreshLogs={handleRefreshLogs}
                />
              )}
              {settingsSubTab === 'notifications' && (
                <NotificationCenter 
                  items={items}
                  reminderSettings={reminderSettings}
                  onSaveReminderSettings={async (settings) => {
                    await saveReminderSettings(settings)
                    setReminderSettings(settings)
                  }}
                />
              )}
            </section>
          </div>
        )}
      </main>

      {/* FORM MODAL (ADD / MODIFY) */}
      {showFormModal && (
        <ItemFormModal 
          item={editingItem}
          defaultDate={defaultModalDate}
          googleConnected={googleStatus.connected}
          onClose={() => {
            setShowFormModal(false)
            setEditingItem(null)
          }}
          onSave={handleSaveItem}
          onDelete={handleDeleteItem}
          onExportToGoogle={handleExportSingleItem}
        />
      )}

      {/* REAL-TIME ALARM BANNER (MODAL OVERLAY) */}
      {activeAlert && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '420px', border: '2px solid var(--primary)' }}>
            <div className="modal-header" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell className="animate-bounce" size={20} />
                RAPPEL IMPORTANT !
              </h2>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'center', padding: '2rem 1.5rem' }}>
              <div style={{ display: 'inline-flex', alignSelf: 'center', padding: '1rem', borderRadius: '50%', background: 'var(--bg-app)', border: '1px solid var(--border-light)' }}>
                {getAlertIcon(activeAlert.type)}
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{activeAlert.title}</h3>
              
              {activeAlert.description && (
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{activeAlert.description}</p>
              )}

              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--primary)', background: 'var(--primary-light)', padding: '0.5rem', borderRadius: '6px' }}>
                Heure de début : {activeAlert.start_time}
              </div>

              {activeAlert.priority === 'urgent' && (
                <div style={{ display: 'inline-flex', alignSelf: 'center', alignItems: 'center', gap: '4px', background: 'var(--accent-urgent-bg)', color: 'var(--accent-urgent-text)', padding: '0.25rem 0.60rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                  <AlertOctagon size={12} /> ÉLÉMENT URGENT
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button 
                type="button" 
                className="btn-primary" 
                onClick={() => handleDismissReminder(activeAlert.id)}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Acquitter le rappel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
