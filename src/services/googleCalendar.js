import { addSyncLog, saveItem } from '../db/db'

let tokenClient = null
let gapiInited = false
let gisInited = false

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
].join(' ')


// Load GIS script dynamically if needed (already loaded in index.html, but let's double check)
export const initGoogleClient = (clientId, apiKey, onStatusChange) => {
  if (!clientId) {
    console.warn('No Google Client ID provided, running in Simulated Mode.')
    return false
  }

  try {
    // GIS initialization
    if (window.google && window.google.accounts) {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: (tokenResponse) => {
          if (tokenResponse.error !== undefined) {
            console.error('GIS Error:', tokenResponse)
            addSyncLog('OAuth2', 'error', 'Erreur d’authentification Google', tokenResponse.error)
            onStatusChange({ connected: false, error: tokenResponse.error, token: null })
            return
          }
          
          // Successful auth
          const expiresAt = Date.now() + (tokenResponse.expires_in * 1000)
          const authData = {
            access_token: tokenResponse.access_token,
            expires_at: expiresAt,
            email: 'riadh.hachicha@gmail.com' // Forced or retrieved from profile
          }
          localStorage.setItem('gcal_token', JSON.stringify(authData))
          addSyncLog('OAuth2', 'success', 'Connexion Google Calendar établie pour riadh.hachicha@gmail.com')
          onStatusChange({ connected: true, error: null, token: tokenResponse.access_token })
        },
      })
      return true
    }
  } catch (error) {
    console.error('Error initializing Google GIS:', error)
    return false
  }
  return false
}

// Get access token (check if active and not expired)
export const getAccessToken = () => {
  const tokenStr = localStorage.getItem('gcal_token')
  if (!tokenStr) return null
  
  try {
    const authData = JSON.parse(tokenStr)
    if (authData.expires_at > Date.now()) {
      return authData.access_token
    }
  } catch (e) {
    console.error('Error reading token', e)
  }
  return null
}

// Request new connection
export const connectGoogleCalendar = (clientId, apiKey, onStatusChange) => {
  // If no credentials, simulate connection for demo
  if (!clientId || !apiKey) {
    setTimeout(() => {
      const expiresAt = Date.now() + 3600000 // 1 hour
      const authData = {
        access_token: 'mock-token-' + Math.random().toString(36).substring(2),
        expires_at: expiresAt,
        email: 'riadh.hachicha@gmail.com'
      }
      localStorage.setItem('gcal_token', JSON.stringify(authData))
      addSyncLog('OAuth2', 'success', 'Connexion SIMULÉE Google Calendar (Mode Démo)')
      onStatusChange({ connected: true, error: null, token: authData.access_token, isMock: true })
    }, 1000)
    return
  }

  // Real connection
  if (!tokenClient) {
    initGoogleClient(clientId, apiKey, onStatusChange)
  }
  
  if (tokenClient) {
    tokenClient.requestAccessToken({ prompt: 'consent' })
  } else {
    onStatusChange({ connected: false, error: 'SDK Google non initialisé', token: null })
  }
}

// Disconnect
export const disconnectGoogleCalendar = () => {
  localStorage.removeItem('gcal_token')
  addSyncLog('OAuth2', 'success', 'Déconnexion Google Calendar')
}

// ==========================================
// SYNC LOGIC: IMPORT FROM GOOGLE CALENDAR
// ==========================================

