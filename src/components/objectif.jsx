import { useState, useEffect, useRef } from 'react'
import { getTaches, getCompletions, toggleCompletion, ajouterTache, supprimerTache } from '../services/objectifs'

export default function Objectifs({ utilisateur, setEcran, setContexteIA }) {
  const [taches, setTaches] = useState([])
  const [completions, setCompletions] = useState({})
  const [sectionOuverte, setSectionOuverte] = useState('quotidien')
  const [chargement, setChargement] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [calendrierVisible, setCalendrierVisible] = useState(false)
  const [moisCalendrier, setMoisCalendrier] = useState(new Date())
  const [popupAjout, setPopupAjout] = useState(false)
  const [popupMode, setPopupMode] = useState(null) // 'manuel' ou null
  const [nouvelleTache, setNouvelleTache] = useState('')
  const [recurrente, setRecurrente] = useState(false)
  const [frequenceAjout, setFrequenceAjout] = useState('quotidien')
  const [popupTacheFuture, setPopupTacheFuture] = useState(null)

  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  const formatDate = (date) => date.toISOString().split('T')[0]
  const today = formatDate(new Date())
  const estAujourdhui = formatDate(selectedDate) === today
  const estFutur = selectedDate > new Date(today)

  const nomsMois = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
  const nomsJours = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam']

  useEffect(() => {
    if (!utilisateur) return
    getTaches(utilisateur.uid).then(t => {
      setTaches(t)
      setChargement(false)
    })
  }, [utilisateur])

  useEffect(() => {
    if (!utilisateur) return
    getCompletions(utilisateur.uid, formatDate(selectedDate)).then(c => setCompletions(c))
  }, [utilisateur, selectedDate])

  // Swipe handlers
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e) => {
    const diffX = touchStartX.current - e.changedTouches[0].clientX
    const diffY = Math.abs(touchStartY.current - e.changedTouches[0].clientY)
    if (Math.abs(diffX) < 50 || diffY > 80) return
    if (diffX > 0) {
      setSelectedDate(prev => {
        const next = new Date(prev)
        next.setDate(prev.getDate() + 1)
        return next
      })
    } else {
      setSelectedDate(prev => {
        const prevDay = new Date(prev)
        prevDay.setDate(prev.getDate() - 1)
        return prevDay
      })
    }
  }

  const handleToggle = async (tache) => {
    if (estFutur) {
      setPopupTacheFuture(tache)
      return
    }
    const nouvelleValeur = !completions[tache.id]
    setCompletions(prev => ({ ...prev, [tache.id]: nouvelleValeur }))
    await toggleCompletion(utilisateur.uid, formatDate(selectedDate), tache.id, nouvelleValeur)
  }

  const handleAjouter = async () => {
    if (!nouvelleTache.trim()) return
    const id = await ajouterTache(utilisateur.uid, {
      texte: nouvelleTache.trim(),
      frequence: recurrente ? frequenceAjout : 'unique',
      recurrent: recurrente,
      dateUnique: recurrente ? null : formatDate(selectedDate),
      categorie: 'general'
    })
    setTaches(prev => [...prev, {
      id, texte: nouvelleTache.trim(),
      frequence: recurrente ? frequenceAjout : 'unique',
      recurrent: recurrente,
      dateUnique: recurrente ? null : formatDate(selectedDate),
      actif: true
    }])
    setNouvelleTache('')
    setPopupAjout(false)
    setPopupMode(null)
    setRecurrente(false)
  }

  const ouvrirPlanningIA = (tache = null) => {
    const tachesQuotidiennes = taches.filter(t => t.frequence === 'quotidien')
    const tachesMensuelles = taches.filter(t => t.frequence === 'mensuel')
    const tachesAnnuelles = taches.filter(t => t.frequence === 'annuel')

    setContexteIA({
      type: 'planning',
      tacheCible: tache,
      message: tache
        ? `L'utilisateur veut déplacer la tâche "${tache.texte}" prévue pour ${formatDate(selectedDate)}. Demande-lui quand il veut la faire, pourquoi, et si tu as besoin de contexte sur son planning, pose des questions. Sois concis et direct.`
        : `Je vois que tu veux organiser ton planning. Tu as ${tachesQuotidiennes.length} tâche(s) quotidienne(s), ${tachesMensuelles.length} mensuelle(s) et ${tachesAnnuelles.length} annuelle(s). Tu veux que je te propose un emploi du temps optimisé, ou tu as des contraintes spécifiques ?`,
      taches: { tachesQuotidiennes, tachesMensuelles, tachesAnnuelles }
    })
    setPopupTacheFuture(null)
    setPopupAjout(false)
    setEcran('conseils')
  }

  const tachesDuJour = taches.filter(t => {
    if (t.frequence === 'unique') return t.dateUnique === formatDate(selectedDate)
    if (t.frequence === 'quotidien') return true
    if (t.frequence === 'mensuel') return new Date(selectedDate).getMonth() === new Date().getMonth()
    if (t.frequence === 'annuel') return new Date(selectedDate).getFullYear() === new Date().getFullYear()
    return false
  })

  const sections = [
    { key: 'quotidien', label: "Aujourd'hui" },
    { key: 'mensuel', label: `Ce mois — ${nomsMois[selectedDate.getMonth()]}` },
    { key: 'annuel', label: `Cette année — ${selectedDate.getFullYear()}` }
  ]

  const getProgression = (frequence) => {
    const f = frequence === 'unique'
      ? taches.filter(t => t.frequence === 'unique' && t.dateUnique === formatDate(selectedDate))
      : taches.filter(t => t.frequence === frequence)
    const c = f.filter(t => completions[t.id]).length
    return { cochees: c, total: f.length }
  }

  const getJoursDuMois = (date) => {
    const annee = date.getFullYear()
    const mois = date.getMonth()
    let premierJour = new Date(annee, mois, 1).getDay()
    premierJour = premierJour === 0 ? 6 : premierJour - 1
    const nbJours = new Date(annee, mois + 1, 0).getDate()
    const jours = []
    for (let i = 0; i < premierJour; i++) jours.push(null)
    for (let i = 1; i <= nbJours; i++) jours.push(i)
    return jours
  }

  if (chargement) return null

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ userSelect: 'none' }}
    >
      <div className="card" style={{ marginBottom: '12px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <p className="section-label" style={{ margin: 0 }}>🎯 Objectifs</p>
            <button
              onClick={() => setCalendrierVisible(true)}
              style={{
                background: 'var(--accent-light)', border: '1px solid var(--border-subtle)',
                borderRadius: '20px', padding: '3px 10px',
                color: 'var(--accent)', fontSize: '11px', fontWeight: '600', cursor: 'pointer'
              }}
            >
              📅 {selectedDate.getDate()} {nomsMois[selectedDate.getMonth()].slice(0,3)}
            </button>
          </div>
          <button
            onClick={() => setPopupAjout(true)}
            style={{
              background: 'var(--accent-light)', border: '1px solid var(--accent)',
              borderRadius: '20px', padding: '4px 12px',
              color: 'var(--accent)', fontSize: '12px', fontWeight: '600', cursor: 'pointer'
            }}
          >
            + Ajouter
          </button>
        </div>

        {/* Indicateur date */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <button onClick={() => setSelectedDate(prev => { const d = new Date(prev); d.setDate(prev.getDate() - 1); return d })}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px', padding: '4px 8px' }}>
            ‹
          </button>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: estAujourdhui ? 'var(--accent)' : 'var(--text-primary)' }}>
              {estAujourdhui ? "Aujourd'hui" : selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            {!estAujourdhui && (
              <button onClick={() => setSelectedDate(new Date())}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}>
                Revenir à aujourd'hui →
              </button>
            )}
          </div>
          <button onClick={() => setSelectedDate(prev => { const d = new Date(prev); d.setDate(prev.getDate() + 1); return d })}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px', padding: '4px 8px' }}>
            ›
          </button>
        </div>

        {/* Sections accordion */}
        {sections.map(section => {
          const key = section.key
          const tachesFiltrees = key === 'unique'
            ? taches.filter(t => t.frequence === 'unique' && t.dateUnique === formatDate(selectedDate))
            : taches.filter(t => t.frequence === key)
          const { cochees, total } = getProgression(key)
          const estOuverte = sectionOuverte === key
          const toutFait = total > 0 && cochees === total

          return (
            <div key={key} style={{ marginBottom: '8px' }}>
              <button
                onClick={() => setSectionOuverte(estOuverte ? null : key)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', padding: '14px 16px',
                  borderRadius: '16px', border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  backdropFilter: 'blur(16px)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%',
                    border: `2px solid var(--accent)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }} />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
                    {section.label}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent)' }}>
                    {cochees}/{total}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                    {estOuverte
                      ? <path d="M18 15l-6-6-6 6"/>
                      : <path d="M6 9l6 6 6-6"/>
                    }
                  </svg>
                </div>
              </button>

              {estOuverte && (
                <div style={{ padding: '0 4px 8px' }}>
                  <div style={{ height: '3px', borderRadius: '2px', background: 'var(--border)', margin: '8px 0 12px' }}>
                    <div style={{
                      height: '3px', borderRadius: '2px',
                      width: `${total > 0 ? (cochees/total)*100 : 0}%`,
                      background: 'var(--accent)', transition: 'width 0.3s'
                    }} />
                  </div>
                  <div style={{ padding: '8px 4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {tachesFiltrees.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', marginBottom: '12px' }}>
                        Aucune tâche
                      </p>
                      <button onClick={() => ouvrirPlanningIA()}
                        style={{
                          padding: '10px 20px', borderRadius: '10px',
                          background: 'var(--accent)', border: 'none',
                          color: 'white', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                        }}>
                        💬 Laisser ELIA m'aider
                      </button>
                    </div>
                  ) : (
                    <>
                      {tachesFiltrees.map(tache => (
                        <div key={tache.id} style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '12px 14px', borderRadius: '12px',
                          background: completions[tache.id]
                            ? 'rgba(34, 197, 94, 0.08)'
                            : 'var(--bg-card)',
                          border: `1px solid ${completions[tache.id] ? 'rgba(34,197,94,0.2)' : 'var(--border)'}`,
                          transition: 'all 0.2s'
                        }}>
                          <button
                            onClick={() => handleToggle(tache)}
                            style={{
                              width: '20px', height: '20px', borderRadius: '50%',
                              border: `2px solid ${completions[tache.id] ? '#22c55e' : 'rgba(255,200,140,0.3)'}`,
                              background: completions[tache.id] ? '#22c55e' : 'transparent',
                              cursor: 'pointer', flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.2s'
                            }}
                          >
                            {completions[tache.id] && (
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </button>
                          <span style={{
                            flex: 1, fontSize: '13px',
                            color: completions[tache.id] ? 'var(--text-muted)' : 'var(--text-primary)',
                            textDecoration: completions[tache.id] ? 'line-through' : 'none',
                            transition: 'all 0.2s'
                          }}>
                            {tache.texte}
                          </span>
                          {estFutur && (
                            <button onClick={() => setPopupTacheFuture(tache)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', opacity: 0.7 }}>
                              💡
                            </button>
                          )}
                          <button
                            onClick={() => supprimerTache(utilisateur.uid, tache.id).then(() => setTaches(prev => prev.filter(t => t.id !== tache.id)))}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px', opacity: 0.5 }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {key === 'quotidien' && (
                        <button onClick={() => ouvrirPlanningIA()}
                          style={{
                            width: '100%', padding: '10px', borderRadius: '10px',
                            background: 'transparent', border: '1px dashed var(--accent)',
                            color: 'var(--accent)', fontSize: '12px', fontWeight: '600',
                            cursor: 'pointer', marginTop: '4px'
                          }}>
                          💬 Discuter du planning avec ELIA
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Popup ajout */}
      {popupAjout && (
        <div onClick={() => { setPopupAjout(false); setPopupMode(null) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg)', borderRadius: '24px 24px 0 0', padding: '24px', width: '100%', maxWidth: '430px' }}>

            {!popupMode ? (
              <>
                <p style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '20px', textAlign: 'center' }}>
                  Ajouter une tâche
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button onClick={() => setPopupMode('manuel')}
                    style={{
                      padding: '16px', borderRadius: '14px', border: '1px solid var(--border)',
                      background: 'var(--bg-card)', color: 'var(--text-primary)',
                      fontSize: '15px', fontWeight: '600', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '12px'
                    }}>
                    <span style={{ fontSize: '22px' }}>✏️</span>
                    Ajouter manuellement
                  </button>
                  <button onClick={() => ouvrirPlanningIA()}
                    style={{
                      padding: '16px', borderRadius: '14px', border: '1px solid var(--accent)',
                      background: 'var(--accent-light)', color: 'var(--accent)',
                      fontSize: '15px', fontWeight: '600', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '12px'
                    }}>
                    <span style={{ fontSize: '22px' }}>💬</span>
                    Discuter avec ELIA
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>
                  Nouvelle tâche
                </p>
                <input
                  value={nouvelleTache}
                  onChange={e => setNouvelleTache(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAjouter()}
                  placeholder="Nom de la tâche..."
                  autoFocus
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '12px',
                    border: '1px solid var(--border)', background: 'var(--bg-card)',
                    color: 'var(--text-primary)', fontSize: '14px', outline: 'none', marginBottom: '14px'
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                  <button
                    onClick={() => setRecurrente(false)}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px',
                      border: `1px solid ${!recurrente ? 'var(--accent)' : 'var(--border)'}`,
                      background: !recurrente ? 'var(--accent-light)' : 'transparent',
                      color: !recurrente ? 'var(--accent)' : 'var(--text-muted)',
                      cursor: 'pointer', fontWeight: '600'
                    }}>
                    📌 Unique
                  </button>
                  <button
                    onClick={() => setRecurrente(true)}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px',
                      border: `1px solid ${recurrente ? 'var(--accent)' : 'var(--border)'}`,
                      background: recurrente ? 'var(--accent-light)' : 'transparent',
                      color: recurrente ? 'var(--accent)' : 'var(--text-muted)',
                      cursor: 'pointer', fontWeight: '600'
                    }}>
                    🔄 Récurrente
                  </button>
                </div>

                {recurrente && (
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                    {[
                      { key: 'quotidien', label: 'Quotidien' },
                      { key: 'mensuel', label: 'Mensuel' },
                      { key: 'annuel', label: 'Annuel' }
                    ].map(f => (
                      <button key={f.key} onClick={() => setFrequenceAjout(f.key)}
                        style={{
                          flex: 1, padding: '8px', borderRadius: '8px', fontSize: '11px',
                          border: `1px solid ${frequenceAjout === f.key ? 'var(--accent)' : 'var(--border)'}`,
                          background: frequenceAjout === f.key ? 'var(--accent-light)' : 'transparent',
                          color: frequenceAjout === f.key ? 'var(--accent)' : 'var(--text-muted)',
                          cursor: 'pointer', fontWeight: '600'
                        }}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setPopupMode(null)}
                    style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: '14px', cursor: 'pointer' }}>
                    Retour
                  </button>
                  <button onClick={handleAjouter}
                    style={{ flex: 2, padding: '12px', borderRadius: '12px', border: 'none', background: 'var(--accent)', color: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                    Confirmer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Popup tâche future */}
      {popupTacheFuture && (
        <div onClick={() => setPopupTacheFuture(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg)', borderRadius: '24px 24px 0 0', padding: '24px', width: '100%', maxWidth: '430px' }}>
            <p style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
              {popupTacheFuture.texte}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Prévue pour {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={() => ouvrirPlanningIA(popupTacheFuture)}
                style={{
                  padding: '16px', borderRadius: '14px', border: '1px solid var(--accent)',
                  background: 'var(--accent-light)', color: 'var(--accent)',
                  fontSize: '15px', fontWeight: '600', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '12px'
                }}>
                <span style={{ fontSize: '22px' }}>💡</span>
                Discuter avec ELIA — trouver le bon moment
              </button>
              <button onClick={() => setPopupTacheFuture(null)}
                style={{
                  padding: '14px', borderRadius: '14px', border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--text-muted)',
                  fontSize: '14px', cursor: 'pointer'
                }}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup Calendrier */}
      {calendrierVisible && (
        <div onClick={() => setCalendrierVisible(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg)', borderRadius: '24px 24px 0 0', padding: '24px', width: '100%', maxWidth: '430px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <button onClick={() => setMoisCalendrier(new Date(moisCalendrier.getFullYear(), moisCalendrier.getMonth() - 1))}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '16px' }}>‹</button>
              <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                {nomsMois[moisCalendrier.getMonth()]} {moisCalendrier.getFullYear()}
              </span>
              <button onClick={() => setMoisCalendrier(new Date(moisCalendrier.getFullYear(), moisCalendrier.getMonth() + 1))}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '16px' }}>›</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
              {['L','M','M','J','V','S','D'].map((j, i) => (
                <div key={i} style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', padding: '4px' }}>{j}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {getJoursDuMois(moisCalendrier).map((jour, i) => {
                if (!jour) return <div key={i} />
                const dateJour = new Date(moisCalendrier.getFullYear(), moisCalendrier.getMonth(), jour)
                const estSel = formatDate(dateJour) === formatDate(selectedDate)
                const estAuj = formatDate(dateJour) === today
                return (
                  <button key={i}
                    onClick={() => { setSelectedDate(dateJour); setCalendrierVisible(false) }}
                    style={{
                      padding: '8px 4px', borderRadius: '10px', border: 'none',
                      background: estSel ? 'var(--accent)' : estAuj ? 'var(--accent-light)' : 'transparent',
                      color: estSel ? 'white' : estAuj ? 'var(--accent)' : 'var(--text-primary)',
                      fontWeight: estSel || estAuj ? '700' : '400',
                      cursor: 'pointer', fontSize: '14px', textAlign: 'center'
                    }}>
                    {jour}
                  </button>
                )
              })}
            </div>
            <button onClick={() => { setSelectedDate(new Date()); setCalendrierVisible(false) }}
              style={{ width: '100%', marginTop: '16px', padding: '12px', borderRadius: '12px', background: 'var(--accent-light)', border: '1px solid var(--accent)', color: 'var(--accent)', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
              Revenir à aujourd'hui
            </button>
          </div>
        </div>
      )}
    </div>
  )
}