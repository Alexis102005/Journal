import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'

function PrayerCard({ prayer, index }) {
  const [ouverte, setOuverte] = useState(false)

  const couleurs = [
    { label: '📗 1ÈRE LECTURE', bg: '#e8f4ef', color: '#3a7d5a' },
    { label: '📘 2ÈME LECTURE', bg: '#e8f4f8', color: '#3a6d7a' },
    { label: '🎵 PSAUME', bg: '#f0eefc', color: '#6b63d4' },
    { label: '📕 ÉVANGILE', bg: '#fff0e8', color: '#a05030' },
  ]

  const type = prayer.type?.toLowerCase() || ''
  let styleDetecte = couleurs[0]
  if (type.includes('evangile')) styleDetecte = couleurs[3]
  else if (type.includes('psaume')) styleDetecte = couleurs[2]
  else if (type.includes('lecture_2') || type.includes('lecture2')) styleDetecte = couleurs[1]

  return (
    <div style={{ border: `1px solid ${styleDetecte.color}22`, borderRadius: '12px', marginBottom: '10px', overflow: 'hidden' }}>
      <div
        onClick={() => setOuverte(!ouverte)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: styleDetecte.bg, cursor: 'pointer' }}
      >
        <div>
          <p style={{ fontSize: '11px', color: styleDetecte.color, fontWeight: 'bold', margin: 0 }}>{styleDetecte.label}</p>
          <p style={{ fontSize: '13px', color: '#333', margin: '2px 0 0', fontWeight: '500' }}>{prayer.ref}</p>
        </div>
        <span style={{ color: styleDetecte.color, fontSize: '18px' }}>{ouverte ? '▲' : '▼'}</span>
      </div>
      {ouverte && (
        <div style={{ padding: '14px 16px', background: 'white' }}>
          <p style={{ fontSize: '13px', color: '#444', lineHeight: '1.9' }}>{prayer.texte}</p>
        </div>
      )}
    </div>
  )
}

