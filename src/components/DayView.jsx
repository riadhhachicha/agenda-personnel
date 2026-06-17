import React, { useState, useRef, useEffect } from 'react'
import {
  ChevronLeft, ChevronRight,
  Calendar, CheckSquare, CalendarDays, Sparkles, Phone,
  CheckCircle2, Plus, Clock, AlertCircle,
  ShoppingCart, Package, Users, FileText, Factory
} from 'lucide-react'
import ContactAutocomplete from './ContactAutocomplete'

// Defined categories for the multi-column board view
const CATEGORIES = [
  { id: 'achats_divers',        label: 'Achats Divers',        icon: ShoppingCart },
  { id: 'achats_mp',            label: 'Achats MP',            icon: Package },
  { id: 'client',               label: 'Client',               icon: Users },
  { id: 'rendezvous',           label: 'Rendez-vous',          icon: CalendarDays },
  { id: 'tache_administrative', label: 'Admin',                icon: FileText },
  { id: 'tache_usine',          label: 'Usine',                icon: Factory },
  { id: 'call',                 label: 'Appel Tél.',           icon: Phone }
]

// Timeline range
const HOUR_START = 5   // 05:00
const HOUR_END   = 22  // 22:00
const HOUR_HEIGHT = 72 // px per hour

const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i)

