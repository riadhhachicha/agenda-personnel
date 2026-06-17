// ============================================================
// Google Contacts Service — Google People API
// Searches Gmail contacts for autocomplete in ItemFormModal
// Requires scope: https://www.googleapis.com/auth/contacts.readonly
// ============================================================

import { getAccessToken } from './googleCalendar'

const PEOPLE_API = 'https://people.googleapis.com/v1'

// In-memory cache to avoid repeated API calls
let contactsCache = null
let cacheTimestamp = 0
const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes

// Search contacts by name query (case-insensitive, local filter from cached list)
export const searchGmailContacts = async (query) => {
  if (!query || query.trim().length < 2) return []
  
  const token = getAccessToken()
  if (!token || token.startsWith('mock-token-')) {
    // Return mock contacts in demo mode
    return getMockContacts(query)
  }

  // Load contacts (from cache or API)
  const allContacts = await loadAllContacts(token)

  // Filter by query
  const q = query.toLowerCase().trim()
  return allContacts
    .filter(c => 
      c.name?.toLowerCase().includes(q) ||
      c.phones?.some(p => p.replace(/\s/g, '').includes(q))
    )
    .slice(0, 8) // max 8 suggestions
}

// Load all contacts (with cache)
const loadAllContacts = async (token) => {
  const now = Date.now()
  if (contactsCache && (now - cacheTimestamp) < CACHE_DURATION_MS) {
    return contactsCache
  }

  try {
    const res = await fetch(
      `${PEOPLE_API}/people/me/connections?personFields=names,phoneNumbers,photos,emailAddresses&pageSize=1000&sortOrder=FIRST_NAME_ASCENDING`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )

    if (!res.ok) {
      console.warn('Google Contacts API error:', res.status)
      return []
    }

    const data = await res.json()
    const connections = data.connections || []

    contactsCache = connections
      .map(person => parseGooglePerson(person))
      .filter(c => c.name && c.phones.length > 0) // Only contacts with phone numbers
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))

    cacheTimestamp = now
    return contactsCache
  } catch (e) {
    console.error('Error loading Google Contacts:', e)
    return []
  }
}

// Parse a Google People API person object
const parseGooglePerson = (person) => {
  const names = person.names || []
  const phones = person.phoneNumbers || []
  const photos = person.photos || []
  const emails = person.emailAddresses || []

  const primaryName = names.find(n => n.metadata?.primary) || names[0]
  const primaryPhoto = photos.find(p => p.metadata?.primary) || photos[0]

  const phoneList = phones.map(p => ({
    number: p.value,
    type: p.type || 'mobile',
    label: p.formattedType || p.type || 'Téléphone'
  }))

  return {
    resourceName: person.resourceName,
    name: primaryName?.displayName || '',
    firstName: primaryName?.givenName || '',
    lastName: primaryName?.familyName || '',
    phones: phoneList.map(p => p.number),
    phoneDetails: phoneList,
    photo: primaryPhoto?.url || null,
    email: emails.find(e => e.metadata?.primary)?.value || emails[0]?.value || ''
  }
}

// Clear contacts cache (call after Google reconnect)
export const clearContactsCache = () => {
  contactsCache = null
  cacheTimestamp = 0
}

// Mock contacts for demo mode (when Google not connected)
const getMockContacts = (query) => {
  const MOCK_CONTACTS = [
    { name: 'Ahmed Benali', phones: ['+33 6 12 34 56 78'], phoneDetails: [{ number: '+33 6 12 34 56 78', label: 'Mobile' }], photo: null, email: 'ahmed.benali@gmail.com' },
    { name: 'Marie Dupont', phones: ['+33 7 98 76 54 32'], phoneDetails: [{ number: '+33 7 98 76 54 32', label: 'Mobile' }], photo: null, email: 'marie.dupont@gmail.com' },
    { name: 'Jean-Pierre Martin', phones: ['+33 6 55 44 33 22'], phoneDetails: [{ number: '+33 6 55 44 33 22', label: 'Mobile' }, { number: '+33 1 23 45 67 89', label: 'Bureau' }], photo: null, email: 'jp.martin@gmail.com' },
    { name: 'Sofia Benzara', phones: ['+33 6 77 88 99 00'], phoneDetails: [{ number: '+33 6 77 88 99 00', label: 'Mobile' }], photo: null, email: 'sofia.benzara@outlook.com' },
    { name: 'Karim Hachicha', phones: ['+216 98 765 432'], phoneDetails: [{ number: '+216 98 765 432', label: 'Mobile' }], photo: null, email: 'karim.hachicha@gmail.com' },
    { name: 'Leila Mansouri', phones: ['+33 6 11 22 33 44'], phoneDetails: [{ number: '+33 6 11 22 33 44', label: 'Mobile' }], photo: null, email: 'leila.mansouri@gmail.com' },
  ]
  const q = query.toLowerCase()
  return MOCK_CONTACTS.filter(c => 
    c.name.toLowerCase().includes(q) ||
    c.phones.some(p => p.includes(q))
  ).slice(0, 5)
}
