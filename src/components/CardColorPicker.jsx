import React, { useState, useEffect, useRef, useCallback } from 'react'
import { X, Palette, RotateCcw } from 'lucide-react'

// ─── Palette de couleurs prédéfinies ──────────────────────────────────────────
const PRESET_COLORS = [
  // Bleus & violets
  { bg: '#E0E7FF', text: '#3730a3' },
  { bg: '#ddd6fe', text: '#5b21b6' },
  { bg: '#ede9fe', text: '#6d28d9' },
  { bg: '#e0f2fe', text: '#0369a1' },
  { bg: '#bfdbfe', text: '#1d4ed8' },
  { bg: '#cffafe', text: '#0e7490' },
  // Verts
  { bg: '#D1FAE5', text: '#065F46' },
  { bg: '#bbf7d0', text: '#15803d' },
  { bg: '#d9f99d', text: '#4d7c0f' },
  { bg: '#fef9c3', text: '#854d0e' },
  // Oranges & rouges
  { bg: '#FEF3C7', text: '#92400E' },
  { bg: '#fed7aa', text: '#9a3412' },
  { bg: '#FFE4E6', text: '#9F1239' },
  { bg: '#fecdd3', text: '#be123c' },
  { bg: '#fee2e2', text: '#b91c1c' },
  // Neutres & ardoise
  { bg: '#f1f5f9', text: '#334155' },
  { bg: '#e2e8f0', text: '#1e293b' },
  { bg: '#fdf4ff', text: '#7e22ce' },
]

export default function CardColorPicker({ 
  item,           // The item being colored
  anchorRect,     // DOMRect of the card (for desktop positioning)
  onApply,        // (customColor, customColorText) => void
  onReset,        // () => void
  onClose,        // () => void
}) {
  const popupRef = useRef(null)

  // Local state for the selected colors
  const [selectedBg, setSelectedBg] = useState(item.custom_color || null)
  const [selectedText, setSelectedText] = useState(item.custom_color_text || null)
  const [customBg, setCustomBg] = useState(item.custom_color || '#ffffff')
  const [customText, setCustomText] = useState(item.custom_color_text || '#000000')

  // Position the popup near the card on desktop
  const [style, setStyle] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!anchorRect || !popupRef.current) return
    const popup = popupRef.current
    const vw = window.innerWidth
    const vh = window.innerHeight
    const popW = popup.offsetWidth || 270
    const popH = popup.offsetHeight || 340

    let top = anchorRect.bottom + 8
    let left = anchorRect.left

    // Clamp horizontally
    if (left + popW > vw - 16) left = vw - popW - 16
    if (left < 16) left = 16

    // Flip above if not enough space below
    if (top + popH > vh - 16) top = anchorRect.top - popH - 8
    if (top < 16) top = 16

    setStyle({ top, left })
  }, [anchorRect])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        onClose()
      }
    }
    // Delay slightly so the double-click that opened it doesn't immediately close it
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 100)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handler)
    }
  }, [onClose])

  // Escape key closes
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSwatchClick = (preset) => {
    setSelectedBg(preset.bg)
    setSelectedText(preset.text)
    setCustomBg(preset.bg)
    setCustomText(preset.text)
  }

  const handleCustomBgChange = (e) => {
    setCustomBg(e.target.value)
    setSelectedBg(e.target.value)
  }

  const handleCustomTextChange = (e) => {
    setCustomText(e.target.value)
    setSelectedText(e.target.value)
  }

  const handleApply = () => {
    onApply(selectedBg || customBg, selectedText || customText)
    onClose()
  }

  const handleReset = () => {
    onReset()
    onClose()
  }

  const isMobile = window.innerWidth <= 768

  return (
    <div
      ref={popupRef}
      className="color-picker-popup"
      style={isMobile ? {} : style}
      role="dialog"
      aria-label="Choisir une couleur"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="color-picker-popup-header">
        <span className="color-picker-popup-title">
          <Palette size={13} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
          Couleur de la carte
        </span>
        <button className="color-picker-popup-close" onClick={onClose} aria-label="Fermer">
          <X size={14} />
        </button>
      </div>

      {/* Preset swatches */}
      <div className="color-swatches-grid">
        {PRESET_COLORS.map((preset, i) => (
          <button
            key={i}
            className={`color-swatch-btn ${selectedBg === preset.bg ? 'active' : ''}`}
            style={{ backgroundColor: preset.bg }}
            onClick={() => handleSwatchClick(preset)}
            title={preset.bg}
            aria-label={`Couleur ${preset.bg}`}
            aria-pressed={selectedBg === preset.bg}
          />
        ))}
      </div>

      {/* Custom color pickers */}
      <div className="color-picker-custom-row">
        <label htmlFor={`cp-bg-${item.id}`}>Fond</label>
        <input
          id={`cp-bg-${item.id}`}
          type="color"
          value={customBg}
          onChange={handleCustomBgChange}
          title="Couleur de fond personnalisée"
        />
        <label htmlFor={`cp-text-${item.id}`} style={{ marginLeft: '0.4rem' }}>Texte</label>
        <input
          id={`cp-text-${item.id}`}
          type="color"
          value={customText}
          onChange={handleCustomTextChange}
          title="Couleur du texte personnalisée"
        />
      </div>

      {/* Preview */}
      {(selectedBg || customBg) && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '10px',
            backgroundColor: selectedBg || customBg,
            color: selectedText || customText || '#000',
            fontSize: '0.8rem',
            fontWeight: '600',
            marginBottom: '0.85rem',
            border: '1px solid rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <span>✦</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.title}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="color-picker-actions">
        <button className="btn-reset" onClick={handleReset} title="Remettre la couleur par défaut">
          <RotateCcw size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
          Défaut
        </button>
        <button className="btn-apply" onClick={handleApply}>
          ✓ Appliquer
        </button>
      </div>
    </div>
  )
}
