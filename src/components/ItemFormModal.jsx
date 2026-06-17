import React, { useState, useEffect } from 'react'
import { 
  X, 
  Trash2, 
  Share2, 
  Calendar, 
  CheckSquare, 
  CalendarDays, 
  Sparkles, 
  Phone,
  Clock,
  User,
  AlertOctagon,
  FileText,
  ShoppingCart,
  Package,
  Users,
  Factory
} from 'lucide-react'
import ContactAutocomplete from './ContactAutocomplete'

const PRIORITIES = [
  { value: 'low', label: 'Basse' },
  { value: 'normal', label: 'Normale' },
  { value: 'urgent', label: 'Urgente' }
]

const STATUSES = [
  { value: 'todo', label: 'À faire' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' }
]

const REMINDER_OFFSETS = [
  { value: 5, label: '5 minutes avant' },
  { value: 15, label: '15 minutes avant' },
  { value: 30, label: '30 minutes avant' },
  { value: 60, label: '1 heure avant' },
  { value: 1440, label: '1 jour avant' }
]

export default function ItemFormModal({ 
  item, 
  onClose, 
  onSave, 
  onDelete, 
  onExportToGoogle,
  defaultDate,
  googleConnected
}) {
  const isEditing = !!(item && item.id)

  // State variables for form
  const [type, setType] = useState('achats_divers')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('')
  const [priority, setPriority] = useState('normal')
  const [status, setStatus] = useState('todo')
  const [reminderActive, setReminderActive] = useState(false)
  const [reminderOffset, setReminderOffset] = useState(15)
  const [contactName, setContactName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [googleCalendarId, setGoogleCalendarId] = useState('')
  const [googleCalendarLink, setGoogleCalendarLink] = useState('')

  // Initialize form with item data if present
  useEffect(() => {
    if (item) {
      setType(item.type || 'achats_divers')
      setTitle(item.title || '')
      setDescription(item.description || '')
      setDate(item.date || defaultDate || '')
      setStartTime(item.start_time || '09:00')
      setEndTime(item.end_time || '')
      setPriority(item.priority || 'normal')
      setStatus(item.status || 'todo')
      setReminderActive(!!item.reminder_active)
      setContactName(item.contact_name || '')
      setPhoneNumber(item.phone_number || '')
      setNotes(item.notes || '')
      setGoogleCalendarId(item.google_calendar_id || '')
      setGoogleCalendarLink(item.google_calendar_link || '')
      
      // Calculate offset if reminder time is set
      if (item.reminder_active && item.reminder_time && item.date && item.start_time) {
        try {
          const itemTime = new Date(`${item.date}T${item.start_time}:00`).getTime()
          const reminderTime = new Date(item.reminder_time).getTime()
          const diffMin = Math.round((itemTime - reminderTime) / 60000)
          
          // Match closest common offset
          const matched = REMINDER_OFFSETS.find(o => Math.abs(o.value - diffMin) < 3)
          if (matched) {
            setReminderOffset(matched.value)
          } else {
            setReminderOffset(diffMin > 0 ? diffMin : 15)
          }
        } catch (e) {
          setReminderOffset(15)
        }
      }
    } else {
      // Set defaults for new item
      setType('achats_divers')
      setTitle('')
      setDescription('')
      const today = new Date()
      const yyyy = today.getFullYear()
      const mm = String(today.getMonth() + 1).padStart(2, '0')
      const dd = String(today.getDate()).padStart(2, '0')
      setDate(defaultDate || `${yyyy}-${mm}-${dd}`)
      
      // Default to next nearest hour
      const now = new Date()
      const hours = String((now.getHours() + 1) % 24).padStart(2, '0')
      setStartTime(`${hours}:00`)
      setEndTime(`${String((now.getHours() + 2) % 24).padStart(2, '0')}:00`)
      
      setPriority('normal')
      setStatus('todo')
      setReminderActive(false)
      setReminderOffset(15)
      setContactName('')
      setPhoneNumber('')
      setNotes('')
      setGoogleCalendarId('')
      setGoogleCalendarLink('')
    }
  }, [item, defaultDate])

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!title.trim()) {
      alert('Veuillez entrer un titre.')
      return
    }
    if (!date) {
      alert('Veuillez choisir une date.')
      return
    }
    if (!startTime) {
      alert('Veuillez choisir une heure de début.')
      return
    }

    // Calculate reminder time if active
    let reminder_time = null
    if (reminderActive) {
      const itemTime = new Date(`${date}T${startTime}:00`)
      const reminderDate = new Date(itemTime.getTime() - (reminderOffset * 60000))
      reminder_time = reminderDate.toISOString()
    }

    const savedData = {
      ...item, // keep existing fields like created_at, id (handled by saveItem)
      type,
      title: title.trim(),
      description: description.trim(),
      date,
      start_time: startTime,
      end_time: endTime || null,
      priority,
      status,
      reminder_active: reminderActive,
      reminder_time,
      contact_name: type === 'call' ? contactName.trim() : null,
      phone_number: type === 'call' ? phoneNumber.trim() : null,
      notes: notes.trim(),
      google_calendar_id: googleCalendarId,
      google_calendar_link: googleCalendarLink
    }

    onSave(savedData)
  }

  // Calculate reminder date text for visual feedback
  const getReminderTextPreview = () => {
    if (!date || !startTime) return ''
    try {
      const itemTime = new Date(`${date}T${startTime}:00`)
      const reminderTime = new Date(itemTime.getTime() - (reminderOffset * 60000))
      return reminderTime.toLocaleString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (e) {
      return ''
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100%', overflow: 'hidden' }}>
          {/* HEADER */}
          <div className="modal-header">
            <h2>{isEditing ? 'Modifier l’élément' : 'Nouvel élément'}</h2>
            <button type="button" className="btn-icon" onClick={onClose} style={{ border: 'none', background: 'transparent' }}>
              <X size={20} />
            </button>
          </div>

          {/* BODY */}
          <div className="modal-body">
            {/* TYPE SELECTION RADIOS */}
            <div className="form-group">
              <label>Catégorie</label>
              <div className="type-radio-group" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
                <label className={`type-radio-label ${type === 'achats_divers' ? 'selected' : ''}`} data-type="achats_divers">
                  <input type="radio" name="type" value="achats_divers" checked={type === 'achats_divers'} onChange={() => setType('achats_divers')} />
                  <ShoppingCart size={16} />
                  Achats Divers
                </label>
                <label className={`type-radio-label ${type === 'achats_mp' ? 'selected' : ''}`} data-type="achats_mp">
                  <input type="radio" name="type" value="achats_mp" checked={type === 'achats_mp'} onChange={() => setType('achats_mp')} />
                  <Package size={16} />
                  Achats MP
                </label>
                <label className={`type-radio-label ${type === 'client' ? 'selected' : ''}`} data-type="client">
                  <input type="radio" name="type" value="client" checked={type === 'client'} onChange={() => setType('client')} />
                  <Users size={16} />
                  Client
                </label>
                <label className={`type-radio-label ${type === 'rendezvous' ? 'selected' : ''}`} data-type="rendezvous">
                  <input type="radio" name="type" value="rendezvous" checked={type === 'rendezvous'} onChange={() => setType('rendezvous')} />
                  <CalendarDays size={16} />
                  Rendez-vous
                </label>
                <label className={`type-radio-label ${type === 'tache_administrative' ? 'selected' : ''}`} data-type="tache_administrative">
                  <input type="radio" name="type" value="tache_administrative" checked={type === 'tache_administrative'} onChange={() => setType('tache_administrative')} />
                  <FileText size={16} />
                  Admin
                </label>
                <label className={`type-radio-label ${type === 'tache_usine' ? 'selected' : ''}`} data-type="tache_usine">
                  <input type="radio" name="type" value="tache_usine" checked={type === 'tache_usine'} onChange={() => setType('tache_usine')} />
                  <Factory size={16} />
                  Usine
                </label>
                <label className={`type-radio-label ${type === 'call' ? 'selected' : ''}`} data-type="call">
                  <input type="radio" name="type" value="call" checked={type === 'call'} onChange={() => setType('call')} />
                  <Phone size={16} />
                  Appel Tél.
                </label>
              </div>
            </div>

            {/* TITLE */}
            <div className="form-group">
              <label htmlFor="title">Titre *</label>
              <input 
                id="title"
                type="text" 
                className="form-control" 
                placeholder="Ex: Réunion d'équipe, Acheter du pain..." 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* DESCRIPTION */}
            <div className="form-group">
              <label htmlFor="desc">Description</label>
              <textarea 
                id="desc"
                className="form-control" 
                placeholder="Détails de l'élément..." 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* GRID DATE & HOURS */}
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="date">Date *</label>
                <input 
                  id="date"
                  type="date" 
                  className="form-control" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label htmlFor="start_time">Début *</label>
                  <input 
                    id="start_time"
                    type="time" 
                    className="form-control" 
                    value={startTime} 
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="end_time">Fin</label>
                  <input 
                    id="end_time"
                    type="time" 
                    className="form-control" 
                    value={endTime} 
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {type === 'call' && (
              <div className="form-grid" style={{ marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="contact_name">Nom du contact</label>
                  <ContactAutocomplete
                    value={contactName}
                    phoneValue={phoneNumber}
                    onNameChange={setContactName}
                    onPhoneChange={setPhoneNumber}
                    onContactSelect={({ name, phone }) => {
                      setContactName(name)
                      setPhoneNumber(phone)
                    }}
                    googleConnected={googleConnected}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="phone_number">Numéro de téléphone</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Phone size={16} style={{ position: 'absolute', left: '10px', color: 'var(--text-light)' }} />
                    <input 
                      id="phone_number"
                      type="tel" 
                      className="form-control" 
                      placeholder="Ex: +33612345678" 
                      value={phoneNumber} 
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      style={{ paddingLeft: '2.2rem', width: '100%' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* GRID PRIORITY & STATUS */}
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="priority">Priorité</label>
                <select 
                  id="priority"
                  className="form-control"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  {PRIORITIES.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="status">Statut</label>
                <select 
                  id="status"
                  className="form-control"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* REMINDER SETTINGS */}
            <div className="toggle-switch-container">
              <span className="switch-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} /> Programmer un rappel
              </span>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={reminderActive} 
                  onChange={(e) => setReminderActive(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            {reminderActive && (
              <div className="form-group animate-slideDown" style={{ background: 'var(--bg-app)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)', marginBottom: '1rem' }}>
                <label htmlFor="reminder_offset">Moment du rappel</label>
                <select 
                  id="reminder_offset"
                  className="form-control"
                  value={reminderOffset}
                  onChange={(e) => setReminderOffset(Number(e.target.value))}
                  style={{ background: 'white' }}
                >
                  {REMINDER_OFFSETS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', display: 'block' }}>
                  Le rappel aura lieu le : <strong>{getReminderTextPreview()}</strong>
                </span>
              </div>
            )}

            {/* NOTES */}
            <div className="form-group">
              <label htmlFor="notes" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FileText size={14} /> Notes additionnelles
              </label>
              <textarea 
                id="notes"
                className="form-control" 
                placeholder="Renseigner des informations complémentaires..." 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* GOOGLE CALENDAR LINK / SYNC STATUS */}
            {isEditing && (
              <div style={{ marginTop: '0.5rem', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--bg-app)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block' }}>
                      Statut Google Agenda :
                    </span>
                    <span style={{ fontSize: '0.85rem', color: googleCalendarId ? '#10b981' : 'var(--text-muted)' }}>
                      {googleCalendarId ? '✓ Synchronisé' : '✗ Non synchronisé'}
                    </span>
                  </div>
                  
                  {googleCalendarId ? (
                    <a 
                      href={googleCalendarLink} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn-secondary"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', textDecoration: 'none' }}
                    >
                      Ouvrir dans Google
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => onExportToGoogle(item)}
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Share2 size={12} /> Envoyer à Google
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="modal-footer">
            <div className="footer-left">
              {isEditing && (
                <button 
                  type="button" 
                  className="btn-danger-outline"
                  onClick={() => {
                    if (window.confirm('Voulez-vous supprimer cet élément ?')) {
                      onDelete(item.id)
                    }
                  }}
                  title="Supprimer cet élément"
                >
                  <Trash2 size={16} /> Supprimer
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Annuler
              </button>
              <button type="submit" className="btn-primary">
                Enregistrer
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
