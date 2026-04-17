import { useState, useEffect } from 'react'
import { traductions } from '../i18n'

  export default function Accueil({ entrees, langue, theme, setTheme, setEcran }) {
  const [liturgie, setLiturgie] = useState(null)
  const [liturgieOuverte, setLiturgieouverte] = useState(false)
  const [chargement, setChargement] = useState(true)
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
          type, lectures, mood: '', entreeSemaine, langue,
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

      {/* Card verset du jour */}
      <div 
        onClick={() => setEcran('parole')}
        style={{
          background: 'var(--card-verse)',
          borderRadius: '20px',
          padding: '24px 22px',
          marginBottom: '16px',
          cursor: 'pointer'
        }}
      >
        <p style={{ 
          fontSize: '11px', letterSpacing: '1.5px', 
          textTransform: 'uppercase', color: 'var(--text-on-dark)', 
          opacity: 0.7, margin: '0 0 12px' 
        }}>
          VERSET DU JOUR
        </p>
        <p style={{ 
          fontSize: '16px', fontStyle: 'italic', 
          color: 'var(--text-on-dark)', lineHeight: '1.7', 
          margin: '0 0 14px', fontFamily: 'Georgia, serif' 
        }}>
          {chargement ? '...' : liturgie ? `"${liturgie.intro}"` : t.lectureNonDispo}
        </p>
        <p style={{ fontSize: '12px', color: 'var(--accent)', margin: 0 }}>
          {liturgie?.ref} →
        </p>
      </div>

      {/* Grille 2x2 */}
      <div style={{ 
        display: 'grid', gridTemplateColumns: '1fr 1fr', 
        gap: '12px', marginBottom: '16px' 
      }}>
        {[
          { icon: '📖', titre: 'Liturgie du jour', sub: 'Lectures complètes', nav: 'parole', bg: 'var(--bg-card)' },
          { icon: '✍️', titre: 'Mon carnet', sub: 'Écrire ma note', nav: 'ecrire', bg: 'var(--bg-card-alt)' },
          { icon: '✦', titre: 'Guide spirituel', sub: 'Prière & guidance', nav: 'conseils', bg: 'var(--bg-card-guide)' },
          { icon: '📚', titre: 'Mes notes', sub: 'Historique', nav: 'entrees', bg: 'var(--bg-card)' },
        ].map(item => (
          <button
            key={item.nav}
            onClick={() => setEcran(item.nav)}
            style={{
              background: item.bg, border: 'none',
              borderRadius: '16px', padding: '16px 14px',
              textAlign: 'left', cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '22px', display: 'block', marginBottom: '8px' }}>
              {item.icon}
            </span>
            <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-main)', margin: '0 0 2px' }}>
              {item.titre}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-soft)', margin: 0 }}>
              {item.sub}
            </p>
          </button>
        ))}
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