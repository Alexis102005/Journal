import { useState, useEffect } from 'react'
import { traductions } from '../i18n'

export default function Accueil({ entrees, langue }) {
  const [liturgie, setLiturgie] = useState(null)
  const [liturgieOuverte, setLiturgieouverte] = useState(false)
  const [chargement, setChargement] = useState(true)
  const [mood, setMood] = useState('')
  const [assistantResultat, setAssistantResultat] = useState('')
  const [assistantType, setAssistantType] = useState('')
  const [assistantChargement, setAssistantChargement] = useState(false)

  const t = traductions[langue] || traductions.fr

  const today = new Date().toLocaleDateString(langue === 'en' ? 'en-GB' : 'fr-FR', {
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
    fetch(`/api/liturgie?lang=${langue}`)
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
  }, [langue])

  const appellerAssistant = async (type) => {
    setAssistantType(type)
    setAssistantChargement(true)
    setAssistantResultat('')
    try {
      const res = await fetch(`/api/liturgie?lang=${langue}`)
      const data = await res.json()
      const lecturesBrutes = data.messes?.[0]?.lectures || []
      const lectures = lecturesBrutes.map(l => ({
        ref: l.ref || l.titre || '',
        type: l.type || l.titre || '',
        texte: l.contenu?.replace(/<[^>]*>/g, '') || ''
      })).filter(l => l.texte.length > 0)

      const il7jours = new Date()
      il7jours.setDate(il7jours.getDate() - 7)
      const entreeSemaine = entrees
        .filter(e => new Date(e.id) >= il7jours)
        .map(e => `[${new Date(e.id).toLocaleDateString('fr-FR')}]\n${e.contenu}`)
        .join('\n\n---\n\n')

      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type, lectures, mood, entreeSemaine, langue,
          ...(type === 'resume' && { mood: entreeSemaine || 'Aucune entrée cette semaine.' })
        })
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
      <h2>{t.bonjour} 🌿</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>{today}</p>

      {/* Liturgie */}
      <div
        onClick={() => setLiturgieouverte(!liturgieOuverte)}
        className="card"
        style={{ cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: '700', letterSpacing: '0.08em' }}>
            📖 {t.liturgie}
          </p>
          <span style={{ color: 'var(--accent)', fontSize: '14px' }}>{liturgieOuverte ? '▲' : '▼'}</span>
        </div>
        {chargement && <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>{t.chargement}</p>}
        {!chargement && liturgie && (
          <>
            <p style={{ fontWeight: '600', marginTop: '8px', color: 'var(--text-primary)', fontSize: '15px' }}>
              {liturgie.ref}
            </p>
            <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px', lineHeight: '1.6' }}>
              {liturgie.intro}
            </p>
          </>
        )}
        {!chargement && liturgie && liturgieOuverte && (
          <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.9', marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
            {liturgie.texte}
          </p>
        )}
        {!chargement && !liturgie && (
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>{t.lectureNonDispo}</p>
        )}
        {langue === 'en' && !chargement && (
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '6px' }}>
            * Liturgical texts are currently available in French only.
          </p>
        )}
      </div>

      {/* Humeur */}
      <div className="card">
        <p className="section-label">{t.comment}</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[['😄', t.bien], ['😐', t.neutre], ['😞', t.difficile]].map(([emoji, label]) => (
            <button
              key={label}
              onClick={() => setMood(label)}
              className={`chip ${mood === label ? 'actif' : ''}`}
            >
              {emoji} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card streak">
          <p className="stat-label">🔥 {t.streak}</p>
          <p className="stat-val">{calculerStreak()}</p>
          <p className="stat-sub">{t.joursConsecutifs}</p>
        </div>
        <div className="stat-card mots">
          <p className="stat-label">📝 {t.motsEcrits}</p>
          <p className="stat-val">{totalMots}</p>
          <p className="stat-sub">{t.depuisDebut}</p>
        </div>
      </div>

      {/* Assistant IA — gardé minimal, les vraies fonctions sont dans Conseils IA */}
      <div className="card">
        <p className="section-label">{t.assistantIA}</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[['📝', t.resume, 'resume'], ['🙏', t.priere, 'priere'], ['🧭', t.guidance, 'guidance']].map(([icon, label, type]) => (
            <button
              key={type}
              onClick={() => appellerAssistant(type)}
              disabled={assistantChargement}
              style={{
                flex: 1, padding: '12px 6px', borderRadius: '14px',
                border: `1px solid ${assistantType === type ? 'var(--accent)' : 'var(--border)'}`,
                background: assistantType === type ? 'var(--accent-light)' : 'var(--bg-card)',
                color: 'var(--accent)', cursor: 'pointer',
                opacity: assistantChargement ? 0.6 : 1,
                fontSize: '12px', fontWeight: '600',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                boxShadow: 'var(--shadow-card)', transition: 'all 0.15s'
              }}
            >
              <span style={{ fontSize: '20px' }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {assistantChargement && (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', marginTop: '12px' }}>
            {t.generationEnCours}
          </p>
        )}

        {assistantResultat && !assistantChargement && (
          <div style={{
            background: 'var(--accent-light)', border: '1px solid var(--accent)',
            borderRadius: '14px', padding: '14px', marginTop: '12px'
          }}>
            <p style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: '700', marginBottom: '8px', letterSpacing: '0.08em' }}>
              {assistantType === 'resume' ? `📝 ${t.resume.toUpperCase()}` : assistantType === 'priere' ? `🙏 ${t.priere.toUpperCase()}` : `🧭 ${t.guidance.toUpperCase()}`}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.8', fontStyle: 'italic' }}>
              {assistantResultat}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}