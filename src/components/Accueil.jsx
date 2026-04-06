import { useState, useEffect } from 'react'

export default function Accueil({ entrees }) {
  const [liturgie, setLiturgie] = useState(null)
  const [liturgieOuverte, setLiturgieouverte] = useState(false)
  const [chargement, setChargement] = useState(true)
  const [mood, setMood] = useState('')
  const [assistantResultat, setAssistantResultat] = useState('')
  const [assistantType, setAssistantType] = useState('')
  const [assistantChargement, setAssistantChargement] = useState(false)

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

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

  const totalMots = entrees.reduce((acc, e) => acc + e.mots, 0)

  useEffect(() => {
    fetch('/api/liturgie')
      .then(res => res.json())
      .then(data => {
        const lectures = data.messes?.[0]?.lectures
        if (lectures && lectures.length > 0) {
          setLiturgie({
            ref: lectures[0].titre,
            intro: lectures[0].contenu?.replace(/<[^>]*>/g, '').slice(0, 150) + '...',
            texte: lectures[0].contenu?.replace(/<[^>]*>/g, '')
          })
        }
        setChargement(false)
      })
      .catch(() => {
        setLiturgie(null)
        setChargement(false)
      })
  }, [])

  const appellerAssistant = async (type) => {
    setAssistantType(type)
    setAssistantChargement(true)
    setAssistantResultat('')
    try {
      const res = await fetch('/api/liturgie')
      const data = await res.json()
      const lecturesBrutes = data.messes?.[0]?.lectures || []
      const lectures = lecturesBrutes.map(l => ({
        ref: l.ref || l.titre || '',
        type: l.type || l.titre || '',
        texte: l.contenu?.replace(/<[^>]*>/g, '') || ''
      })).filter(l => l.texte.length > 0)

      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, lectures, mood })
      })
      const result = await response.json()
      setAssistantResultat(result.texte)
    } catch(e) {
      setAssistantResultat('Erreur, réessaie.')
    }
    setAssistantChargement(false)
  }

  return (
    <div>
      <h2>Bonjour 🌿</h2>
      <p>{today}</p>

      <div
        onClick={() => setLiturgieouverte(!liturgieOuverte)}
        style={{ border: '1px solid #ddd', padding: '12px', margin: '10px 0', borderRadius: '8px', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '11px', color: '#6b63d4', fontWeight: 'bold' }}>📖 LITURGIE DU JOUR</p>
          <span style={{ color: '#6b63d4', fontSize: '16px' }}>{liturgieOuverte ? '▲' : '▼'}</span>
        </div>
        {chargement && <p style={{ color: '#999' }}>Chargement...</p>}
        {!chargement && liturgie && (
          <>
            <p style={{ fontWeight: '600', marginTop: '6px' }}>{liturgie.ref}</p>
            <p style={{ fontStyle: 'italic', color: '#666', fontSize: '13px', marginTop: '4px' }}>{liturgie.intro}</p>
          </>
        )}
        {!chargement && liturgie && liturgieOuverte && (
          <p style={{ fontSize: '13px', color: '#444', lineHeight: '1.8', marginTop: '12px', borderTop: '1px solid #eee', paddingTop: '12px' }}>
            {liturgie.texte}
          </p>
        )}
        {!chargement && !liturgie && (
          <p style={{ color: '#999' }}>Lecture non disponible pour aujourd'hui.</p>
        )}
      </div>

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

      <div style={{ margin: '10px 0' }}>
        <p style={{ fontSize: '11px', color: '#999', fontWeight: 'bold', marginBottom: '8px' }}>ASSISTANT IA</p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          {[['📝', 'Résumé', 'resume'], ['🙏', 'Prière', 'priere'], ['🧭', 'Guidance', 'guidance']].map(([icon, label, type]) => (
            <button
              key={type}
              onClick={() => appellerAssistant(type)}
              disabled={assistantChargement}
              style={{
                flex: 1, padding: '10px', borderRadius: '12px',
                border: assistantType === type ? '2px solid #6b63d4' : '1px solid #ddd',
                background: assistantType === type ? '#f0eefc' : 'white',
                color: '#6b63d4', cursor: 'pointer',
                opacity: assistantChargement ? 0.6 : 1
              }}
            >
              {icon}<br />{label}
            </button>
          ))}
        </div>

        {assistantChargement && (
          <p style={{ color: '#999', fontSize: '13px', fontStyle: 'italic' }}>✨ Génération en cours...</p>
        )}

        {assistantResultat && !assistantChargement && (
          <div style={{
            background: '#f0eefc', border: '1px solid #dcd8f5',
            borderRadius: '12px', padding: '14px', marginTop: '4px'
          }}>
            <p style={{ fontSize: '11px', color: '#6b63d4', fontWeight: 'bold', marginBottom: '8px' }}>
              {assistantType === 'resume' ? '📝 RÉSUMÉ' : assistantType === 'priere' ? '🙏 PRIÈRE' : '🧭 GUIDANCE'}
            </p>
            <p style={{ fontSize: '13px', color: '#4a4460', lineHeight: '1.8', fontStyle: 'italic' }}>
              {assistantResultat}
            </p>
          </div>
        )}
      </div>

    </div>
  )
}