const timeToMinutes = (timeStr) => {
  if (!timeStr) return null
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

const minutesToTime = (min) => {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const formatLocalDate = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const getItemIcon = (type, size = 14) => {
  switch (type) {
    case 'achats_divers':        return <ShoppingCart size={size} />
    case 'achats_mp':            return <Package size={size} />
    case 'client':               return <Users size={size} />
    case 'rendezvous':           return <CalendarDays size={size} />
    case 'tache_administrative': return <FileText size={size} />
    case 'tache_usine':          return <Factory size={size} />
    case 'call':                 return <Phone size={size} />
    default:                     return <Calendar size={size} />
  }
}

export default function DayView({
  items,
  activeDate,
  setActiveDate,
  onAddItem,
  onEditItem,
  onToggleComplete,
  onUpdateItemTime,
  isMobile,
  onSave,
  onDelete,
  googleConnected
}) {
  const timelineRef = useRef(null)
  const dateStr = formatLocalDate(activeDate)
  const isToday = dateStr === formatLocalDate(new Date())
  const [tempItemUpdates, setTempItemUpdates] = useState(null)
  const [popover, setPopover] = useState(null)
  const popoverRef = useRef(null)

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
    const startMin = timeToMinutes(item.start_time)
    const endMin = item.end_time ? timeToMinutes(item.end_time) : startMin + 30
    
    const newStart = startMin + 30
    const newEnd = endMin + 30
    
    const maxAllowed = HOUR_END * 60 // 22:00
    let updatedDate = item.date
    let finalStart = newStart
    let finalEnd = newEnd

    if (newStart >= maxAllowed) {
      const d = new Date(item.date)
      d.setDate(d.getDate() + 1)
      updatedDate = formatLocalDate(d)
      finalStart = 9 * 60 // 09:00
      finalEnd = 9 * 60 + (endMin - startMin)
    }

    const updated = {
      ...item,
      date: updatedDate,
      start_time: minutesToTime(finalStart),
      end_time: minutesToTime(finalEnd)
    }
    
    await onSave(updated)
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popover && popoverRef.current && !popoverRef.current.contains(e.target)) {
        if (e.target.closest('.day-view-board-column') || e.target.closest('.day-event-block') || e.target.closest('.modal-overlay')) {
          return
        }
        setPopover(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [popover])

  const handlePopoverSave = () => {
    if (!popover.item.title.trim()) {
      alert('Veuillez entrer un titre.')
      return
    }
    onSave(popover.item)
    setPopover(null)
  }

  // Scroll to current time on mount
  useEffect(() => {
    if (!timelineRef.current) return
    const topOffset = ((currentMinutes - HOUR_START * 60) / 60) * HOUR_HEIGHT - 80
    if (topOffset > 0) {
      timelineRef.current.scrollTo({ top: Math.max(0, topOffset), behavior: 'smooth' })
    }
  }, [dateStr])

  const navigate = (dir) => {
    const d = new Date(activeDate)
    d.setDate(d.getDate() + dir)
    setActiveDate(d)
  }

  const goToday = () => setActiveDate(new Date())

  // Filter items for this day
  const dayItems = items.filter(i => i.date === dateStr)

  // Separate timed vs all-day items
  const timedItems = dayItems.filter(i => i.start_time)
  const allDayItems = dayItems.filter(i => !i.start_time)

  // Current time indicator
  const nowTop = ((currentMinutes - HOUR_START * 60) / 60) * HOUR_HEIGHT
  const showNowLine = isToday && (currentMinutes >= HOUR_START * 60) && (currentMinutes <= HOUR_END * 60)

  const handleDragStart = (e, item, actionType) => {
    if (e.button !== undefined && e.button !== 0) return
    
    e.stopPropagation()
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const startMin = timeToMinutes(item.start_time)
    const endMin = item.end_time ? timeToMinutes(item.end_time) : startMin + 30
    const duration = endMin - startMin

    let hasMoved = false

    const dragSession = {
      itemId: item.id,
      actionType,
      initialClientY: clientY,
      initialStartMin: startMin,
      initialEndMin: endMin,
      initialDuration: duration,
      item
    }

    const handleMove = (moveEvent) => {
      const currentY = moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY
      const currentX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX
      const deltaY = currentY - dragSession.initialClientY

      if (Math.abs(deltaY) > 5) {
        hasMoved = true
      }

      const deltaMin = (deltaY / HOUR_HEIGHT) * 60

      if (dragSession.actionType === 'drag') {
        const rawStart = dragSession.initialStartMin + deltaMin
        let newStart = Math.round(rawStart / 15) * 15
        const minAllowed = HOUR_START * 60
        const maxAllowed = HOUR_END * 60 - dragSession.initialDuration
        newStart = Math.max(minAllowed, Math.min(maxAllowed, newStart))
        const newEnd = newStart + dragSession.initialDuration

        // Horizontal column detection
        let newType = dragSession.item.type
        if (timelineRef.current) {
          const rect = timelineRef.current.getBoundingClientRect()
          const relativeX = currentX - rect.left - 60 // 60px time label spacer
          const pct = relativeX / (rect.width - 60)
          const colIdx = Math.floor(pct * CATEGORIES.length)
          const clampedColIdx = Math.max(0, Math.min(CATEGORIES.length - 1, colIdx))
          newType = CATEGORIES[clampedColIdx].id
          hasMoved = true
        }

        setTempItemUpdates({
          id: dragSession.itemId,
          start_time: minutesToTime(newStart),
          end_time: minutesToTime(newEnd),
          type: newType
        })
      } else if (dragSession.actionType === 'resize') {
        const rawDuration = dragSession.initialDuration + deltaMin
        let newDuration = Math.round(rawDuration / 15) * 15
        newDuration = Math.max(30, newDuration)
        const maxDuration = HOUR_END * 60 - dragSession.initialStartMin
        newDuration = Math.min(maxDuration, newDuration)
        const newEnd = dragSession.initialStartMin + newDuration

        setTempItemUpdates({
          id: dragSession.itemId,
          start_time: minutesToTime(dragSession.initialStartMin),
          end_time: minutesToTime(newEnd),
          type: dragSession.item.type
        })
      }
    }

    const handleEnd = async () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleEnd)

      if (!hasMoved) {
        const layoutItem = layout.find(l => l.item.id === item.id)
        const top = layoutItem ? layoutItem.top : 0
        const catIdx = CATEGORIES.findIndex(cat => cat.id === item.type)
        
        setPopover({
          isNew: false,
          top,
          catIdx,
          catId: item.type,
          item: { ...item }
        })
      } else if (dragSession.itemId) {
        setTempItemUpdates(temp => {
          if (temp && temp.id === dragSession.itemId) {
            onUpdateItemTime(dragSession.item, temp.start_time, temp.end_time, temp.type)
          }
          return null
        })
      }
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleEnd)
  }

  const handleColumnClick = (e, categoryId) => {
    if (e.target !== e.currentTarget) return
    const rect = e.currentTarget.getBoundingClientRect()
    const relativeY = e.clientY - rect.top
    const minutesFromStart = (relativeY / HOUR_HEIGHT) * 60
    const clickedMinutes = HOUR_START * 60 + minutesFromStart
    const snappedMinutes = Math.round(clickedMinutes / 30) * 30
    const clampedMinutes = Math.max(HOUR_START * 60, Math.min(HOUR_END * 60, snappedMinutes))
    const timeStr = minutesToTime(clampedMinutes)

    const top = Math.max(0, ((clampedMinutes - HOUR_START * 60) / 60) * HOUR_HEIGHT)
    const catIdx = CATEGORIES.findIndex(cat => cat.id === categoryId)

    const [h, m] = timeStr.split(':').map(Number)
    const endM = (m + 30) % 60
    const endH = (h + Math.floor((m + 30) / 60)) % 24
    const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`

    setPopover({
      isNew: true,
      top,
      catIdx,
      catId: categoryId,
      item: {
        type: categoryId,
        title: '',
        description: '',
        date: dateStr,
        start_time: timeStr,
        end_time: endTimeStr,
        priority: 'normal',
        status: 'todo',
        reminder_active: false,
        contact_name: '',
        phone_number: '',
        notes: ''
      }
    })
  }

  // Compute item layout (top, height, column for overlapping)
  const computeLayout = (items) => {
    const mapped = items.map(item => {
      if (tempItemUpdates && tempItemUpdates.id === item.id) {
        return {
          ...item,
          start_time: tempItemUpdates.start_time,
          end_time: tempItemUpdates.end_time,
          type: tempItemUpdates.type || item.type
        }
      }
      return item
    })

    const results = []

    // Run layout overlap solver for each category separately
    CATEGORIES.forEach(cat => {
      const catItems = mapped.filter(item => item.type === cat.id)
      const sorted = [...catItems].sort((a, b) => 
        timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
      )

      const placed = sorted.map(item => {
        const startMin = timeToMinutes(item.start_time)
        const endMin = item.end_time ? timeToMinutes(item.end_time) : startMin + 30
        const top = Math.max(0, ((startMin - HOUR_START * 60) / 60) * HOUR_HEIGHT)
        const height = Math.max(36, ((endMin - startMin) / 60) * HOUR_HEIGHT)
        return { item, startMin, endMin, top, height, col: 0, totalCols: 1 }
      })

      for (let i = 0; i < placed.length; i++) {
        const overlappingCols = []
        for (let j = 0; j < i; j++) {
          if (placed[j].endMin > placed[i].startMin && placed[j].startMin < placed[i].endMin) {
            overlappingCols.push(placed[j].col)
          }
        }
        let col = 0
        while (overlappingCols.includes(col)) col++
        placed[i].col = col
      }

      for (let i = 0; i < placed.length; i++) {
        let maxColInGroup = placed[i].col
        for (let j = 0; j < placed.length; j++) {
          if (placed[j].endMin > placed[i].startMin && placed[j].startMin < placed[i].endMin) {
            maxColInGroup = Math.max(maxColInGroup, placed[j].col)
          }
        }
        placed[i].totalCols = maxColInGroup + 1
      }

      results.push(...placed)
    })

    return results
  }

  const layout = computeLayout(timedItems)

  const totalHeight = (HOUR_END - HOUR_START + 1) * HOUR_HEIGHT

  // Type colors mapping the 7 categories
  const typeColors = {
    achats_divers:        { bg: '#E0E7FF', text: '#3730A3' },
    achats_mp:            { bg: '#D1FAE5', text: '#065F46' },
    client:               { bg: '#FEF3C7', text: '#92400E' },
    rendezvous:           { bg: '#FCE7F3', text: '#9D174D' },
    tache_administrative: { bg: '#F3F4F6', text: '#374151' },
    tache_usine:          { bg: '#CFFAFE', text: '#0891B2' },
    call:                 { bg: '#FFE4E6', text: '#9F1239' }
  }

  const getColors = (item) => {
    if (item.custom_color) return { bg: item.custom_color, text: item.custom_color_text || '#000' }
    return typeColors[item.type] || typeColors.rendezvous
  }

  return (
    <div className="page-content day-view-container">

      {/* ── HEADER ── */}
      <div className="day-view-header">
        <div className="day-view-nav">
          <button className="btn-icon" onClick={() => navigate(-1)} title="Jour précédent">
            <ChevronLeft size={20} />
          </button>
          <button className="btn-secondary" onClick={goToday} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
            Aujourd'hui
          </button>
          <button className="btn-icon" onClick={() => navigate(1)} title="Jour suivant">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="day-view-date-display">
          <span className={`day-view-weekday ${isToday ? 'today' : ''}`}>
            {activeDate.toLocaleDateString('fr-FR', { weekday: 'long' })}
          </span>
          <span className={`day-view-daynum ${isToday ? 'today' : ''}`}>
            {activeDate.getDate()}
          </span>
          <span className="day-view-month">
            {activeDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </span>
        </div>

        <button
          className="btn-primary"
          onClick={() => onAddItem(dateStr)}
          style={{ padding: '0.45rem 1rem', gap: '5px', display: 'flex', alignItems: 'center' }}
        >
          <Plus size={16} /> Ajouter
        </button>
      </div>

      {/* ── ALL-DAY ITEMS ── */}
      {allDayItems.length > 0 && (
        <div className="day-view-allday">
          <span className="allday-label">Journée</span>
          <div className="allday-items">
            {allDayItems.map(item => {
              const { bg, text } = getColors(item)
              return (
                <div
                  key={item.id}
                  className="allday-chip"
                  style={{ backgroundColor: bg, color: text }}
                  onClick={() => onEditItem(item)}
                >
                  {getItemIcon(item.type, 12)}
                  <span>{item.title}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── MULTI-COLUMN BOARD ── */}
      <div className="day-view-board-outer">
        <div className="day-view-board">
          
          {/* Header Row */}
          <div className="day-view-board-header">
            <div className="day-view-time-spacer" />
            {CATEGORIES.map(cat => {
              const Icon = cat.icon
              return (
                <div key={cat.id} className="day-view-board-col-title">
                  <Icon size={14} />
                  <span>{cat.label}</span>
                </div>
              )
            })}
          </div>

          {/* Timeline scrollable area */}
          <div className="day-view-timeline-wrap" ref={timelineRef}>
            <div className="day-view-timeline" style={{ height: totalHeight + 'px' }}>

              {/* Hour lines */}
              {HOURS.map(h => (
                <div
                  key={h}
                  className="day-view-hour-row"
                  style={{ top: ((h - HOUR_START) * HOUR_HEIGHT) + 'px', height: HOUR_HEIGHT + 'px' }}
                >
                  <div className="day-view-hour-label">
                    {String(h).padStart(2, '0')}:00
                  </div>
                  <div className="day-view-hour-line" />
                </div>
              ))}

              {/* Half-hour subtle lines */}
              {HOURS.map(h => (
                <div
                  key={`h-${h}`}
                  className="day-view-halfhour-line"
                  style={{ top: ((h - HOUR_START) * HOUR_HEIGHT + HOUR_HEIGHT / 2) + 'px' }}
                />
              ))}

              {/* Current time line */}
              {showNowLine && (
                <div
                  className="day-view-now-line"
                  style={{ top: nowTop + 'px' }}
                >
                  <div className="now-dot" />
                  <div className="now-line" />
                  <span className="now-label">
                    {String(Math.floor(currentMinutes / 60)).padStart(2, '0')}:{String(currentMinutes % 60).padStart(2, '0')}
                  </span>
                </div>
              )}

              {/* Columns container */}
              <div className="day-view-columns-row">
                {CATEGORIES.map((cat, catIdx) => {
                  const catLayout = layout.filter(({ item }) => item.type === cat.id)
                  
                  return (
                    <div
                      key={cat.id}
                      className="day-view-board-column"
                      style={{
                        left: `calc(60px + (100% - 60px) / ${CATEGORIES.length} * ${catIdx})`,
                        width: `calc((100% - 60px) / ${CATEGORIES.length})`
                      }}
                      onClick={(e) => handleColumnClick(e, cat.id)}
                    >
                      {catLayout.map(({ item, top, height, col, totalCols }) => {
                        const { bg, text } = getColors(item)
                        const isCompleted = item.status === 'completed'
                        const colWidth = `calc(100% / ${totalCols})`
                        const colLeft = `calc(100% / ${totalCols} * ${col})`
                        const isShort = height < 48

                        const isDragging = tempItemUpdates && tempItemUpdates.id === item.id

                        const startMin = timeToMinutes(item.start_time)
                        const isBlinking = isToday && currentMinutes >= startMin && !isCompleted && item.status !== 'cancelled'

                        return (
                          <div
                            key={item.id}
                            className={`day-event-block ${isCompleted ? 'completed' : ''} ${isShort ? 'short' : ''} ${isDragging ? 'dragging' : ''} ${isBlinking ? 'arrived-blink' : ''}`}
                            style={{
                              top: top + 'px',
                              height: height + 'px',
                              width: colWidth,
                              left: colLeft,
                              backgroundColor: bg,
                              color: text,
                              borderLeft: `3px solid ${text}`,
                              '--blink-color-rgb': getBlinkColor(item)
                            }}
                            onMouseDown={(e) => handleDragStart(e, item, 'drag')}
                            onTouchStart={(e) => handleDragStart(e, item, 'drag')}
                            title={`${item.start_time}${item.end_time ? ' – ' + item.end_time : ''} · ${item.title}`}
                          >
                            <div className="day-event-header">
                              {getItemIcon(item.type, 12)}
                              <span className="day-event-title">{item.title}</span>
                              {isBlinking && (
                                <button
                                  className="quick-postpone-btn"
                                  style={{ marginLeft: item.type === 'call' ? 'auto' : '0.4rem', marginRight: item.type === 'call' ? '0' : '0.2rem', padding: '0', opacity: 0.8 }}
                                  onClick={e => handlePostponeItem(e, item)}
                                  title="Reporter de 30 min"
                                >
                                  <Clock size={12} />
                                </button>
                              )}
                              {item.type !== 'call' && (
                                <button
                                  className="quick-complete-btn"
                                  style={{ marginLeft: isBlinking ? '0' : 'auto', padding: '0', opacity: 0.7 }}
                                  onClick={e => { e.stopPropagation(); onToggleComplete(item) }}
                                >
                                  <CheckCircle2 size={13} fill={isCompleted ? 'currentColor' : 'none'} />
                                </button>
                              )}
                            </div>
                            {!isShort && (
                              <div className="day-event-time">
                                <Clock size={10} />
                                {item.start_time}{item.end_time ? ` – ${item.end_time}` : ''}
                              </div>
                            )}
                            {!isShort && item.description && (
                              <div className="day-event-desc">{item.description}</div>
                            )}
                            {!isShort && item.type === 'call' && item.contact_name && (
                              <div className="day-event-desc">
                                <Phone size={10} /> {item.contact_name}
                              </div>
                            )}
                            {item.priority === 'urgent' && !isCompleted && (
                              <div className="day-event-urgent"><AlertCircle size={10} /> Urgent</div>
                            )}
                            
                            {/* Resize handle at the bottom */}
                            <div
                              className="day-event-resize-handle"
                              onMouseDown={(e) => handleDragStart(e, item, 'resize')}
                              onTouchStart={(e) => handleDragStart(e, item, 'resize')}
                            />
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>

              {/* Empty state */}
              {dayItems.length === 0 && (
                <div className="day-view-empty">
                  <Calendar size={36} strokeWidth={1.5} />
                  <span>Journée libre</span>
                  <button className="btn-primary" onClick={() => onAddItem(dateStr)}
                    style={{ marginTop: '0.75rem', padding: '0.5rem 1.25rem' }}>
                    <Plus size={15} /> Ajouter un élément
                  </button>
                </div>
              )}

              {/* Popover Editor - La cellule saisie au même niveau mais plus large */}
              {popover && (
                <div
                  ref={popoverRef}
                  className="day-view-popover-editor"
                  style={{
                    top: `${Math.max(0, Math.min(popover.top, totalHeight - (popover.item.type === 'call' ? 420 : 360) - 10))}px`,
                    left: popover.catIdx < 4 
                      ? `calc(60px + (100% - 60px) / ${CATEGORIES.length} * ${popover.catIdx})`
                      : `calc(60px + (100% - 60px) / ${CATEGORIES.length} * ${popover.catIdx + 1} - 340px)`,
                    '--category-color': (getColors(popover.item).bg)
                  }}
                >
                  {/* Category switcher row */}
                  <div className="popover-category-row">
                    {CATEGORIES.map(cat => {
                      const Icon = cat.icon
                      const isSelected = popover.item.type === cat.id
                      const catColors = typeColors[cat.id] || typeColors.rendezvous
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          className={`popover-category-btn ${isSelected ? 'selected' : ''}`}
                          style={{
                            backgroundColor: isSelected ? catColors.bg : 'var(--bg-app)',
                            color: isSelected ? catColors.text : 'var(--text-muted)',
                            borderColor: isSelected ? catColors.text : 'var(--border-light)'
                          }}
                          onClick={() => {
                            setPopover(prev => ({
                              ...prev,
                              catId: cat.id,
                              catIdx: CATEGORIES.findIndex(c => c.id === cat.id),
                              item: { ...prev.item, type: cat.id }
                            }))
                          }}
                          title={cat.label}
                        >
                          <Icon size={16} />
                        </button>
                      )
                    })}
                  </div>

                  {/* Title input */}
                  <div>
                    <label className="popover-field-label">Titre *</label>
                    <input
                      type="text"
                      className="form-control compact"
                      placeholder="Ex: Réunion, Achat..."
                      value={popover.item.title || ''}
                      onChange={(e) => setPopover(prev => ({
                        ...prev,
                        item: { ...prev.item, title: e.target.value }
                      }))}
                      autoFocus
                      required
                    />
                  </div>

                  {/* Date & Time range */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.4rem' }}>
                    <div>
                      <label className="popover-field-label">Date</label>
                      <input
                        type="date"
                        className="form-control compact"
                        value={popover.item.date || ''}
                        onChange={(e) => setPopover(prev => ({
                          ...prev,
                          item: { ...prev.item, date: e.target.value }
                        }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="popover-field-label">Début</label>
                      <input
                        type="time"
                        className="form-control compact"
                        value={popover.item.start_time || ''}
                        onChange={(e) => setPopover(prev => ({
                          ...prev,
                          item: { ...prev.item, start_time: e.target.value }
                        }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="popover-field-label">Fin</label>
                      <input
                        type="time"
                        className="form-control compact"
                        value={popover.item.end_time || ''}
                        onChange={(e) => setPopover(prev => ({
                          ...prev,
                          item: { ...prev.item, end_time: e.target.value }
                        }))}
                      />
                    </div>
                  </div>

                  {/* Contact Autocomplete for call category */}
                  {popover.item.type === 'call' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div>
                        <label className="popover-field-label">Contact</label>
                        <ContactAutocomplete
                          value={popover.item.contact_name}
                          phoneValue={popover.item.phone_number}
                          onNameChange={(val) => setPopover(prev => ({
                            ...prev,
                            item: { ...prev.item, contact_name: val }
                          }))}
                          onPhoneChange={(val) => setPopover(prev => ({
                            ...prev,
                            item: { ...prev.item, phone_number: val }
                          }))}
                          onContactSelect={({ name, phone }) => {
                            setPopover(prev => ({
                              ...prev,
                              item: { ...prev.item, contact_name: name, phone_number: phone }
                            }))
                          }}
                          googleConnected={googleConnected}
                        />
                      </div>
                      <div>
                        <label className="popover-field-label">Numéro</label>
                        <input
                          type="tel"
                          className="form-control compact"
                          placeholder="Ex: +33..."
                          value={popover.item.phone_number || ''}
                          onChange={(e) => setPopover(prev => ({
                            ...prev,
                            item: { ...prev.item, phone_number: e.target.value }
                          }))}
                        />
                      </div>
                    </div>
                  )}

                  {/* Description input */}
                  <div>
                    <label className="popover-field-label">Description</label>
                    <textarea
                      className="form-control compact"
                      placeholder="Détails (optionnel)..."
                      value={popover.item.description || ''}
                      onChange={(e) => setPopover(prev => ({
                        ...prev,
                        item: { ...prev.item, description: e.target.value }
                      }))}
                      rows={2}
                      style={{ resize: 'none' }}
                    />
                  </div>

                  {/* Priority & Status */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label className="popover-field-label">Priorité</label>
                      <select
                        className="form-control compact"
                        value={popover.item.priority || 'normal'}
                        onChange={(e) => setPopover(prev => ({
                          ...prev,
                          item: { ...prev.item, priority: e.target.value }
                        }))}
                      >
                        <option value="low">Basse</option>
                        <option value="normal">Normale</option>
                        <option value="urgent">Urgente</option>
                      </select>
                    </div>
                    <div>
                      <label className="popover-field-label">Statut</label>
                      <select
                        className="form-control compact"
                        value={popover.item.status || 'todo'}
                        onChange={(e) => setPopover(prev => ({
                          ...prev,
                          item: { ...prev.item, status: e.target.value }
                        }))}
                      >
                        <option value="todo">À faire</option>
                        <option value="in_progress">En cours</option>
                        <option value="completed">Terminé</option>
                        <option value="cancelled">Annulé</option>
                      </select>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', gap: '0.5rem' }}>
                    <div>
                      {!popover.isNew && (
                        <button
                          type="button"
                          className="btn-danger-outline compact-btn"
                          onClick={() => {
                            if (window.confirm('Voulez-vous supprimer cet élément ?')) {
                              onDelete(popover.item.id)
                              setPopover(null)
                            }
                          }}
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn-secondary compact-btn"
                        onClick={() => setPopover(null)}
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        className="btn-primary compact-btn"
                        onClick={handlePopoverSave}
                      >
                        Enregistrer
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
