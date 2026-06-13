import React, { useState } from 'react'
import { 
  CheckSquare, 
  CalendarDays, 
  Sparkles, 
  Phone,
  RotateCcw,
  Save,
  Check
} from 'lucide-react'

const DEFAULT_COLORS = {
  task: '#E0E7FF',
  task_text: '#4338CA',
  appointment: '#D1FAE5',
  appointment_text: '#065F46',
  event: '#FEF3C7',
  event_text: '#92400E',
  call: '#FFE4E6',
  call_text: '#9F1239'
}

export default function ColorSettings({ colors, onSaveColors }) {
  const [activeColors, setActiveColors] = useState({ ...colors })
  const [saved, setSaved] = useState(false)

  const handleColorChange = (key, value) => {
    setActiveColors(prev => ({
      ...prev,
      [key]: value
    }))
    setSaved(false)
  }

  const handleSave = () => {
    onSaveColors(activeColors)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleReset = () => {
    if (window.confirm('Voulez-vous restaurer les couleurs par défaut ?')) {
      setActiveColors({ ...DEFAULT_COLORS })
      onSaveColors(DEFAULT_COLORS)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <div className="settings-card">
      <div>
        <h2 className="settings-section-title">Personnalisation des couleurs</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Définissez une couleur de fond et une couleur de texte unique pour chaque catégorie. Cela permet d'identifier visuellement et instantanément vos différents éléments sur l'agenda hebdomadaire.
        </p>
      </div>

      <div className="color-picker-grid">
        {/* TASKS */}
        <div className="color-picker-item">
          <div className="color-picker-header" style={{ color: activeColors.task_text }}>
            <CheckSquare size={18} />
            <span>Tâches</span>
          </div>
          <div className="color-controls">
            <div className="color-input-wrapper">
              <input 
                type="color" 
                className="color-box"
                value={activeColors.task} 
                onChange={(e) => handleColorChange('task', e.target.value)} 
              />
              <label>Fond</label>
            </div>
            <div className="color-input-wrapper">
              <input 
                type="color" 
                className="color-box"
                value={activeColors.task_text} 
                onChange={(e) => handleColorChange('task_text', e.target.value)} 
              />
              <label>Texte</label>
            </div>
          </div>
          {/* Card Preview */}
          <div className="color-preview-card" style={{ backgroundColor: activeColors.task, color: activeColors.task_text }}>
            <CheckSquare size={14} />
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Exemple Tâche</span>
          </div>
        </div>

        {/* APPOINTMENTS */}
        <div className="color-picker-item">
          <div className="color-picker-header" style={{ color: activeColors.appointment_text }}>
            <CalendarDays size={18} />
            <span>Rendez-vous</span>
          </div>
          <div className="color-controls">
            <div className="color-input-wrapper">
              <input 
                type="color" 
                className="color-box"
                value={activeColors.appointment} 
                onChange={(e) => handleColorChange('appointment', e.target.value)} 
              />
              <label>Fond</label>
            </div>
            <div className="color-input-wrapper">
              <input 
                type="color" 
                className="color-box"
                value={activeColors.appointment_text} 
                onChange={(e) => handleColorChange('appointment_text', e.target.value)} 
              />
              <label>Texte</label>
            </div>
          </div>
          <div className="color-preview-card" style={{ backgroundColor: activeColors.appointment, color: activeColors.appointment_text }}>
            <CalendarDays size={14} />
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Exemple Rendez-vous</span>
          </div>
        </div>

        {/* EVENTS */}
        <div className="color-picker-item">
          <div className="color-picker-header" style={{ color: activeColors.event_text }}>
            <Sparkles size={18} />
            <span>Événements</span>
          </div>
          <div className="color-controls">
            <div className="color-input-wrapper">
              <input 
                type="color" 
                className="color-box"
                value={activeColors.event} 
                onChange={(e) => handleColorChange('event', e.target.value)} 
              />
              <label>Fond</label>
            </div>
            <div className="color-input-wrapper">
              <input 
                type="color" 
                className="color-box"
                value={activeColors.event_text} 
                onChange={(e) => handleColorChange('event_text', e.target.value)} 
              />
              <label>Texte</label>
            </div>
          </div>
          <div className="color-preview-card" style={{ backgroundColor: activeColors.event, color: activeColors.event_text }}>
            <Sparkles size={14} />
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Exemple Événement</span>
          </div>
        </div>

        {/* CALLS */}
        <div className="color-picker-item">
          <div className="color-picker-header" style={{ color: activeColors.call_text }}>
            <Phone size={18} />
            <span>Appels Téléphoniques</span>
          </div>
          <div className="color-controls">
            <div className="color-input-wrapper">
              <input 
                type="color" 
                className="color-box"
                value={activeColors.call} 
                onChange={(e) => handleColorChange('call', e.target.value)} 
              />
              <label>Fond</label>
            </div>
            <div className="color-input-wrapper">
              <input 
                type="color" 
                className="color-box"
                value={activeColors.call_text} 
                onChange={(e) => handleColorChange('call_text', e.target.value)} 
              />
              <label>Texte</label>
            </div>
          </div>
          <div className="color-preview-card" style={{ backgroundColor: activeColors.call, color: activeColors.call_text }}>
            <Phone size={14} />
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Exemple Appel</span>
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
        <button className="btn-secondary" onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <RotateCcw size={16} /> Restaurer par défaut
        </button>

        <button className="btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {saved ? <Check size={16} /> : <Save size={16} />}
          {saved ? 'Enregistré !' : 'Enregistrer les couleurs'}
        </button>
      </div>
    </div>
  )
}
