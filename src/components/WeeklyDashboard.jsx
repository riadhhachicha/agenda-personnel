import React, { useState } from 'react'
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
  RefreshCw
} from 'lucide-react'

// Days of the week in French (Monday to Saturday)
const DAYS_OF_WEEK = [
  { name: 'Lundi', key: 'monday', dayIndex: 1 },
  { name: 'Mardi', key: 'tuesday', dayIndex: 2 },
  { name: 'Mercredi', key: 'wednesday', dayIndex: 3 },
  { name: 'Jeudi', key: 'thursday', dayIndex: 4 },
  { name: 'Vendredi', key: 'friday', dayIndex: 5 },
  { name: 'Samedi', key: 'saturday', dayIndex: 6 }
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
  onRescheduleItem
}) {
  const [dragOverDay, setDragOverDay] = useState(null)

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

  const handleDragLeave = (e) => {
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

  // Helper: Find Monday of the week for a given date
  const getMonday = (d) => {
    const date = new Date(d)
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
    const monday = new Date(date.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    return monday
  }

  const monday = getMonday(activeDate)

  // Helper to format Date object to local YYYY-MM-DD
  const formatLocalDate = (date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // Generate date array for Mon-Sat
  const weekDays = DAYS_OF_WEEK.map(day => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + (day.dayIndex - 1))
    const dateString = formatLocalDate(date)
    
    // Check if it is today
    const isToday = formatLocalDate(new Date()) === dateString
    
    return {
      ...day,
      date,
      dateString,
      isToday
    }
  })

  // Format week range label (e.g., "15 Juin - 20 Juin 2026")
  const formatDateRange = () => {
    const options = { day: 'numeric', month: 'long' }
    const start = weekDays[0].date.toLocaleDateString('fr-FR', options)
    const end = weekDays[5].date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    return `${start} - ${end}`
  }

  // Navigate weeks
  const navigateWeek = (direction) => {
    const newDate = new Date(activeDate)
    newDate.setDate(activeDate.getDate() + (direction * 7))
    setActiveDate(newDate)
  }

  const goToToday = () => {
    setActiveDate(new Date())
  }

  // Filter & Search items
  const filteredItems = items.filter(item => {
    // Filter by type
    if (!filters[item.type]) return false
    
    // Filter by search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase()
      const titleMatch = item.title?.toLowerCase().includes(query)
      const descMatch = item.description?.toLowerCase().includes(query)
      const contactMatch = item.contact_name?.toLowerCase().includes(query)
      const notesMatch = item.notes?.toLowerCase().includes(query)
      return titleMatch || descMatch || contactMatch || notesMatch
    }
    
    return true
  })

  // Group items by date string
  const itemsByDate = filteredItems.reduce((groups, item) => {
    if (!groups[item.date]) {
      groups[item.date] = []
    }
    groups[item.date].push(item)
    return groups
  }, {})

  // Get Lucide Icon for item type
  const getItemIcon = (type) => {
    switch (type) {
      case 'task':
        return <CheckSquare className="card-icon" size={16} />
      case 'appointment':
        return <CalendarDays className="card-icon" size={16} />
      case 'event':
        return <Sparkles className="card-icon" size={16} />
      case 'call':
        return <Phone className="card-icon" size={16} />
      default:
        return <Calendar className="card-icon" size={16} />
    }
  }

  const toggleFilter = (type) => {
    setFilters(prev => ({
      ...prev,
      [type]: !prev[type]
    }))
  }

  return (
    <div className="page-content">
      {/* TOOLBAR CONTROLS */}
      <div className="dashboard-toolbar">
        {/* Navigation */}
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
          <span className="current-week-label">{formatDateRange()}</span>
        </div>

        {/* Filters */}
        <div className="filters-container">
          <button 
            className={`filter-chip ${filters.task ? 'active' : ''}`}
            onClick={() => toggleFilter('task')}
            data-type="task"
          >
            <CheckSquare size={14} /> Tâches
          </button>
          <button 
            className={`filter-chip ${filters.appointment ? 'active' : ''}`}
            onClick={() => toggleFilter('appointment')}
            data-type="appointment"
          >
            <CalendarDays size={14} /> RDV
          </button>
          <button 
            className={`filter-chip ${filters.event ? 'active' : ''}`}
            onClick={() => toggleFilter('event')}
            data-type="event"
          >
            <Sparkles size={14} /> Événements
          </button>
          <button 
            className={`filter-chip ${filters.call ? 'active' : ''}`}
            onClick={() => toggleFilter('call')}
            data-type="call"
          >
            <Phone size={14} /> Appels
          </button>
        </div>

        {/* Search & Actions */}
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
            style={{ padding: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Synchroniser Google Agenda"
          >
            <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
          </button>
          <button className="btn-primary" onClick={() => onAddItem()}>
            <Plus size={18} /> Nouveau
          </button>
        </div>
      </div>

      {/* WEEK GRID (6 COLUMNS) */}
      <div className="week-grid">
        {weekDays.map(day => {
          const dayItems = itemsByDate[day.dateString] || []
          // Sort items by start time
          dayItems.sort((a, b) => a.start_time.localeCompare(b.start_time))

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
                  dayItems.map(item => {
                    const isCompleted = item.status === 'completed'
                    
                    return (
                      <div 
                        key={item.id} 
                        className={`agenda-card ${isCompleted ? 'completed' : ''}`}
                        data-type={item.type}
                        onClick={() => onEditItem(item)}
                        draggable="true"
                        onDragStart={(e) => handleDragStart(e, item)}
                        style={{ cursor: 'grab' }}
                      >
                        <div className="card-header-row">
                          <div className="card-title-group">
                            {getItemIcon(item.type)}
                            <span className="card-title">{item.title}</span>
                          </div>
                          
                          {/* Quick checkmark for tasks */}
                          {item.type === 'task' && (
                            <button 
                              className="quick-complete-btn"
                              onClick={(e) => {
                                e.stopPropagation()
                                onToggleComplete(item)
                              }}
                              title={isCompleted ? "Marquer comme à faire" : "Marquer comme terminé"}
                            >
                              <CheckCircle2 size={12} fill={isCompleted ? "currentColor" : "none"} />
                            </button>
                          )}
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
                                style={{ 
                                  color: 'inherit', 
                                  textDecoration: 'underline', 
                                  display: 'inline-flex', 
                                  gap: '4px', 
                                  alignItems: 'center', 
                                  fontWeight: 'bold'
                                }}
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
                            {item.end_time && ` - ${item.end_time}`}
                          </span>

                          <div className="card-badges">
                            {item.priority === 'urgent' && !isCompleted && (
                              <span className="priority-badge-urgent">Urgent</span>
                            )}
                            
                            {item.google_calendar_id && (
                              <span className="sync-badge" title="Synchronisé avec Google Calendar">
                                G
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
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
    </div>
  )
}
