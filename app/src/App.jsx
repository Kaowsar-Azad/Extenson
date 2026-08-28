import { useState, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import Scene from './Scene'

export const MATERIAL_STYLES = [
  { id: 0, name: '💎 Holographic Crystal', desc: "Reference 'S' Prismatic Glass" },
  { id: 1, name: '🪞 Liquid Chrome Y2K', desc: "Reference '5' Metallic Iridescent" },
  { id: 2, name: '🎨 Risograph Velvet', desc: "Reference 'A' Grain Duo-Tone" },
  { id: 3, name: '⚡ Cyber Obsidian', desc: 'Dark Glass with Neon Lasers' }
]

export const PRESETS = [
  {
    name: 'Spectral Prism (Ref S)',
    styleId: 0,
    topLeft: '#ff5500',
    bottomLeft: '#ff007f',
    bottomCurve: '#00e5ff',
    topRight: '#a855f7',
    bodyStart: '#081426',
    bodyMid: '#123258',
    bodyEnd: '#0a1d33',
    bodyAngle: 45,
    accent: '#ffee00'
  },
  {
    name: 'Liquid Chrome (Ref 5)',
    styleId: 1,
    topLeft: '#e0e7ff',
    bottomLeft: '#c084fc',
    bottomCurve: '#38bdf8',
    topRight: '#fbbf24',
    bodyStart: '#1e293b',
    bodyMid: '#475569',
    bodyEnd: '#0f172a',
    bodyAngle: 90,
    accent: '#ffffff'
  },
  {
    name: 'Cobalt Risograph (Ref A)',
    styleId: 2,
    topLeft: '#1d4ed8',
    bottomLeft: '#2563eb',
    bottomCurve: '#f472b6',
    topRight: '#60a5fa',
    bodyStart: '#1e40af',
    bodyMid: '#2563eb',
    bodyEnd: '#1d4ed8',
    bodyAngle: 120,
    accent: '#fecdd3'
  },
  {
    name: 'Holo Rainbow Gradient',
    styleId: 0,
    topLeft: '#ff007f',
    bottomLeft: '#7928ca',
    bottomCurve: '#00f0ff',
    topRight: '#ffaa00',
    bodyStart: '#ff007f',
    bodyMid: '#7928ca',
    bodyEnd: '#00f0ff',
    bodyAngle: 45,
    accent: '#00ffcc'
  },
  {
    name: 'Sunset Coral Gradient',
    styleId: 0,
    topLeft: '#ff6b6b',
    bottomLeft: '#ff007f',
    bottomCurve: '#feca57',
    topRight: '#5f27cd',
    bodyStart: '#ff007f',
    bodyMid: '#ff7675',
    bodyEnd: '#fdcb6e',
    bodyAngle: 60,
    accent: '#ff9ff3'
  },
  {
    name: 'Cosmic Violet Gradient',
    styleId: 0,
    topLeft: '#8b5cf6',
    bottomLeft: '#ec4899',
    bottomCurve: '#06b6d4',
    topRight: '#3b82f6',
    bodyStart: '#4c1d95',
    bodyMid: '#8b5cf6',
    bodyEnd: '#06b6d4',
    bodyAngle: 135,
    accent: '#a855f7'
  },
  {
    name: 'Emerald Aura Gradient',
    styleId: 0,
    topLeft: '#00f5a0',
    bottomLeft: '#00d2ff',
    bottomCurve: '#10b981',
    topRight: '#facc15',
    bodyStart: '#064e3b',
    bodyMid: '#059669',
    bodyEnd: '#10b981',
    bodyAngle: 45,
    accent: '#38bdf8'
  },
  {
    name: 'Royal Gold & Bronze',
    styleId: 0,
    topLeft: '#fbbf24',
    bottomLeft: '#d97706',
    bottomCurve: '#fde047',
    topRight: '#b45309',
    bodyStart: '#78350f',
    bodyMid: '#b45309',
    bodyEnd: '#f59e0b',
    bodyAngle: 45,
    accent: '#fef08a'
  },
  {
    name: 'Rose Quartz & Opal',
    styleId: 0,
    topLeft: '#fbbf24',
    bottomLeft: '#fb7185',
    bottomCurve: '#38bdf8',
    topRight: '#f472b6',
    bodyStart: '#4c0519',
    bodyMid: '#be123c',
    bodyEnd: '#fda4af',
    bodyAngle: 90,
    accent: '#fff1f2'
  },
  {
    name: 'Glacial Ice Gradient',
    styleId: 0,
    topLeft: '#38bdf8',
    bottomLeft: '#0284c7',
    bottomCurve: '#22d3ee',
    topRight: '#a5f3fc',
    bodyStart: '#082f49',
    bodyMid: '#0284c7',
    bodyEnd: '#38bdf8',
    bodyAngle: 45,
    accent: '#e0f2fe'
  }
]

const hslToHex = (h, s, l) => {
  l /= 100
  const a = (s * Math.min(l, 1 - l)) / 100
  const f = n => {
    const k = (n + (h % 360) / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function App() {
  const [text, setText] = useState('S')
  const [styleMode, setStyleMode] = useState(0)
  const [colors, setColors] = useState(PRESETS[0])

  const handleDownload = () => {
    const canvas = document.querySelector('canvas')
    if (canvas) {
      const link = document.createElement('a')
      link.download = `3D-Type-${text || 'Asset'}-${colors.name.replace(/[^a-zA-Z0-9]/g, '-')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
  }

  // Stock-grade harmonized gradient randomizer
  const handleRandomize = () => {
    const baseHue = Math.floor(Math.random() * 360)
    const angle = Math.floor(Math.random() * 8) * 45

    setColors({
      name: 'Custom Random',
      styleId: styleMode,
      topLeft: hslToHex(baseHue, 100, 50),
      bottomLeft: hslToHex(baseHue + 95, 100, 50),
      bottomCurve: hslToHex(baseHue + 190, 100, 50),
      topRight: hslToHex(baseHue + 285, 100, 50),
      bodyStart: hslToHex(baseHue, 70, 15),
      bodyMid: hslToHex(baseHue + 60, 85, 30),
      bodyEnd: hslToHex(baseHue + 120, 80, 20),
      bodyAngle: angle,
      accent: hslToHex(baseHue + 45, 100, 60)
    })
  }

  const updateColor = (key, val) => {
    setColors(prev => ({
      ...prev,
      name: 'Custom',
      [key]: val
    }))
  }

  const selectPreset = (p) => {
    setColors(p)
    if (p.styleId !== undefined) {
      setStyleMode(p.styleId)
    }
  }

  return (
    <>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 38 }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <Scene text={text} colors={colors} styleMode={styleMode} />
        </Suspense>
      </Canvas>

      <div className="ui-container">
        {/* Top Header & Navigation Bar */}
        <div className="header-region">
          <div className="top-bar">
            <div className="header">
              <h1>3D Typography Studio</h1>
              <p>Adobe Stock & Shutterstock Ready</p>
            </div>

            {/* Material Styles Selector */}
            <div className="styles-bar">
              {MATERIAL_STYLES.map((s) => (
                <button
                  key={s.id}
                  className={`style-chip ${styleMode === s.id ? 'active' : ''}`}
                  onClick={() => setStyleMode(s.id)}
                  title={s.desc}
                >
                  {s.name}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button className="btn-randomize" onClick={handleRandomize}>
                ✨ Randomize Design
              </button>

              <button className="btn-download" onClick={handleDownload}>
                ⬇ Download PNG
              </button>
            </div>
          </div>

          {/* Presets Gallery Bar */}
          <div className="presets-wrapper">
            <div className="presets-bar">
              <span className="presets-label">🎨 Gradient Palettes:</span>
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  className={`preset-chip ${colors.name === p.name ? 'active' : ''}`}
                  onClick={() => selectPreset(p)}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Custom Color & Body Gradient Editor Dock */}
        <div className="color-editor-dock">
          <div className="dock-title">Front-Face Gradient</div>

          <div className="color-swatch-item">
            <label>Body Start</label>
            <input
              type="color"
              value={colors.bodyStart || '#081426'}
              onChange={(e) => updateColor('bodyStart', e.target.value)}
            />
          </div>

          <div className="color-swatch-item">
            <label>Body Mid</label>
            <input
              type="color"
              value={colors.bodyMid || '#123258'}
              onChange={(e) => updateColor('bodyMid', e.target.value)}
            />
          </div>

          <div className="color-swatch-item">
            <label>Body End</label>
            <input
              type="color"
              value={colors.bodyEnd || '#0a1d33'}
              onChange={(e) => updateColor('bodyEnd', e.target.value)}
            />
          </div>

          <div className="color-swatch-item angle-slider-row">
            <label>Angle ({colors.bodyAngle || 45}°)</label>
            <input
              type="range"
              min="0"
              max="360"
              step="15"
              value={colors.bodyAngle !== undefined ? colors.bodyAngle : 45}
              onChange={(e) => updateColor('bodyAngle', Number(e.target.value))}
            />
          </div>

          <div className="dock-divider"></div>
          <div className="dock-title">Edge Reflections</div>

          <div className="color-swatch-item">
            <label>Top Left</label>
            <input
              type="color"
              value={colors.topLeft}
              onChange={(e) => updateColor('topLeft', e.target.value)}
            />
          </div>

          <div className="color-swatch-item">
            <label>Bottom Left</label>
            <input
              type="color"
              value={colors.bottomLeft}
              onChange={(e) => updateColor('bottomLeft', e.target.value)}
            />
          </div>

          <div className="color-swatch-item">
            <label>Bottom Curve</label>
            <input
              type="color"
              value={colors.bottomCurve}
              onChange={(e) => updateColor('bottomCurve', e.target.value)}
            />
          </div>

          <div className="color-swatch-item">
            <label>Top Right</label>
            <input
              type="color"
              value={colors.topRight}
              onChange={(e) => updateColor('topRight', e.target.value)}
            />
          </div>
        </div>

        {/* Bottom Text Input */}
        <div className="text-input-container">
          <label>Type any character (A-Z, 0-9, Symbols)</label>
          <input
            type="text"
            className="text-input"
            maxLength={3}
            value={text}
            onChange={(e) => setText(e.target.value.toUpperCase())}
          />
        </div>
      </div>
    </>
  )
}

export default App
