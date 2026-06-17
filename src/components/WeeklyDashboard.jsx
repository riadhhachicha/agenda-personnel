import React, { useState, useEffect, useRef, useCallback } from 'react'
import { 
  ChevronLeft,
  ChevronRight,
  Search,
  Calendar, 
  CheckSquare, 
  CalendarDays, 
  Sparkles, 
  Phone, 
  Plus, 
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ShoppingCart,
  Package,
  Users,
  FileText,
  Factory,
  Clock
} from 'lucide-react'
import CardColorPicker from './CardColorPicker'
import { saveItem, getItems } from '../db/db'

// Days of the week in French (Monday to Saturday)
const DAYS_OF_WEEK = [
  { name: 'Lundi',    short: 'Lun', key: 'monday',    dayIndex: 1 },
  { name: 'Mardi',    short: 'Mar', key: 'tuesday',   dayIndex: 2 },
  { name: 'Mercredi', short: 'Mer', key: 'wednesday', dayIndex: 3 },
  { name: 'Jeudi',    short: 'Jeu', key: 'thursday',  dayIndex: 4 },
  { name: 'Vendredi', short: 'Ven', key: 'friday',    dayIndex: 5 },
  { name: 'Samedi',   short: 'Sam', key: 'saturday',  dayIndex: 6 },
]

