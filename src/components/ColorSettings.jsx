import React, { useState } from 'react'
import { 
  ShoppingCart, 
  Package, 
  Users, 
  CalendarDays, 
  FileText, 
  Factory, 
  Phone,
  RotateCcw,
  Save,
  Check
} from 'lucide-react'

const DEFAULT_COLORS = {
  achats_divers: '#E0E7FF',
  achats_divers_text: '#3730A3',
  achats_mp: '#D1FAE5',
  achats_mp_text: '#065F46',
  client: '#FEF3C7',
  client_text: '#92400E',
  rendezvous: '#FCE7F3',
  rendezvous_text: '#9D174D',
  tache_administrative: '#F3F4F6',
  tache_administrative_text: '#374151',
  tache_usine: '#CFFAFE',
  tache_usine_text: '#0891B2',
  call: '#FFE4E6',
  call_text: '#9F1239'
}

const CATEGORY_ITEMS = [
  { key: 'achats_divers',        textKey: 'achats_divers_text',        label: 'Achats Divers',        icon: ShoppingCart },
  { key: 'achats_mp',            textKey: 'achats_mp_text',            label: 'Achats MP',            icon: Package },
  { key: 'client',               textKey: 'client_text',               label: 'Client',               icon: Users },
  { key: 'rendezvous',           textKey: 'rendezvous_text',           label: 'Rendez-vous',          icon: CalendarDays },
  { key: 'tache_administrative', textKey: 'tache_administrative_text', label: 'Tâche Administrative', icon: FileText },
  { key: 'tache_usine',          textKey: 'tache_usine_text',          label: 'Tâche Usine',          icon: Factory },
  { key: 'call',                 textKey: 'call_text',                 label: 'Appel Téléphonique',   icon: Phone }
]

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
          Définissez une couleur de fond et une couleur de texte unique pour chaque catégorie de votre agenda. Cela permet d'identifier visuellement et instantanément vos différents éléments sur l'agenda hebdomadaire et journalier.
        </p>
      </div>

      <div className="color-picker-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
        {CATEGORY_ITEMS.map(cat => {
          const Icon = cat.icon
          const bgVal = activeColors[cat.key] || DEFAULT_COLORS[cat.key]
          const textVal = activeColors[cat.textKey] || DEFAULT_COLORS[cat.textKey]
          
          return (
            <div key={cat.key} className="color-picker-item" style={{ border: '1px solid var(--border-light)', padding: '1rem', borderRadius: '12px' }}>
              <div className="color-picker-header" style={{ color: textVal, display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', marginBottom: '0.75rem' }}>
                <Icon size={18} />
                <span>{cat.label}</span>
              </div>
              <div className="color-controls" style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                <div className="color-input-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <input 
                    type="color" 
                    className="color-box"
                    value={bgVal} 
                    onChange={(e) => handleColorChange(cat.key, e.target.value)} 
                    style={{ cursor: 'pointer', border: 'none', width: '40px', height: '30px', borderRadius: '4px' }}
                  />
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fond</label>
                </div>
                <div className="color-input-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <input 
                    type="color" 
                    className="color-box"
                    value={textVal} 
                    onChange={(e) => handleColorChange(cat.textKey, e.target.value)} 
                    style={{ cursor: 'pointer', border: 'none', width: '40px', height: '30px', borderRadius: '4px' }}
                  />
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Texte</label>
                </div>
              </div>
              {/* Card Preview */}
              <div className="color-preview-card" style={{ backgroundColor: bgVal, color: textVal, padding: '0.5rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon size={14} />
                <span style={{ fontSize: '0.78rem', fontWeight: 'bold' }}>Exemple {cat.label}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ACTION BUTTONS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
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
