import { createClient } from '@supabase/supabase-js'

// Cache for supabase client
let supabase = null
let isSupabaseConfigured = false

// Initial default settings
const DEFAULT_COLORS = {
  achats_divers: '#E0E7FF',
  achats_divers_text: '#3730A3',
  achats_mp: '#D1FAE5',
  achats_mp_text: '#065F46',
  client: '#FEF3C7',
  client_text: '#92400E',
  rendezvous: '#FCE7F3',
  rendezvous_text: '#9D174D',
  tache_administrative: '#F3F4F6',
  tache_administrative_text: '#374151',
  tache_usine: '#CFFAFE',
  tache_usine_text: '#0891B2',
  call: '#FFE4E6',
  call_text: '#9F1239'
}

const DEFAULT_REMINDERS = {
  default_reminder_offset: 15,
  sound_active: true,
  browser_notifications: false
}

// Check configuration and initialize Supabase client
export const initSupabase = (url, key) => {
  if (!url || !key) {
    supabase = null
    isSupabaseConfigured = false
    return false
  }
  try {
    supabase = createClient(url, key)
    isSupabaseConfigured = true
    return true
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error)
    supabase = null
    isSupabaseConfigured = false
    return false
  }
}

// Auto-init on load if keys exist in localStorage
const savedUrl = localStorage.getItem('supabase_url')
const savedKey = localStorage.getItem('supabase_key')
if (savedUrl && savedKey) {
  initSupabase(savedUrl, savedKey)
}

export const getSupabaseStatus = () => {
  return {
    configured: isSupabaseConfigured,
    active: supabase !== null
  }
}

// Helper to generate UUIDs locally
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// ==========================================
// AGENDA ITEMS
// ==========================================

export const getItems = async () => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('agenda_items')
        .select('*')
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.warn('Supabase fetch failed, falling back to localStorage:', error)
    }
  }

  // Fallback to LocalStorage
  const items = localStorage.getItem('agenda_items')
  return items ? JSON.parse(items) : []
}

export const saveItem = async (item) => {
  const isNew = !item.id
  const finalItem = {
    ...item,
    id: item.id || generateUUID(),
    updated_at: new Date().toISOString()
  }

  if (isNew) {
    finalItem.created_at = new Date().toISOString()
  }

  // Save to LocalStorage cache
  const localItems = localStorage.getItem('agenda_items') ? JSON.parse(localStorage.getItem('agenda_items')) : []
  let updatedLocalItems
  if (isNew) {
    updatedLocalItems = [...localItems, finalItem]
  } else {
    updatedLocalItems = localItems.map(i => i.id === finalItem.id ? finalItem : i)
  }
  localStorage.setItem('agenda_items', JSON.stringify(updatedLocalItems))

  if (supabase) {
    try {
      const { error } = await supabase
        .from('agenda_items')
        .upsert(finalItem)
      
      if (error) throw error
    } catch (error) {
      console.error('Failed to sync item to Supabase:', error)
    }
  }

  // Auto-sync to GitHub if enabled (async, non-blocking)
  if (localStorage.getItem('github_auto_sync') === 'true' && localStorage.getItem('github_pat')) {
    try {
      const { pushToGithub } = await import('../services/githubSync')
      const allItems = localStorage.getItem('agenda_items') ? JSON.parse(localStorage.getItem('agenda_items')) : []
      pushToGithub(allItems).catch(e => console.warn('GitHub auto-sync failed:', e.message))
    } catch (e) {
      console.warn('GitHub auto-sync import failed:', e.message)
    }
  }

  return finalItem
}

export const deleteItem = async (id) => {
  // LocalStorage delete
  const localItems = localStorage.getItem('agenda_items') ? JSON.parse(localStorage.getItem('agenda_items')) : []
  const updatedLocalItems = localItems.filter(i => i.id !== id)
  localStorage.setItem('agenda_items', JSON.stringify(updatedLocalItems))

  if (supabase) {
    try {
      const { error } = await supabase
        .from('agenda_items')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    } catch (error) {
      console.error('Failed to delete item from Supabase:', error)
    }
  }

  return id
}

// ==========================================
// COLOR SETTINGS
// ==========================================

export const getColorSettings = async () => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('color_settings')
        .select('*')
        .limit(1)
        .maybeSingle()
      
      if (error) throw error
      if (data) {
        return {
          task: data.task_color,
          task_text: data.task_text_color,
          appointment: data.appointment_color,
          appointment_text: data.appointment_text_color,
          event: data.event_color,
          event_text: data.event_text_color,
          call: data.call_color,
          call_text: data.call_text_color
        }
      }
    } catch (error) {
      console.warn('Supabase fetch for colors failed, falling back to localStorage:', error)
    }
  }

  const colors = localStorage.getItem('color_settings')
  return colors ? JSON.parse(colors) : DEFAULT_COLORS
}