export default function WeeklyDashboard({ 
  items, 
  activeDate, 
  setActiveDate, 
  onAddItem, 
  onEditItem, 
  onToggleComplete,
  onSyncGoogleCalendar,
  syncing,
  filters,
  setFilters,
  searchQuery,
  setSearchQuery,
  onRescheduleItem,
  isMobile,
  onItemsRefresh
}) {
  const [dragOverDay, setDragOverDay] = useState(null)

  // ─── Color Picker state ───────────────────────────────────────────────────
  const [colorPickerItem, setColorPickerItem] = useState(null)   // item being colored
  const [colorPickerRect, setColorPickerRect] = useState(null)   // anchor DOMRect

  // Double-tap detection for mobile (store last tap time per item)
  const lastTapRef = useRef({})
  const [selectedDayKey, setSelectedDayKey] = useState(null) // Mobile: selected day key
  const selectorRef = useRef(null)

  const [currentMinutes, setCurrentMinutes] = useState(
    new Date().getHours() * 60 + new Date().getMinutes()
  )

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes())
    }, 15000)
    return () => clearInterval(timer)
  }, [])

  const categoryRGBs = {
    achats_divers:        '55, 48, 163',
    achats_mp:            '6, 95, 70',
    client:               '146, 64, 14',
    rendezvous:           '157, 23, 77',
    tache_administrative: '55, 65, 81',
    tache_usine:          '8, 145, 178',
    call:                 '159, 18, 57'
  }

  const hexToRgb = (hex) => {
    if (!hex) return null
    const cleaned = hex.replace('#', '')
    if (cleaned.length === 3) {
      const r = parseInt(cleaned[0] + cleaned[0], 16)
      const g = parseInt(cleaned[1] + cleaned[1], 16)
      const b = parseInt(cleaned[2] + cleaned[2], 16)
      return `${r}, ${g}, ${b}`
    } else if (cleaned.length === 6) {
      const r = parseInt(cleaned.slice(0, 2), 16)
      const g = parseInt(cleaned.slice(2, 4), 16)
      const b = parseInt(cleaned.slice(4, 6), 16)
      return `${r}, ${g}, ${b}`
    }
    return null
  }

  const getBlinkColor = (item) => {
    if (item.custom_color) {
      const rgb = hexToRgb(item.custom_color)
      if (rgb) return rgb
    }
    return categoryRGBs[item.type] || '79, 70, 229'
  }

  const handlePostponeItem = async (e, item) => {
    e.stopPropagation()
    const [h, m] = item.start_time.split(':').map(Number)
    const startMin = h * 60 + m
    const endMin = item.end_time ? item.end_time.split(':').map(Number).reduce((he, me) => he * 60 + me) : startMin + 30
    
    const newStart = startMin + 30
    const newEnd = endMin + 30
    
    const maxAllowed = 22 * 60 // 22:00
    let updatedDate = item.date
    let finalStart = newStart
    let finalEnd = newEnd

    if (newStart >= maxAllowed) {
      const d = new Date(item.date)
      d.setDate(d.getDate() + 1)
      const y = d.getFullYear()
      const mo = String(d.getMonth() + 1).padStart(2, '0')
      const da = String(d.getDate()).padStart(2, '0')
      updatedDate = `${y}-${mo}-${da}`
      finalStart = 9 * 60 // 09:00
      finalEnd = 9 * 60 + (endMin - startMin)
    }

    const sh = Math.floor(finalStart / 60)
    const sm = finalStart % 60
    const eh = Math.floor(finalEnd / 60)
    const em = finalEnd % 60

    const updated = {
      ...item,
      date: updatedDate,
      start_time: `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`,
      end_time: `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`
    }
    
    await saveItem(updated)
    if (onItemsRefresh) onItemsRefresh()
  }

  // ─── Drag & Drop (desktop only) ───────────────────────────────────────────
  const handleDragStart = (e, item) => {
    e.dataTransfer.setData('text/plain', item.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDragEnter = (e, dateString) => {
    e.preventDefault()
    setDragOverDay(dateString)
  }

  const handleDragLeave = () => {
    setDragOverDay(null)
  }

  const handleDrop = (e, dateString) => {
    e.preventDefault()
    setDragOverDay(null)
    const itemId = e.dataTransfer.getData('text/plain')
    if (itemId && onRescheduleItem) {
      onRescheduleItem(itemId, dateString)
    }
  }

  // ─── Date helpers ──────────────────────────────────────────────────────────
  const getMonday = (d) => {
    const date = new Date(d)
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(date.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    return monday
  }

  const formatLocalDate = (date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const monday = getMonday(activeDate)

  // Generate week days array
  const weekDays = DAYS_OF_WEEK.map(day => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + (day.dayIndex - 1))
    const dateString = formatLocalDate(date)
    const isToday = formatLocalDate(new Date()) === dateString
    return { ...day, date, dateString, isToday }
  })

  // On mobile: auto-select today's day (or Monday if today is not in current week)
  useEffect(() => {
    if (!isMobile) return
    const todayKey = weekDays.find(d => d.isToday)?.key
    setSelectedDayKey(todayKey || weekDays[0].key)
  }, [isMobile, activeDate])

  // Scroll selected pill into view
  useEffect(() => {
    if (!isMobile || !selectorRef.current) return
    const selectedEl = selectorRef.current.querySelector('.mobile-day-pill.selected')
    if (selectedEl) {
      selectedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [selectedDayKey, isMobile])

  const formatDateRange = () => {
    const options = { day: 'numeric', month: 'long' }
    const start = weekDays[0].date.toLocaleDateString('fr-FR', options)
    const end   = weekDays[5].date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    return `${start} – ${end}`
  }

  const navigateWeek = (direction) => {
    const newDate = new Date(activeDate)
    newDate.setDate(activeDate.getDate() + (direction * 7))
    setActiveDate(newDate)
  }

  const goToToday = () => {
    setActiveDate(new Date())
  }

  // ─── Filter & Search ───────────────────────────────────────────────────────
  const filteredItems = items.filter(item => {
    if (!filters[item.type]) return false
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase()
      return (
        item.title?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.contact_name?.toLowerCase().includes(q) ||
        item.notes?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const itemsByDate = filteredItems.reduce((groups, item) => {
    if (!groups[item.date]) groups[item.date] = []
    groups[item.date].push(item)
    return groups
  }, {})

  const toggleFilter = (type) => {
    setFilters(prev => ({ ...prev, [type]: !prev[type] }))
  }

  // ─── Icons ─────────────────────────────────────────────────────────────────
  const getItemIcon = (type) => {
    switch (type) {
      case 'achats_divers':        return <ShoppingCart className="card-icon" size={16} />
      case 'achats_mp':            return <Package className="card-icon" size={16} />
      case 'client':               return <Users className="card-icon" size={16} />
      case 'rendezvous':           return <CalendarDays className="card-icon" size={16} />
      case 'tache_administrative': return <FileText className="card-icon" size={16} />
      case 'tache_usine':          return <Factory className="card-icon" size={16} />
      case 'call':                 return <Phone className="card-icon" size={16} />
      default:                     return <Calendar className="card-icon" size={16} />
    }
  }

  // ─── Color Picker handlers ────────────────────────────────────────────────
  const handleCardDoubleClick = useCallback((e, item) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setColorPickerItem(item)
    setColorPickerRect(rect)
  }, [])

  // Mobile: detect double-tap (two taps within 300ms)
  const handleCardTap = useCallback((e, item) => {
    const now = Date.now()
    const lastTap = lastTapRef.current[item.id] || 0
    if (now - lastTap < 350) {
      // Double tap!
      e.preventDefault()
      e.stopPropagation()
      const rect = e.currentTarget.getBoundingClientRect()
      setColorPickerItem(item)
      setColorPickerRect(rect)
      lastTapRef.current[item.id] = 0
    } else {
      lastTapRef.current[item.id] = now
    }
  }, [])

  const handleColorApply = useCallback(async (bg, text) => {
    if (!colorPickerItem) return
    const updated = { ...colorPickerItem, custom_color: bg, custom_color_text: text }
    await saveItem(updated)
    if (onItemsRefresh) onItemsRefresh()
    setColorPickerItem(null)
  }, [colorPickerItem, onItemsRefresh])

  const handleColorReset = useCallback(async () => {
    if (!colorPickerItem) return
    const { custom_color, custom_color_text, ...rest } = colorPickerItem
    const updated = { ...rest, custom_color: null, custom_color_text: null }
    await saveItem(updated)
    if (onItemsRefresh) onItemsRefresh()
    setColorPickerItem(null)
  }, [colorPickerItem, onItemsRefresh])

  // ─── Shared card renderer ──────────────────────────────────────────────────
  const renderCard = (item) => {
    const isCompleted = item.status === 'completed'
    // Determine effective background & text colors
    const cardBg = item.custom_color || undefined
    const cardText = item.custom_color_text || undefined

    const todayStr = formatLocalDate(new Date())
    const startMin = item.start_time ? item.start_time.split(':').map(Number).reduce((h, m) => h * 60 + m) : null
    const isBlinking = item.date === todayStr && startMin !== null && currentMinutes >= startMin && !isCompleted && item.status !== 'cancelled'

    return (
      <div 
        key={item.id} 
        className={`agenda-card ${isCompleted ? 'completed' : ''} ${isBlinking ? 'arrived-blink' : ''}`}
        data-type={item.custom_color ? undefined : item.type}
        onClick={() => onEditItem(item)}
        onDoubleClick={!isMobile ? (e) => handleCardDoubleClick(e, item) : undefined}
        onTouchStart={isMobile ? (e) => handleCardTap(e, item) : undefined}
        draggable={!isMobile}
        onDragStart={!isMobile ? (e) => handleDragStart(e, item) : undefined}
        style={{ 
          cursor: isMobile ? 'pointer' : 'grab',
          ...(cardBg ? { backgroundColor: cardBg, color: cardText || 'inherit' } : {}),
          '--blink-color-rgb': getBlinkColor(item)
        }}
        title={!isMobile ? 'Double-clic pour changer la couleur' : undefined}
      >
        <div className="card-header-row">
          <div className="card-title-group">
            {getItemIcon(item.type)}
            <span className="card-title">{item.title}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
            {isBlinking && (
              <button 
                type="button"
                className="quick-postpone-btn"
                onClick={(e) => handlePostponeItem(e, item)}
                title="Reporter de 30 min"
              >
                <Clock size={12} />
              </button>
            )}
            {item.type === 'task' && (
              <button 
                className="quick-complete-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleComplete(item)
                }}
                title={isCompleted ? 'Marquer comme à faire' : 'Marquer comme terminé'}
              >
                <CheckCircle2 size={14} fill={isCompleted ? 'currentColor' : 'none'} />
              </button>
            )}
          </div>
        </div>

        {item.description && (
          <span className="card-desc">{item.description}</span>
        )}

        {item.type === 'call' && (item.contact_name || item.phone_number) && (
          <span className="card-desc" style={{ fontWeight: '500', display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
            {item.contact_name && (
              <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                👤 {item.contact_name}
              </span>
            )}
            {item.phone_number && (
              <a 
                href={`tel:${item.phone_number}`}
                onClick={(e) => e.stopPropagation()}
                style={{ color: 'inherit', textDecoration: 'underline', display: 'inline-flex', gap: '4px', alignItems: 'center', fontWeight: 'bold' }}
                title="Appeler directement"
              >
                <Phone size={10} /> {item.phone_number}
              </a>
            )}
          </span>
        )}

        <div className="card-footer">
          <span className="card-time">
            {item.start_time}
            {item.end_time && ` – ${item.end_time}`}
          </span>
          <div className="card-badges">
            {item.priority === 'urgent' && !isCompleted && (
              <span className="priority-badge-urgent">Urgent</span>
            )}
            {item.google_calendar_id && (
              <span className="sync-badge" title="Synchronisé Google Calendar">G</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ─── MOBILE SELECTED DAY ───────────────────────────────────────────────────
  const selectedDay = weekDays.find(d => d.key === selectedDayKey) || weekDays[0]
  const selectedDayItems = (itemsByDate[selectedDay?.dateString] || [])
    .slice()
    .sort((a, b) => a.start_time.localeCompare(b.start_time))

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="page-content">
      {/* ── TOOLBAR ── */}
      <div className="dashboard-toolbar">
        {/* Week navigation */}
        <div className="nav-arrows">
          <button className="btn-icon" onClick={() => navigateWeek(-1)} title="Semaine précédente">
            <ChevronLeft size={20} />
          </button>
          <button className="btn-secondary" onClick={goToToday} style={{ padding: '0.45rem 1rem' }}>
            Aujourd'hui
          </button>
          <button className="btn-icon" onClick={() => navigateWeek(1)} title="Semaine suivante">
            <ChevronRight size={20} />
          </button>
          {!isMobile && (
            <span className="current-week-label">{formatDateRange()}</span>
          )}
        </div>

        {/* Week label on mobile (below nav arrows) */}
        {isMobile && (
          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textAlign: 'center' }}>
            {formatDateRange()}
          </span>
        )}

        {/* Filters */}
        <div className="filters-container">
          <button className={`filter-chip ${filters.achats_divers ? 'active' : ''}`} onClick={() => toggleFilter('achats_divers')} data-type="achats_divers">
            <ShoppingCart size={14} /> Achats Divers
          </button>
          <button className={`filter-chip ${filters.achats_mp ? 'active' : ''}`} onClick={() => toggleFilter('achats_mp')} data-type="achats_mp">
            <Package size={14} /> Achats MP
          </button>
          <button className={`filter-chip ${filters.client ? 'active' : ''}`} onClick={() => toggleFilter('client')} data-type="client">
            <Users size={14} /> Client
          </button>
          <button className={`filter-chip ${filters.rendezvous ? 'active' : ''}`} onClick={() => toggleFilter('rendezvous')} data-type="rendezvous">
            <CalendarDays size={14} /> Rendez-vous
          </button>
          <button className={`filter-chip ${filters.tache_administrative ? 'active' : ''}`} onClick={() => toggleFilter('tache_administrative')} data-type="tache_administrative">
            <FileText size={14} /> Admin
          </button>
          <button className={`filter-chip ${filters.tache_usine ? 'active' : ''}`} onClick={() => toggleFilter('tache_usine')} data-type="tache_usine">
            <Factory size={14} /> Usine
          </button>
          <button className={`filter-chip ${filters.call ? 'active' : ''}`} onClick={() => toggleFilter('call')} data-type="call">
            <Phone size={14} /> Appel
          </button>
        </div>

        {/* Search & actions */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div className="search-box">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Recherche rapide..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            className="btn-secondary" 
            onClick={onSyncGoogleCalendar}
            disabled={syncing}
            style={{ padding: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '44px' }}
            title="Synchroniser Google Agenda"
          >
            <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
          </button>
          {!isMobile && (
            <button className="btn-primary" onClick={() => onAddItem()}>
              <Plus size={18} /> Nouveau
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          MOBILE VIEW: Day pill selector + single day
          ══════════════════════════════════════════════ */}
      {isMobile ? (
        <>
          {/* Horizontal day pill selector */}
          <div className="mobile-day-selector" ref={selectorRef}>
            {weekDays.map(day => {
              const dayItemCount = (itemsByDate[day.dateString] || []).length
              const isSelected = selectedDayKey === day.key
              return (
                <button
                  key={day.key}
                  className={[
                    'mobile-day-pill',
                    day.isToday ? 'today' : '',
                    isSelected ? 'selected' : '',
                    dayItemCount > 0 ? 'has-items' : ''
                  ].filter(Boolean).join(' ')}
                  onClick={() => setSelectedDayKey(day.key)}
                  aria-label={`${day.name} ${day.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`}
                  aria-pressed={isSelected}
                >
                  <span className="pill-name">{day.short}</span>
                  <span className="pill-num">{day.date.getDate()}</span>
                  <span className="pill-dot" aria-hidden="true" />
                </button>
              )
            })}
          </div>

          {/* Selected day content */}
          <div style={{ flex: 1 }}>
            {/* Day label */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
              padding: '0 0.1rem'
            }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: '1.15rem', color: selectedDay?.isToday ? 'var(--primary)' : 'var(--text-main)' }}>
                  {selectedDay?.name}
                </span>
                <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  {selectedDay?.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <button
                className="btn-primary"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', gap: '0.3rem' }}
                onClick={() => onAddItem(selectedDay?.dateString)}
              >
                <Plus size={14} /> Ajouter
              </button>
            </div>

            {/* Cards for selected day */}
            {selectedDayItems.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {selectedDayItems.map(item => renderCard(item))}
              </div>
            ) : (
              <div className="empty-day-state" style={{ minHeight: '200px' }}>
                <Calendar size={32} strokeWidth={1.5} />
                <span style={{ fontWeight: '600' }}>Journée libre</span>
                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Appuyez sur + pour ajouter un élément</span>
              </div>
            )}
          </div>
        </>
      ) : (
        /* ════════════════════════════════════════════
           DESKTOP VIEW: 6-column week grid
           ════════════════════════════════════════════ */
        <div className="week-grid">
          {weekDays.map(day => {
            const dayItems = (itemsByDate[day.dateString] || [])
              .slice()
              .sort((a, b) => a.start_time.localeCompare(b.start_time))

            return (
              <div 
                key={day.key} 
                className={`day-column ${day.isToday ? 'today' : ''}`}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, day.dateString)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, day.dateString)}
                style={dragOverDay === day.dateString ? { 
                  background: 'rgba(79, 70, 229, 0.12)', 
                  border: '2px dashed var(--primary)',
                  transition: 'all 0.15s ease'
                } : {}}
              >
                <div className="day-header">
                  <span className="day-name">{day.name}</span>
                  <span className="day-date">
                    {day.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                </div>

                <div className="items-list">
                  {dayItems.length > 0 ? (
                    dayItems.map(item => renderCard(item))
                  ) : (
                    <div className="empty-day-state">
                      <Calendar size={20} strokeWidth={1.5} />
                      <span>Aucun élément</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── COLOR PICKER POPUP ── */}
      {colorPickerItem && (
        <CardColorPicker
          item={colorPickerItem}
          anchorRect={colorPickerRect}
          onApply={handleColorApply}
          onReset={handleColorReset}
          onClose={() => setColorPickerItem(null)}
        />
      )}
    </div>
  )
}