export const importGoogleEvents = async (existingItems, clientId, apiKey) => {
  const accessToken = getAccessToken()
  const isMock = accessToken && accessToken.startsWith('mock-token-')

  if (!accessToken) {
    throw new Error('Veuillez d’abord connecter votre compte Google Agenda dans les paramètres.')
  }

  if (isMock || !clientId) {
    // SIMULATED IMPORT (Returns some mock calendar events)
    return new Promise((resolve) => {
      setTimeout(async () => {
        const mockEvents = [
          {
            id: 'gcal-mock-1',
            title: 'Meeting Client Google (Simulé)',
            description: 'Discuter du projet de développement de l’application.',
            date: new Date().toISOString().split('T')[0],
            start_time: '14:00',
            end_time: '15:00',
            type: 'appointment',
            priority: 'normal',
            status: 'todo',
            google_calendar_id: 'gcal-mock-1',
            google_calendar_link: 'https://calendar.google.com',
            notes: 'Événement importé via l’API Google Calendar simulée.'
          },
          {
            id: 'gcal-mock-2',
            title: 'Appel Support Technique (Simulé)',
            description: 'Résoudre le problème de configuration DNS.',
            date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
            start_time: '10:30',
            end_time: '11:00',
            type: 'call',
            priority: 'urgent',
            status: 'todo',
            contact_name: 'Jean Dupont',
            google_calendar_id: 'gcal-mock-2',
            google_calendar_link: 'https://calendar.google.com',
            notes: 'Contact: 06 12 34 56 78'
          }
        ]

        let importedCount = 0
        let duplicateCount = 0

        for (const event of mockEvents) {
          // Check for duplicates
          const exists = existingItems.some(item => 
            item.google_calendar_id === event.google_calendar_id || 
            (item.title === event.title && item.date === event.date && item.start_time === event.start_time)
          )

          if (!exists) {
            await saveItem(event)
            importedCount++
          } else {
            duplicateCount++
          }
        }

        await addSyncLog(
          'import', 
          'success', 
          `Importation réussie (simulée) : ${importedCount} importés, ${duplicateCount} doublons évités.`
        )
        resolve({ imported: importedCount, duplicates: duplicateCount })
      }, 1200)
    })
  }

  // REAL API IMPORT
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?key=${apiKey}&timeMin=${new Date().toISOString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      const errData = await response.json()
      throw new Error(errData.error?.message || 'Erreur lors de la récupération des événements Google')
    }

    const data = await response.json()
    const googleEvents = data.items || []

    let importedCount = 0
    let duplicateCount = 0

    for (const gevent of googleEvents) {
      // Skip cancelled events
      if (gevent.status === 'cancelled') continue

      // Parse dates/times
      const startDateTime = gevent.start?.dateTime || gevent.start?.date
      const endDateTime = gevent.end?.dateTime || gevent.end?.date
      
      if (!startDateTime) continue

      const datePart = startDateTime.substring(0, 10)
      let timePart = '09:00' // Default if full day
      if (startDateTime.includes('T')) {
        timePart = startDateTime.split('T')[1].substring(0, 5)
      }

      let endTimePart = ''
      if (endDateTime && endDateTime.includes('T')) {
        endTimePart = endDateTime.split('T')[1].substring(0, 5)
      }

      // Check for duplicates in existing local/supabase items
      const isDuplicate = existingItems.some(item => 
        item.google_calendar_id === gevent.id || 
        (item.title === gevent.summary && item.date === datePart && item.start_time === timePart)
      )

      if (isDuplicate) {
        duplicateCount++
        continue
      }

      // Determine type based on keywords
      let type = 'event'
      const summaryLower = (gevent.summary || '').toLowerCase()
      const descLower = (gevent.description || '').toLowerCase()

      if (summaryLower.includes('appel') || summaryLower.includes('téléphone') || summaryLower.includes('call') || summaryLower.includes('tel:')) {
        type = 'call'
      } else if (summaryLower.includes('rdv') || summaryLower.includes('rendez-vous') || summaryLower.includes('meeting') || summaryLower.includes('client')) {
        type = 'appointment'
      } else if (summaryLower.includes('tâche') || summaryLower.includes('todo') || summaryLower.includes('task')) {
        type = 'task'
      }

      // Priority mapping
      let priority = 'normal'
      if (summaryLower.includes('urgent') || descLower.includes('urgent') || summaryLower.includes('asap')) {
        priority = 'urgent'
      }

      const newItem = {
        title: gevent.summary || 'Sans titre',
        description: gevent.description || '',
        date: datePart,
        start_time: timePart,
        end_time: endTimePart || undefined,
        type,
        priority,
        status: 'todo',
        google_calendar_id: gevent.id,
        google_calendar_link: gevent.htmlLink || 'https://calendar.google.com',
        notes: `Importé automatiquement de Google Calendar. ID de synchronisation : ${gevent.id}`,
        reminder_active: false
      }

      await saveItem(newItem)
      importedCount++
    }

    await addSyncLog(
      'import', 
      'success', 
      `Importation Google Calendar réussie : ${importedCount} importés, ${duplicateCount} doublons évités.`
    )
    return { imported: importedCount, duplicates: duplicateCount }
  } catch (error) {
    console.error('Google Calendar Import Error:', error)
    await addSyncLog('import', 'error', 'Échec de l’importation Google Calendar', error.message)
    throw error
  }
}

