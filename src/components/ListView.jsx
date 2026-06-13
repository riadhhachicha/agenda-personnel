import React, { useState } from 'react'
import { 
  Search, 
  Filter, 
  Calendar, 
  CheckSquare, 
  CalendarDays, 
  Sparkles, 
  Phone,
  ArrowUpDown,
  ExternalLink,
  Edit2
} from 'lucide-react'

export default function ListView({ items, onEditItem }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortField, setSortField] = useState('date')
  const [sortAsc, setSortAsc] = useState(true)

  // Filter items
  const filtered = items.filter(item => {
    // Search term
    const matchesSearch = searchTerm.trim() === '' || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.contact_name && item.contact_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.phone_number && item.phone_number.toLowerCase().includes(searchTerm.toLowerCase()))

    // Type filter
    const matchesType = typeFilter === 'all' || item.type === typeFilter

    // Priority filter
    const matchesPriority = priorityFilter === 'all' || item.priority === priorityFilter

    // Status filter
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter

    return matchesSearch && matchesType && matchesPriority && matchesStatus
  })

  // Sort items
  const sorted = [...filtered].sort((a, b) => {
    let comparison = 0
    if (sortField === 'date') {
      comparison = a.date.localeCompare(b.date)
      if (comparison === 0) {
        comparison = a.start_time.localeCompare(b.start_time)
      }
    } else if (sortField === 'title') {
      comparison = a.title.localeCompare(b.title)
    } else if (sortField === 'type') {
      comparison = a.type.localeCompare(b.type)
    } else if (sortField === 'priority') {
      // Map priorities for logic comparison
      const priorityWeight = { low: 1, normal: 2, urgent: 3 }
      comparison = (priorityWeight[a.priority] || 2) - (priorityWeight[b.priority] || 2)
    } else if (sortField === 'status') {
      comparison = a.status.localeCompare(b.status)
    }

    return sortAsc ? comparison : -comparison
  })

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  const getTypeLabel = (type) => {
    switch (type) {
      case 'task': return 'Tâche'
      case 'appointment': return 'RDV'
      case 'event': return 'Événement'
      case 'call': return 'Appel'
      default: return type
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'task': return <CheckSquare size={14} style={{ color: 'var(--color-task-text)' }} />
      case 'appointment': return <CalendarDays size={14} style={{ color: 'var(--color-appointment-text)' }} />
      case 'event': return <Sparkles size={14} style={{ color: 'var(--color-event-text)' }} />
      case 'call': return <Phone size={14} style={{ color: 'var(--color-call-text)' }} />
      default: return <Calendar size={14} />
    }
  }

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'low': return 'badge badge-low'
      case 'urgent': return 'badge badge-urgent'
      default: return 'badge badge-normal'
    }
  }

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'low': return 'Basse'
      case 'urgent': return 'Urgente'
      default: return 'Normale'
    }
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'todo': return 'badge status-todo'
      case 'in_progress': return 'badge status-in-progress'
      case 'completed': return 'badge status-completed'
      case 'cancelled': return 'badge status-cancelled'
      default: return 'badge'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'todo': return 'À faire'
      case 'in_progress': return 'En cours'
      case 'completed': return 'Terminé'
      case 'cancelled': return 'Annulé'
      default: return status
    }
  }

  return (
    <div className="page-content" style={{ gap: '1rem' }}>
      {/* FILTER PANEL */}
      <div className="dashboard-toolbar" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        {/* Search */}
        <div className="search-box" style={{ flexGrow: 1 }}>
          <Search size={16} />
          <input 
            type="text" 
            placeholder="Rechercher par titre, description, contact..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Type Select */}
          <select 
            className="form-control" 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ padding: '0.45rem 0.75rem', background: 'white', minWidth: '120px' }}
          >
            <option value="all">Tous les types</option>
            <option value="task">Tâches</option>
            <option value="appointment">RDV</option>
            <option value="event">Événements</option>
            <option value="call">Appels</option>
          </select>

          {/* Priority Select */}
          <select 
            className="form-control" 
            value={priorityFilter} 
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{ padding: '0.45rem 0.75rem', background: 'white', minWidth: '120px' }}
          >
            <option value="all">Toutes priorités</option>
            <option value="low">Basse</option>
            <option value="normal">Normale</option>
            <option value="urgent">Urgente</option>
          </select>

          {/* Status Select */}
          <select 
            className="form-control" 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '0.45rem 0.75rem', background: 'white', minWidth: '120px' }}
          >
            <option value="all">Tous statuts</option>
            <option value="todo">À faire</option>
            <option value="in_progress">En cours</option>
            <option value="completed">Terminé</option>
            <option value="cancelled">Annulé</option>
          </select>
        </div>
      </div>

      {/* ITEMS LIST TABLE */}
      <div className="table-container">
        {sorted.length > 0 ? (
          <table className="list-table">
            <thead>
              <tr>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('type')}>
                  Type <ArrowUpDown size={12} style={{ marginLeft: '4px' }} />
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('title')}>
                  Titre <ArrowUpDown size={12} style={{ marginLeft: '4px' }} />
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('date')}>
                  Date & Heure <ArrowUpDown size={12} style={{ marginLeft: '4px' }} />
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('priority')}>
                  Priorité <ArrowUpDown size={12} style={{ marginLeft: '4px' }} />
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('status')}>
                  Statut <ArrowUpDown size={12} style={{ marginLeft: '4px' }} />
                </th>
                <th>Détails / Contacts</th>
                <th>Google</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(item => (
                <tr key={item.id}>
                  {/* Type */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {getTypeIcon(item.type)}
                      <span>{getTypeLabel(item.type)}</span>
                    </div>
                  </td>
                  
                  {/* Title */}
                  <td>
                    <span style={{ fontWeight: '600' }}>{item.title}</span>
                  </td>

                  {/* Date & Time */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>
                        {new Date(item.date).toLocaleDateString('fr-FR', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {item.start_time} {item.end_time && ` - ${item.end_time}`}
                      </span>
                    </div>
                  </td>

                  {/* Priority */}
                  <td>
                    <span className={getPriorityBadgeClass(item.priority)}>
                      {getPriorityLabel(item.priority)}
                    </span>
                  </td>

                  {/* Status */}
                  <td>
                    <span className={getStatusBadgeClass(item.status)}>
                      {getStatusLabel(item.status)}
                    </span>
                  </td>

                  {/* Details / Contacts */}
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '200px' }}>
                    {item.type === 'call' && (item.contact_name || item.phone_number) && (
                      <div style={{ marginBottom: '0.3rem' }}>
                        {item.contact_name && (
                          <div style={{ fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.1rem' }}>
                            👤 {item.contact_name}
                          </div>
                        )}
                        {item.phone_number && (
                          <a 
                            href={`tel:${item.phone_number}`}
                            onClick={(e) => e.stopPropagation()}
                            style={{ 
                              color: 'var(--primary)', 
                              textDecoration: 'underline', 
                              fontWeight: '600',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px' 
                            }}
                            title="Appeler directement"
                          >
                            📞 {item.phone_number}
                          </a>
                        )}
                      </div>
                    )}
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.description || item.notes || ''}>
                      {item.description || item.notes || '-'}
                    </div>
                  </td>

                  {/* Google Calendar Link */}
                  <td>
                    {item.google_calendar_id ? (
                      <a 
                        href={item.google_calendar_link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        title="Voir dans Google Agenda"
                        style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center' }}
                      >
                        <ExternalLink size={14} />
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>Non synchro</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td>
                    <button 
                      className="btn-icon" 
                      onClick={() => onEditItem(item)}
                      style={{ width: '30px', height: '30px' }}
                      title="Modifier"
                    >
                      <Edit2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Calendar size={36} strokeWidth={1.5} style={{ margin: '0 auto 0.75rem', color: 'var(--text-light)' }} />
            <p style={{ fontWeight: '600' }}>Aucun élément trouvé</p>
            <p style={{ fontSize: '0.85rem' }}>Essayez de modifier vos filtres ou d'effectuer une autre recherche.</p>
          </div>
        )}
      </div>
    </div>
  )
}
