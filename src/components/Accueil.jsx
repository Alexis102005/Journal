import { useState, useEffect } from 'react'
import { traductions } from '../i18n'
import Objectifs from './objectif'

export default function Accueil({ entrees, langue, setEcran, onOuvrirWrapped, utilisateur, setContexteIA }) {
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

      {/* Verset du jour */}
      <div
        onClick={() => setEcran('parole')}
        style={{
          background: 'var(--card-verse)',
          backdropFilter: 'var(--blur)', WebkitBackdropFilter: 'var(--blur)',
          borderRadius: '20px', padding: '24px 22px',
          marginBottom: '20px', cursor: 'pointer',
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

      <Objectifs utilisateur={utilisateur} setEcran={setEcran} setContexteIA={setContexteIA} />

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