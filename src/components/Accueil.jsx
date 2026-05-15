import { useState, useEffect } from 'react'
import { traductions } from '../i18n'

export default function Accueil({ entrees, langue, theme, setTheme, setEcran, onOuvrirWrapped }) {
  const [wrappedChargement, setWrappedChargement] = useState(false)
  const [liturgie, setLiturgie] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [priere, setPriere] = useState('')
  const [typePriere, setTypePriere] = useState('')
  const [priereChargement, setPriereChargement] = useState(false)
  const [lectures, setLectures] = useState([])

  const t = traductions[langue] || traductions.fr

  const heure = new Date().getHours()
  const estSoir = heure >= 20

  const aEcritAujourdhui = entrees.some(e => {
    const dateEntree = new Date(e.id)
    const d = new Date()
    return dateEntree.getFullYear() === d.getFullYear() &&
           dateEntree.getMonth() === d.getMonth() &&
           dateEntree.getDate() === d.getDate()
  })

  const boutonsPriere = []
  if (!estSoir) {
    boutonsPriere.push({ type: 'matin', icon: '🌅', label: langue === 'en' ? 'Morning' : 'Matin' })
  } else if (aEcritAujourdhui) {
    boutonsPriere.push({ type: 'soir', icon: '🌙', label: langue === 'en' ? 'Evening' : 'Soir' })
  }

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

  const totalMots = entrees.reduce((acc, e) => acc + (e.mots || 0), 0)

  const ouvrirWrapped = async () => {
    setWrappedChargement(true)
    try {
      const debut = new Date()
      const estFinDeMois = debut.getDate() === new Date(debut.getFullYear(), debut.getMonth() + 1, 0).getDate()
      const periode = estFinDeMois ? 'mois' : 'semaine'

      debut.setDate(estFinDeMois ? 1 : debut.getDate() - 7)
      const entreesperiode = entrees.filter(e => new Date(e.id) >= debut)

      if (entreesperiode.length < 3) {
        alert(langue === 'en' ? 'Not enough entries yet (minimum 3).' : 'Pas assez d\'entrées encore (minimum 3).')
        setWrappedChargement(false)
        return
      }

      const res = await fetch('/api/wrapped', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entrees: entreesperiode, periode, langue })
      })
      const data = await res.json()
      onOuvrirWrapped(data, periode)
    } catch(e) {
      console.error(e)
    }
    setWrappedChargement(false)
  }

  useEffect(() => {
    fetch(`/api/liturgie?lang=${langue}`)
      .then(res => res.json())
      .then(data => {
        const lecturesBrutes = data.messes?.[0]?.lectures || []
        const lecturesFormatees = lecturesBrutes.map(l => ({
          ref: l.ref || l.titre || '',
          type: l.type || l.titre || '',
          texte: l.contenu?.replace(/<[^>]*>/g, '') || ''
        })).filter(l => l.texte.length > 0)

        setLectures(lecturesFormatees)

        if (lecturesFormatees.length > 0) {
          setLiturgie({
            ref: lecturesBrutes[0].titre,
            intro: lecturesBrutes[0].contenu?.replace(/<[^>]*>/g, '').slice(0, 150) + '...',
          })
        }
        setChargement(false)
      })
      .catch(() => {
        setLiturgie(null)
        setChargement(false)
      })
  }, [langue])

  const getEntreesRecentes = () => {
    const il3jours = new Date()
    il3jours.setDate(il3jours.getDate() - 3)
    return entrees
      .filter(e => new Date(e.id) >= il3jours)
      .map(e => `[${new Date(e.id).toLocaleDateString('fr-FR')}]\n${e.contenu}`)
      .join('\n\n---\n\n')
  }

  const demanderPriere = async (type) => {
    setTypePriere(type)
    setPriereChargement(true)
    setPriere('')
    try {
      const res = await fetch('/api/prayer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          lectures,
          entreesRecentes: getEntreesRecentes(),
          langue
        })
      })
      const data = await res.json()
      setPriere(data.texte)
    } catch (e) {
      setPriere('Erreur, réessaie.')
    }
    setPriereChargement(false)
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

      {/* Prières matin / soir */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <p className="section-label">🙏 Prière du jour</p>
        
        {boutonsPriere.length > 0 ? (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            {boutonsPriere.map(btn => (
              <button
                key={btn.type}
                onClick={() => demanderPriere(btn.type)}
                disabled={priereChargement}
                style={{
                  flex: 1, padding: '14px 8px', borderRadius: '14px',
                  border: '1px solid var(--accent)',
                  background: 'var(--accent-light)',
                  color: 'var(--accent)',
                  cursor: priereChargement ? 'not-allowed' : 'pointer',
                  opacity: priereChargement ? 0.6 : 1,
                  fontSize: '13px', fontWeight: '700',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: '4px',
                  transition: 'all 0.15s',
                  boxShadow: 'var(--shadow-card)'
                }}
              >
                <span style={{ fontSize: '22px' }}>{btn.icon}</span>
                {btn.label}
              </button>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0, textAlign: 'center', padding: '12px 0' }}>
            {langue === 'en' ? 'Write in your journal to unlock the evening prayer.' : 'Écris dans ton journal pour débloquer la prière du soir.'}
          </p>
        )}

        {priereChargement && (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', textAlign: 'center', padding: '8px' }}>
            ✨ Génération en cours...
          </p>
        )}

        {priere && !priereChargement && (
          <div style={{
            background: 'var(--accent-light)',
            border: '1px solid var(--accent)',
            borderRadius: '14px', padding: '16px',
            position: 'relative'
          }}>
            <p style={{
              fontSize: '11px', color: 'var(--accent)',
              fontWeight: '700', marginBottom: '10px', letterSpacing: '0.08em'
            }}>
              {typePriere === 'matin' ? '🌅 PRIÈRE DU MATIN' : '🌙 PRIÈRE DU SOIR'}
            </p>
            <p style={{
              fontSize: '14px', color: 'var(--text-primary)',
              lineHeight: '1.9', fontStyle: 'italic'
            }}>
              {priere}
            </p>
            <button
              onClick={() => setPriere('')}
              style={{
                position: 'absolute', top: '10px', right: '10px',
                background: 'none', border: 'none',
                color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px'
              }}
            >✕</button>
          </div>
        )}
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
      {(() => {
        const jour = new Date().getDay()
        const jourMois = new Date().getDate()
        const dernierJour = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
        const afficher = jour === 0 || jourMois === dernierJour
        if (!afficher) return null
        return (
          <button
            onClick={ouvrirWrapped}
            disabled={wrappedChargement}
            style={{
              width: '100%', padding: '16px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
              border: 'none', color: 'white', cursor: 'pointer',
              fontSize: '15px', fontWeight: '700', marginTop: '12px',
              opacity: wrappedChargement ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            {wrappedChargement ? '✨ Chargement...' : `✨ ${jour === 0 ? 'Wrapped de la semaine' : 'Wrapped du mois'}`}
          </button>
        )
      })()}
    </div>
  )
}