export const saveColorSettings = async (colors) => {
  localStorage.setItem('color_settings', JSON.stringify(colors))

  if (supabase) {
    try {
      // Map to supabase structure
      const dbColors = {
        task_color: colors.task,
        task_text_color: colors.task_text,
        appointment_color: colors.appointment,
        appointment_text_color: colors.appointment_text,
        event_color: colors.event,
        event_text_color: colors.event_text,
        call_color: colors.call,
        call_text_color: colors.call_text,
        updated_at: new Date().toISOString()
      }

      // Check if row exists
      const { data: existing } = await supabase
        .from('color_settings')
        .select('id')
        .limit(1)
        .maybeSingle()

      if (existing) {
        dbColors.id = existing.id
      } else {
        dbColors.id = generateUUID()
      }

      const { error } = await supabase
        .from('color_settings')
        .upsert(dbColors)
      
      if (error) throw error
    } catch (error) {
      console.error('Failed to sync colors to Supabase:', error)
    }
  }

  // Update dynamic CSS variables
  updateCssVariables(colors)
  return colors
}

// Update CSS Variables dynamically
export const updateCssVariables = (colors) => {
  const root = document.documentElement
  Object.keys(colors).forEach(key => {
    // e.g. --color-task, --color-task-text
    const varName = `--color-${key.replace('_', '-')}`
    root.style.setProperty(varName, colors[key])
  })
}

// ==========================================
// REMINDER SETTINGS
// ==========================================

export const getReminderSettings = async () => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('reminder_settings')
        .select('*')
        .limit(1)
        .maybeSingle()
      
      if (error) throw error
      if (data) return data
    } catch (error) {
      console.warn('Supabase fetch for reminders failed, falling back to localStorage:', error)
    }
  }

  const reminders = localStorage.getItem('reminder_settings')
  return reminders ? JSON.parse(reminders) : DEFAULT_REMINDERS
}

export const saveReminderSettings = async (settings) => {
  localStorage.setItem('reminder_settings', JSON.stringify(settings))

  if (supabase) {
    try {
      // Check if row exists
      const { data: existing } = await supabase
        .from('reminder_settings')
        .select('id')
        .limit(1)
        .maybeSingle()

      const dbSettings = {
        ...settings,
        id: existing ? existing.id : generateUUID()
      }

      const { error } = await supabase
        .from('reminder_settings')
        .upsert(dbSettings)
      
      if (error) throw error
    } catch (error) {
      console.error('Failed to sync reminders to Supabase:', error)
    }
  }

  return settings
}

// ==========================================
// SYNC LOGS
// ==========================================

export const getSyncLogs = async () => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('google_calendar_sync_logs')
        .select('*')
        .order('sync_time', { ascending: false })
        .limit(50)
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.warn('Supabase fetch for sync logs failed, falling back to localStorage:', error)
    }
  }

  const logs = localStorage.getItem('sync_logs')
  return logs ? JSON.parse(logs) : []
}

export const addSyncLog = async (operation, status, details, errorMessage = '') => {
  const log = {
    id: generateUUID(),
    sync_time: new Date().toISOString(),
    operation,
    status,
    details,
    error_message: errorMessage
  }

  // Local storage
  const logs = localStorage.getItem('sync_logs') ? JSON.parse(localStorage.getItem('sync_logs')) : []
  const updatedLogs = [log, ...logs].slice(0, 50) // Keep last 50
  localStorage.setItem('sync_logs', JSON.stringify(updatedLogs))

  if (supabase) {
    try {
      const { error } = await supabase
        .from('google_calendar_sync_logs')
        .insert(log)
      
      if (error) throw error
    } catch (error) {
      console.error('Failed to log sync to Supabase:', error)
    }
  }

  return log
}

// ==========================================
// BULK DATA SYNC (LOCAL TO REMOTE)
// ==========================================

export const syncLocalToRemote = async () => {
  if (!supabase) return { success: false, message: 'Supabase n’est pas configuré.' }

  try {
    // 1. Sync Colors
    const colors = localStorage.getItem('color_settings')
    if (colors) {
      await saveColorSettings(JSON.parse(colors))
    }

    // 2. Sync Reminders
    const reminders = localStorage.getItem('reminder_settings')
    if (reminders) {
      await saveReminderSettings(JSON.parse(reminders))
    }

    // 3. Sync Items
    const items = localStorage.getItem('agenda_items') ? JSON.parse(localStorage.getItem('agenda_items')) : []
    if (items.length > 0) {
      const { error } = await supabase
        .from('agenda_items')
        .upsert(items)
      
      if (error) throw error
    }

    // 4. Sync Logs
    const logs = localStorage.getItem('sync_logs') ? JSON.parse(localStorage.getItem('sync_logs')) : []
    if (logs.length > 0) {
      const { error } = await supabase
        .from('google_calendar_sync_logs')
        .upsert(logs)
      
      if (error) throw error
    }

    return { success: true, message: 'Synchronisation locale vers Supabase réussie !' }
  } catch (error) {
    console.error('Bulk sync failed:', error)
    return { success: false, message: error.message || 'Erreur lors de la synchronisation.' }
  }
}
