import { useState, useEffect } from 'react'

export default function Accueil({ entrees }) {
  const [liturgie, setLiturgie] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [mood, setMood] = useState('')

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  // Calcul streak
  const calculerStreak = () => {
    if (entrees.length === 0) return 0
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 0; i < 30; i++) {
      const jour = new Date(today)
      jour.setDate(today.getDate() - i)
      const aEcrit = entrees.some(e => {
        const dateEntree = new Date(e.id)
        dateEntree.setHours(0, 0, 0, 0)
        return dateEntree.getTime() === jour.getTime()
      })
      if (aEcrit) streak++
      else if (i > 0) break
    }
    return streak
  }

  // Total mots
  const totalMots = entrees.reduce((acc, e) => acc + e.mots, 0)

  // Appel API AELF
  useEffect(() => {
    const date = new Date()
    const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`

    fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(`https://api.aelf.org/v1/messes/${dateStr}/france`)}`)
      .then(res => res.json())
      .then(data => {
        const lectures = data.messe?.lectures
        if (lectures && lectures.length > 0) {
          setLiturgie({
            ref: lectures[0].ref,
            intro: lectures[0].intro_lue
          })
        }
        setChargement(false)
      })
      .catch(() => {
        setLiturgie(null)
        setChargement(false)
      })
  }, [])

  return (
    <div>
      <h2>Bonjour 🌿</h2>
      <p>{today}</p>

      {/* Liturgie */}
      <div style={{ border: '1px solid #ddd', padding: '12px', margin: '10px 0', borderRadius: '8px' }}>
        <p style={{ fontSize: '11px', color: '#6b63d4', fontWeight: 'bold' }}>📖 LITURGIE DU JOUR</p>
        {chargement && <p>Chargement...</p>}
        {!chargement && liturgie && (
          <>
            <p style={{ fontWeight: 'bold' }}>{liturgie.ref}</p>
            <p style={{ fontStyle: 'italic', color: '#666' }}>{liturgie.intro}</p>
          </>
        )}
        {!chargement && !liturgie && (
          <p style={{ color: '#999' }}>Lecture non disponible pour aujourd'hui.</p>
        )}
      </div>

      {/* Mood */}
      <div style={{ border: '1px solid #ddd', padding: '12px', margin: '10px 0', borderRadius: '8px' }}>
        <p style={{ fontSize: '11px', color: '#999', fontWeight: 'bold' }}>COMMENT TU TE SENS ?</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          {[['😄', 'Bien'], ['😐', 'Neutre'], ['😞', 'Difficile']].map(([emoji, label]) => (
            <button
              key={label}
              onClick={() => setMood(label)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: '1px solid #ddd',
                background: mood === label ? '#f0eefc' : 'white',
                color: mood === label ? '#6b63d4' : '#666',
                cursor: 'pointer'
              }}
            >
              {emoji} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '10px 0' }}>
        <div style={{ border: '1px solid #ddd', padding: '12px', borderRadius: '8px' }}>
          <p style={{ fontSize: '11px', color: '#999' }}>🔥 STREAK</p>
          <p style={{ fontSize: '28px', fontWeight: 'bold' }}>{calculerStreak()}</p>
          <p style={{ fontSize: '11px', color: '#999' }}>jours consécutifs</p>
        </div>
        <div style={{ border: '1px solid #ddd', padding: '12px', borderRadius: '8px' }}>
          <p style={{ fontSize: '11px', color: '#999' }}>📝 MOTS ÉCRITS</p>
          <p style={{ fontSize: '28px', fontWeight: 'bold' }}>{totalMots}</p>
          <p style={{ fontSize: '11px', color: '#999' }}>depuis le début</p>
        </div>
      </div>

      {/* Boutons IA */}
      <div>
        <p style={{ fontSize: '11px', color: '#999', fontWeight: 'bold' }}>ASSISTANT IA</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[['📝', 'Résumé'], ['🙏', 'Prière'], ['🧭', 'Guidance']].map(([icon, label]) => (
            <button key={label} disabled style={{ flex: 1, padding: '10px', borderRadius: '12px', border: '1px solid #ddd', background: 'white', color: '#6b63d4', cursor: 'not-allowed', opacity: 0.6 }}>
              {icon}<br />{label}<br />
              <span style={{ fontSize: '9px', color: '#999' }}>Bientôt</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}