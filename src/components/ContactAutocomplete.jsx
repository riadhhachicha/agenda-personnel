import React, { useState, useEffect, useRef, useCallback } from 'react'
import { User, Phone, Search, Loader } from 'lucide-react'
import { searchGmailContacts } from '../services/googleContacts'

export default function ContactAutocomplete({
  value,           // current contact name string
  phoneValue,      // current phone number string
  onNameChange,    // (name: string) => void
  onPhoneChange,   // (phone: string) => void
  onContactSelect, // (contact: {name, phone}) => void
  googleConnected, // boolean
  disabled
}) {
  const [query, setQuery] = useState(value || '')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [selectedPhone, setSelectedPhone] = useState({}) // itemIndex -> phone
  const debounceRef = useRef(null)
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  // Sync external value
  useEffect(() => { setQuery(value || '') }, [value])

  // Debounced search
  const search = useCallback(async (q) => {
    if (q.trim().length < 2) {
      setSuggestions([])
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      const results = await searchGmailContacts(q)
      setSuggestions(results)
      setOpen(results.length > 0)
    } catch (e) {
      console.error('Contact search error:', e)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = (e) => {
    const val = e.target.value
    setQuery(val)
    onNameChange(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 300)
  }

  const handleSelectContact = (contact, phoneOverride) => {
    const phone = phoneOverride || contact.phones?.[0] || ''
    setQuery(contact.name)
    onNameChange(contact.name)
    onPhoneChange(phone)
    if (onContactSelect) onContactSelect({ name: contact.name, phone })
    setSuggestions([])
    setOpen(false)
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Input field */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <User
          size={16}
          style={{ position: 'absolute', left: '10px', color: 'var(--text-light)', zIndex: 1 }}
        />
        <input
          ref={inputRef}
          id="contact_name"
          type="text"
          className="form-control"
          placeholder={googleConnected ? 'Tapez un nom… (recherche dans Gmail)' : 'Ex: Jean Dupont'}
          value={query}
          onChange={handleInputChange}
          onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
          disabled={disabled}
          autoComplete="off"
          style={{ paddingLeft: '2.2rem', paddingRight: '2.2rem', width: '100%' }}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-haspopup="listbox"
        />
        {loading && (
          <Loader
            size={14}
            style={{ position: 'absolute', right: '10px', color: 'var(--primary)', animation: 'spin 1s linear infinite' }}
          />
        )}
        {!loading && googleConnected && (
          <Search
            size={13}
            style={{ position: 'absolute', right: '10px', color: 'var(--text-light)' }}
          />
        )}
      </div>

      {/* Gmail badge */}
      {googleConnected && (
        <span style={{
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          marginTop: '3px'
        }}>
          🔍 Recherche dans vos contacts Gmail
        </span>
      )}

      {/* Suggestions dropdown */}
      {open && suggestions.length > 0 && (
        <div
          className="contact-autocomplete-dropdown"
          role="listbox"
          aria-label="Suggestions de contacts"
        >
          {suggestions.map((contact, idx) => (
            <div
              key={contact.resourceName || idx}
              className="contact-suggestion-item"
              role="option"
              onClick={() => handleSelectContact(contact)}
            >
              {/* Avatar */}
              <div className="contact-avatar">
                {contact.photo ? (
                  <img
                    src={contact.photo}
                    alt={contact.name}
                    className="contact-avatar-img"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                ) : (
                  <span className="contact-avatar-initials">
                    {contact.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Name + phones */}
              <div className="contact-info">
                <span className="contact-name">{contact.name}</span>
                {contact.phoneDetails && contact.phoneDetails.length > 0 && (
                  <div className="contact-phones">
                    {contact.phoneDetails.map((pd, pi) => (
                      <button
                        key={pi}
                        type="button"
                        className="contact-phone-chip"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelectContact(contact, pd.number)
                        }}
                        title={`Utiliser ce numéro : ${pd.number}`}
                      >
                        <Phone size={10} />
                        <span>{pd.number}</span>
                        <span className="contact-phone-type">{pd.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