// ==========================================
// SYNC LOGIC: EXPORT EVENT TO GOOGLE CALENDAR
// ==========================================

export const exportItemToGoogle = async (item, clientId, apiKey) => {
  const accessToken = getAccessToken()
  const isMock = accessToken && accessToken.startsWith('mock-token-')

  if (!accessToken) {
    throw new Error('Veuillez d’abord connecter votre compte Google Agenda dans les paramètres.')
  }

  if (isMock || !clientId) {
    // SIMULATED EXPORT
    return new Promise((resolve) => {
      setTimeout(async () => {
        const mockGcalId = 'gcal-exported-' + Math.random().toString(36).substring(2)
        const updatedItem = {
          ...item,
          google_calendar_id: mockGcalId,
          google_calendar_link: 'https://calendar.google.com/calendar/render?event=mocked'
        }
        
        await saveItem(updatedItem)
        await addSyncLog(
          'export', 
          'success', 
          `Exportation réussie (simulée) de l’élément : "${item.title}"`
        )
        resolve(updatedItem)
      }, 800)
    })
  }

  // REAL API EXPORT
  try {
    // Build event object for Google
    // Google Calendar API wants start time in RFC3339 format, e.g. "2026-06-13T10:00:00+01:00"
    // We assume the user's local timezone
    const offset = new Date().toString().match(/([-\+]\d{4})/)
    const tzOffset = offset ? `${offset[1].slice(0, 3)}:${offset[1].slice(3)}` : '+01:00'

    const startTimeISO = `${item.date}T${item.start_time}:00${tzOffset}`
    const endTimeISO = item.end_time 
      ? `${item.date}T${item.end_time}:00${tzOffset}`
      : `${item.date}T${addMinutesToTime(item.start_time, 60)}:00${tzOffset}` // default 1h event

    const eventData = {
      summary: item.title,
      description: `${item.description || ''}\n\nType: ${item.type}\nPriorité: ${item.priority}\nNotes: ${item.notes || ''}\nContact: ${item.contact_name || 'Aucun'}\nTéléphone: ${item.phone_number || 'Aucun'}`,
      start: {
        dateTime: startTimeISO,
      },
      end: {
        dateTime: endTimeISO,
      }
    }

    let url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
    let method = 'POST'

    // If already has google_calendar_id, we update the existing event
    if (item.google_calendar_id) {
      url = `${url}/${item.google_calendar_id}`
      method = 'PUT'
    }

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData)
    })

    if (!response.ok) {
      const errData = await response.json()
      throw new Error(errData.error?.message || 'Erreur lors de l’envoi de l’événement à Google Calendar')
    }

    const data = await response.json()
    
    // Save calendar reference
    const updatedItem = {
      ...item,
      google_calendar_id: data.id,
      google_calendar_link: data.htmlLink
    }

    await saveItem(updatedItem)
    await addSyncLog('export', 'success', `Exportation Google Calendar réussie pour l’élément : "${item.title}"`)
    return updatedItem
  } catch (error) {
    console.error('Google Calendar Export Error:', error)
    await addSyncLog('export', 'error', `Échec de l’exportation pour "${item.title}"`, error.message)
    throw error
  }
}

// Utility to add minutes to time string 'HH:MM'
function addMinutesToTime(timeStr, mins) {
  const [h, m] = timeStr.split(':').map(Number)
  const total = h * 60 + m + mins
  const newH = Math.floor(total / 60) % 24
  const newM = total % 60
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
}
