import React, { useState, useRef, useEffect } from 'react'
import {
  ChevronLeft, ChevronRight,
  Calendar, CheckSquare, CalendarDays, Sparkles, Phone,
  CheckCircle2, Plus, Clock, AlertCircle,
  ShoppingCart, Package, Users, FileText, Factory
} from 'lucide-react'

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
  isMobile
}) {
  const timelineRef = useRef(null)
  const dateStr = formatLocalDate(activeDate)
  const isToday = dateStr === formatLocalDate(new Date())
  const [tempItemUpdates, setTempItemUpdates] = useState(null)

  // Scroll to current time on mount
  useEffect(() => {
    if (!timelineRef.current) return
    const now = new Date()
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    const topOffset = ((nowMinutes - HOUR_START * 60) / 60) * HOUR_HEIGHT - 80
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
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const nowTop = ((nowMinutes - HOUR_START * 60) / 60) * HOUR_HEIGHT
  const showNowLine = isToday && now.getHours() >= HOUR_START && now.getHours() <= HOUR_END

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
        onEditItem(item)
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
    onAddItem(dateStr, categoryId, timeStr)
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
                    {now.getHours().toString().padStart(2,'0')}:{now.getMinutes().toString().padStart(2,'0')}
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
                        const colWidth = `calc((100% - 4px) / ${totalCols})`
                        const colLeft = `calc((100% - 4px) / ${totalCols} * ${col})`
                        const isShort = height < 48

                        const isDragging = tempItemUpdates && tempItemUpdates.id === item.id

                        return (
                          <div
                            key={item.id}
                            className={`day-event-block ${isCompleted ? 'completed' : ''} ${isShort ? 'short' : ''} ${isDragging ? 'dragging' : ''}`}
                            style={{
                              top: top + 'px',
                              height: height + 'px',
                              width: colWidth,
                              left: colLeft,
                              backgroundColor: bg,
                              color: text,
                              borderLeft: `3px solid ${text}`,
                            }}
                            onMouseDown={(e) => handleDragStart(e, item, 'drag')}
                            onTouchStart={(e) => handleDragStart(e, item, 'drag')}
                            title={`${item.start_time}${item.end_time ? ' – ' + item.end_time : ''} · ${item.title}`}
                          >
                            <div className="day-event-header">
                              {getItemIcon(item.type, 12)}
                              <span className="day-event-title">{item.title}</span>
                              {item.type !== 'call' && (
                                <button
                                  className="quick-complete-btn"
                                  style={{ marginLeft: 'auto', padding: '0', opacity: 0.7 }}
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

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
