import { useState, useEffect } from 'react'
import { traductions } from '../i18n'

export default function Accueil({ entrees, langue, setEcran, onOuvrirWrapped }) {
  const [liturgie, setLiturgie] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [priere, setPriere] = useState('')
  const [typePriere, setTypePriere] = useState('')
  const [priereChargement, setPriereChargement] = useState(false)
  const [lectures, setLectures] = useState([])
  const [wrappedChargement, setWrappedChargement] = useState(false)

  const t = traductions[langue] || traductions.fr
  const heure = new Date().getHours()
  const estSoir = heure >= 20

  const salutation = heure < 12 ? `${t.bonjour} ☀️` : heure < 18 ? `${t.bonjour} 🌤️` : `Bonsoir 🌙`

  const today = new Date().toLocaleDateString(langue === 'en' ? 'en-GB' : 'fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long'
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
        const d = new Date(e.id)
        d.setHours(0, 0, 0, 0)
        return d.getTime() === jour.getTime()
      })
      if (aEcrit) streak++
      else if (i > 0) break
    }
    return streak
  }

  const totalMots = entrees.reduce((acc, e) => acc + (e.mots || 0), 0)

  const aEcritAujourdhui = entrees.some(e => {
    const d = new Date(e.id)
    d.setHours(0, 0, 0, 0)
    const auj = new Date()
    auj.setHours(0, 0, 0, 0)
    return d.getTime() === auj.getTime()
  })

  useEffect(() => {
    fetch(`/api/liturgie?lang=${langue}`)
      .then(res => res.json())
      .then(data => {
        const lecturesBrutes = data.messes?.[0]?.lectures || []
        const lf = lecturesBrutes.map(l => ({
          ref: l.ref || l.titre || '',
          type: l.type || l.titre || '',
          texte: l.contenu?.replace(/<[^>]*>/g, '') || ''
        })).filter(l => l.texte.length > 0)
        setLectures(lf)
        if (lf.length > 0) {
          setLiturgie({
            ref: lecturesBrutes[0].titre,
            intro: lecturesBrutes[0].contenu?.replace(/<[^>]*>/g, '').slice(0, 140) + '...',
          })
        }
        setChargement(false)
      })
      .catch(() => { setLiturgie(null); setChargement(false) })
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
        body: JSON.stringify({ type, lectures, entreesRecentes: getEntreesRecentes(), langue })
      })
      const data = await res.json()
      setPriere(data.texte)
    } catch (e) { setPriere('Erreur, réessaie.') }
    setPriereChargement(false)
  }

  const ouvrirWrapped = async () => {
    setWrappedChargement(true)
    try {
      const debut = new Date()
      const estFinDeMois = debut.getDate() === new Date(debut.getFullYear(), debut.getMonth() + 1, 0).getDate()
      const periode = estFinDeMois ? 'mois' : 'semaine'
      debut.setDate(estFinDeMois ? 1 : debut.getDate() - 7)
      const entreesperiode = entrees.filter(e => new Date(e.id) >= debut)
      if (entreesperiode.length < 3) {
        alert('Pas assez d\'entrées encore (minimum 3).')
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
    } catch (e) { console.error(e) }
    setWrappedChargement(false)
  }

  const boutonsPriere = [
    { type: 'matin', icon: '🌅', label: 'Matin', actif: !estSoir },
    { type: 'soir', icon: '🌙', label: 'Soir', actif: estSoir && aEcritAujourdhui }
  ]

  const jourSemaine = new Date().getDay()
  const jourMois = new Date().getDate()
  const dernierJour = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const afficherWrapped = jourSemaine === 0 || jourMois === dernierJour

  return (
    <div style={{ paddingTop: '16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '26px', marginBottom: '2px' }}>{salutation}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{today}</p>
        </div>
        <button
          onClick={() => setEcran('parametres')}
          style={{
            width: '40px', height: '40px', borderRadius: '50%',
            border: '1.5px solid var(--border)',
            background: 'var(--bg-card)',
            backdropFilter: 'var(--blur)',
            WebkitBackdropFilter: 'var(--blur)',
            cursor: 'pointer', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <span style={{ fontSize: '18px' }}>⚙️</span>
        </button>
      </div>

      {/* Stats compactes */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {[
          { icon: '🔥', val: calculerStreak(), label: t.streak, bg: 'var(--streak-bg)', color: 'var(--streak-color)', border: 'rgba(255,200,80,0.25)' },
          { icon: '📝', val: totalMots, label: t.motsEcrits, bg: 'var(--mots-bg)', color: 'var(--mots-color)', border: 'rgba(80,160,255,0.2)' },
          { icon: '📓', val: entrees.length, label: 'entrées', bg: 'var(--accent-light)', color: 'var(--accent)', border: 'var(--border-subtle)' },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, background: s.bg,
            backdropFilter: 'var(--blur)', WebkitBackdropFilter: 'var(--blur)',
            border: `1px solid ${s.border}`,
            borderRadius: '16px', padding: '12px 8px', textAlign: 'center'
          }}>
            <div style={{ fontSize: '16px', marginBottom: '2px' }}>{s.icon}</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: s.color, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600', letterSpacing: '0.05em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Prières */}
      <div className="card" style={{ marginBottom: '12px' }}>
        <p className="section-label">🙏 Prière du jour</p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: priere ? '12px' : '0' }}>
          {boutonsPriere.map(btn => (
            <button
              key={btn.type}
              onClick={() => btn.actif && demanderPriere(btn.type)}
              disabled={priereChargement || !btn.actif}
              style={{
                flex: 1, padding: '14px 8px', borderRadius: '14px',
                border: `1px solid ${btn.actif ? 'var(--accent)' : 'var(--border-subtle)'}`,
                background: btn.actif ? 'var(--accent-light)' : 'transparent',
                color: btn.actif ? 'var(--accent)' : 'var(--text-muted)',
                cursor: btn.actif && !priereChargement ? 'pointer' : 'not-allowed',
                opacity: btn.actif ? 1 : 0.4,
                fontSize: '13px', fontWeight: btn.actif ? '700' : '500',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                transition: 'all 0.15s'
              }}
            >
              <span style={{ fontSize: '22px' }}>{btn.icon}</span>
              {btn.label}
              {btn.type === 'soir' && estSoir && !aEcritAujourdhui && (
                <span style={{ fontSize: '9px', opacity: 0.7 }}>Écris d'abord</span>
              )}
            </button>
          ))}
        </div>

        {priereChargement && (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', textAlign: 'center', padding: '8px' }}>
            ✨ Génération en cours...
          </p>
        )}

        {priere && !priereChargement && (
          <div style={{
            background: 'var(--accent-light)', border: '1px solid var(--border-subtle)',
            borderRadius: '14px', padding: '16px', position: 'relative'
          }}>
            <p style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: '700', marginBottom: '10px', letterSpacing: '0.08em' }}>
              {typePriere === 'matin' ? '🌅 PRIÈRE DU MATIN' : '🌙 PRIÈRE DU SOIR'}
            </p>
            <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.9', fontStyle: 'italic' }}>
              {priere}
            </p>
            <button onClick={() => setPriere('')} style={{
              position: 'absolute', top: '10px', right: '10px',
              background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px'
            }}>✕</button>
          </div>
        )}
      </div>

      {/* Zone objectifs — placeholder pour la to-do list */}
      <div className="card" style={{ marginBottom: '12px', minHeight: '80px' }}>
        <p className="section-label">🎯 Objectifs du jour</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '16px 0', fontStyle: 'italic' }}>
          Bientôt — tes objectifs quotidiens ici
        </p>
      </div>

      {/* Verset du jour */}
      <div
        onClick={() => setEcran('parole')}
        style={{
          background: 'var(--card-verse)',
          backdropFilter: 'var(--blur)', WebkitBackdropFilter: 'var(--blur)',
          borderRadius: '20px', padding: '24px 22px',
          marginBottom: '16px', cursor: 'pointer',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <p style={{ fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(200,170,255,0.7)', margin: '0 0 12px', fontWeight: '700' }}>
          VERSET DU JOUR
        </p>
        <p style={{ fontSize: '15px', fontStyle: 'italic', color: 'var(--text-on-dark)', lineHeight: '1.7', margin: '0 0 14px', fontFamily: 'Georgia, serif' }}>
          {chargement ? '...' : liturgie ? `"${liturgie.intro}"` : t.lectureNonDispo}
        </p>
        <p style={{ fontSize: '12px', color: 'rgba(160,120,255,0.8)', margin: 0, fontWeight: '600' }}>
          {liturgie?.ref} →
        </p>
      </div>

      {/* Bouton Wrapped */}
      {afficherWrapped && (
        <button
          onClick={ouvrirWrapped}
          disabled={wrappedChargement}
          style={{
            width: '100%', padding: '16px', borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(106,58,191,0.8), rgba(192,48,106,0.8))',
            backdropFilter: 'var(--blur)', WebkitBackdropFilter: 'var(--blur)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'white', cursor: 'pointer', fontSize: '15px', fontWeight: '700',
            marginBottom: '12px', opacity: wrappedChargement ? 0.7 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
          }}
        >
          {wrappedChargement ? '✨ Chargement...' : `✨ ${jourSemaine === 0 ? 'Wrapped de la semaine' : 'Wrapped du mois'}`}
        </button>
      )}
    </div>
  )
}