export default function WordOfDay({ langue, isAdmin }) {
  const [parole, setParole] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [generationEnCours, setGenerationEnCours] = useState(false)
  const [mode, setMode] = useState('voir')
  const [mdp, setMdp] = useState('')
  const [adminOk, setAdminOk] = useState(false)
  const [reflexion, setReflexion] = useState('')
  const [source, setSource] = useState('')
  const [conseils, setConseils] = useState('')
  const [conseilsEnCours, setConseilsEnCours] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const dateAffichee = new Date().toLocaleDateString(langue === 'en' ? 'en-GB' : 'fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  useEffect(() => {
    const charger = async () => {
      const ref = doc(db, 'paroles', today)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        setParole(snap.data())
        setReflexion(snap.data().reflexion || '')
        setSource(snap.data().source || '')
        setConseils(snap.data().conseils || '')
      }
      setChargement(false)
    }
    charger()
  }, [today])

  const verifierMdp = async () => {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mdp })
    })
    const data = await res.json()
    if (data.ok) {
      setAdminOk(true)
      setMode('editer')
    } else {
      alert(langue === 'en' ? 'Incorrect password' : 'Mot de passe incorrect')
    }
  }

  const genererResumes = async () => {
    setGenerationEnCours(true)
    try {
      const res = await fetch(`/api/liturgie?lang=${langue || 'fr'}`)
      const data = await res.json()
      const lecturesBrutes = data.messes?.[0]?.lectures || []

      const lectures = lecturesBrutes
        .map(l => ({
          ref: l.ref || l.titre || '',
          type: l.type || l.titre || '',
          texte: l.contenu?.replace(/<[^>]*>/g, '') || ''
        }))
        .filter(l => l.texte.length > 0)

      if (lectures.length === 0) {
        alert(langue === 'en' ? 'No readings available for today.' : 'Aucune lecture disponible pour aujourd\'hui.')
        setGenerationEnCours(false)
        return
      }

      const response = await fetch('/api/resumeLecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lectures })
      })
      const synthese = await response.json()

      const docData = { lectures, synthese, reflexion, source, conseils, date: today }
      await setDoc(doc(db, 'paroles', today), docData)
      setParole(docData)
      setMode('voir')
      setAdminOk(false)

    } catch (err) {
      console.error(err)
      alert(langue === 'en' ? 'Error generating summary. Try again.' : 'Erreur lors de la génération. Réessaie.')
    }
    setGenerationEnCours(false)
  }

  const genererConseils = async () => {
    setConseilsEnCours(true)
    try {
      const lecturesTexte = parole?.lectures?.map(l => `${l.ref}: ${l.texte}`).join('\n\n') || ''
      const reflexionTexte = reflexion || ''

      const response = await fetch('/api/aiAdvice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lectures: lecturesTexte,
          reflexion: reflexionTexte,
          langue: langue || 'fr'
        })
      })
      const data = await response.json()
      setConseils(data.conseils || '')
    } catch (err) {
      console.error(err)
      alert(langue === 'en' ? 'Error generating advice. Try again.' : 'Erreur lors de la génération des conseils. Réessaie.')
    }
    setConseilsEnCours(false)
  }

  const sauvegarderReflexion = async () => {
    const updated = { ...parole, reflexion, source, conseils }
    await setDoc(doc(db, 'paroles', today), updated)
    setParole(updated)
    setMode('voir')
    setAdminOk(false)
  }

  if (chargement) return <div className="ecran"><p style={{ color: '#999' }}>Chargement...</p></div>

  return (
    <div className="ecran">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2>{langue === 'en' ? 'Word of the Day' : 'Parole du jour'}</h2>
          <p style={{ fontSize: '12px', color: '#a09890' }}>{dateAffichee}</p>
          {langue === 'en' && (
            <p style={{ fontSize: '11px', color: '#999', fontStyle: 'italic', marginTop: '4px' }}>
              * Liturgical texts are currently available in French only.
            </p>
          )}
        </div>
        {isAdmin && mode === 'voir' && (
          <button onClick={() => setMode('auth')} style={{ background: '#f0eefc', color: '#6b63d4', border: 'none', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', cursor: 'pointer' }}>
            ✏️ Admin
          </button>
        )}
        {isAdmin && mode !== 'voir' && (
          <button onClick={() => { setMode('voir'); setAdminOk(false); setMdp('') }} style={{ background: '#fee', color: '#a05050', border: 'none', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', cursor: 'pointer' }}>
            ✕ {langue === 'en' ? 'Cancel' : 'Annuler'}
          </button>
        )}
      </div>

      {mode === 'auth' && (
        <div className="card">
          <p className="section-label">{langue === 'en' ? 'ADMIN PASSWORD' : 'MOT DE PASSE ADMIN'}</p>
          <input className="input-titre" type="password" placeholder={langue === 'en' ? 'Password...' : 'Mot de passe...'} value={mdp} onChange={e => setMdp(e.target.value)} onKeyDown={e => e.key === 'Enter' && verifierMdp()} />
          <button className="btn-save" onClick={verifierMdp}>{langue === 'en' ? 'Confirm' : 'Confirmer'}</button>
        </div>
      )}

      {mode === 'editer' && adminOk && (
        <div>
          <button className="btn-save" onClick={genererResumes} disabled={generationEnCours}
            style={{ marginBottom: '16px', background: generationEnCours ? '#b0a8f0' : '#6b63d4' }}>
            {generationEnCours ? '⏳ ...' : '✨ ' + (langue === 'en' ? 'Generate with AI' : 'Générer les résumés avec l\'IA')}
          </button>
          <div className="card" style={{ marginBottom: '12px' }}>
            <p className="section-label" style={{ color: '#6b63d4' }}>✦ {langue === 'en' ? 'YOUR PERSONAL REFLECTION' : 'TA RÉFLEXION PERSONNELLE'}</p>
            <textarea className="textarea-contenu" rows={5} placeholder={langue === 'en' ? 'Your reflection...' : 'Ton résumé de l\'homélie...'} value={reflexion} onChange={e => setReflexion(e.target.value)} />
            <input className="input-titre" placeholder={langue === 'en' ? 'Source (e.g. Fr. Francis)' : 'Source (ex: Père Francis Goossens)'} value={source} onChange={e => setSource(e.target.value)} style={{ marginTop: '8px' }} />
          </div>
          <button className="btn-save" onClick={genererConseils} disabled={conseilsEnCours}
            style={{ marginBottom: '16px', background: conseilsEnCours ? '#b0a8f0' : '#8b5cf6' }}>
            {conseilsEnCours ? '⏳ ...' : '💡 ' + (langue === 'en' ? 'Generate AI Advice' : 'Générer les conseils IA')}
          </button>
          {conseils && (
            <div className="card" style={{ marginBottom: '12px', background: '#f0eefc', border: '1px solid #dcd8f5' }}>
              <p className="section-label" style={{ color: '#6b63d4' }}>💡 {langue === 'en' ? 'AI ADVICE' : 'CONSEILS IA'}</p>
              <p style={{ fontSize: '13px', color: '#4a4460', lineHeight: '1.8' }}>{conseils}</p>
            </div>
          )}
          <button className="btn-save" onClick={sauvegarderReflexion}>{langue === 'en' ? 'Save' : 'Sauvegarder'}</button>
        </div>
      )}

      {mode === 'voir' && !parole && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#b0a89c' }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>📖</p>
          <p style={{ fontStyle: 'italic' }}>{langue === 'en' ? 'No reflection for today.' : 'Aucune réflexion pour aujourd\'hui.'}</p>
          <p style={{ fontSize: '13px', marginTop: '8px' }}>{langue === 'en' ? 'Tap Admin to generate.' : 'Appuie sur Admin pour générer.'}</p>
        </div>
      )}

      {mode === 'voir' && parole && (
        <div>
          {parole.lectures?.map((prayer, i) => (
            <PrayerCard key={i} prayer={prayer} index={i} />
          ))}
          {parole.synthese && (
            <div className="card" style={{ marginBottom: '12px', background: '#f0eefc', border: '1px solid #dcd8f5' }}>
              <p className="section-label" style={{ color: '#6b63d4' }}>✨ {langue === 'en' ? 'SYNTHESIS' : 'SYNTHÈSE DU JOUR'}</p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '8px 0' }}>
                {parole.synthese.mots_cles?.map(mot => (
                  <span key={mot} style={{ background: 'white', color: '#6b63d4', padding: '3px 10px', borderRadius: '20px', fontSize: '12px' }}>{mot}</span>
                ))}
              </div>
              <p style={{ fontSize: '13px', color: '#4a4460', lineHeight: '1.8', fontStyle: 'italic' }}>
                {parole.synthese.resume}
              </p>
            </div>
          )}
          {parole.reflexion && (
            <div style={{ borderLeft: '3px solid #6b63d4', paddingLeft: '14px', marginBottom: '12px' }}>
              <p className="section-label" style={{ color: '#6b63d4' }}>✦ {langue === 'en' ? 'REFLECTION' : 'RÉFLEXION'}</p>
              <p style={{ fontSize: '14px', color: '#1e1b18', lineHeight: '1.8' }}>{parole.reflexion}</p>
              {parole.source && <p style={{ fontSize: '11px', color: '#b0a89c', marginTop: '6px' }}>— {parole.source}</p>}
            </div>
          )}
          {parole.conseils && (
            <div style={{ background: '#f0eefc', borderLeft: '3px solid #8b5cf6', paddingLeft: '14px', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
              <p className="section-label" style={{ color: '#8b5cf6' }}>💡 {langue === 'en' ? 'AI ADVICE' : 'CONSEILS IA'}</p>
              <p style={{ fontSize: '13px', color: '#4a4460', lineHeight: '1.8' }}>{parole.conseils}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
