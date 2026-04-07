import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'


function LectureCard({ lecture, index }) {
  const [ouverte, setOuverte] = useState(false)

  const couleurs = [
    { label: '📗 1ÈRE LECTURE', bg: '#e8f4ef', color: '#3a7d5a' },
    { label: '📘 2ÈME LECTURE', bg: '#e8f4f8', color: '#3a6d7a' },
    { label: '🎵 PSAUME',       bg: '#f0eefc', color: '#6b63d4' },
    { label: '📕 ÉVANGILE',     bg: '#fff0e8', color: '#a05030' },
  ]

  const type = lecture.type?.toLowerCase() || ''
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
          <p style={{ fontSize: '13px', color: '#333', margin: '2px 0 0', fontWeight: '500' }}>{lecture.ref}</p>
        </div>
        <span style={{ color: styleDetecte.color, fontSize: '18px' }}>{ouverte ? '▲' : '▼'}</span>
      </div>
      {ouverte && (
        <div style={{ padding: '14px 16px', background: 'white' }}>
          <p style={{ fontSize: '13px', color: '#444', lineHeight: '1.9' }}>{lecture.texte}</p>
        </div>
      )}
    </div>
  )
}

export default function ParoleAuto() {
  const [parole, setParole] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [generationEnCours, setGenerationEnCours] = useState(false)
  const [mode, setMode] = useState('voir')
  const [mdp, setMdp] = useState('')
  const [adminOk, setAdminOk] = useState(false)
  const [reflexion, setReflexion] = useState('')
  const [source, setSource] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const dateAffichee = new Date().toLocaleDateString('fr-FR', {
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
    alert('Mot de passe incorrect')
  }
}
  const genererResumes = async () => {
    setGenerationEnCours(true)
    try {
      const res = await fetch('/api/liturgie')
      const data = await res.json()
      const lecturesBrutes = data.messes?.[0]?.lectures || []
      console.log('Lectures brutes:', lecturesBrutes)
      console.log('Data complète:', JSON.stringify(data))

      const lectures = lecturesBrutes
        .map(l => ({
          ref: l.ref || l.titre || '',
          type: l.type || l.titre || '',
          texte: l.contenu?.replace(/<[^>]*>/g, '') || ''
        }))
        .filter(l => l.texte.length > 0)

      const response = await fetch('/api/resumeLecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lectures })
      })
      const synthese = await response.json()

      const docData = { lectures, synthese, reflexion, source, date: today }
      await setDoc(doc(db, 'paroles', today), docData)
      setParole(docData)
      setMode('voir')
      setAdminOk(false)

    } catch (err) {
      console.error(err)
      alert('Erreur lors de la génération. Réessaie.')
    }
    setGenerationEnCours(false)
  }

  const sauvegarderReflexion = async () => {
    const updated = { ...parole, reflexion, source }
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
          <h2>Parole du jour</h2>
          <p style={{ fontSize: '12px', color: '#a09890' }}>{dateAffichee}</p>
        </div>
        {mode === 'voir' && (
          <button onClick={() => setMode('auth')} style={{ background: '#f0eefc', color: '#6b63d4', border: 'none', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', cursor: 'pointer' }}>
            ✏️ Admin
          </button>
        )}
        {mode !== 'voir' && (
          <button onClick={() => { setMode('voir'); setAdminOk(false); setMdp('') }} style={{ background: '#fee', color: '#a05050', border: 'none', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', cursor: 'pointer' }}>
            ✕ Annuler
          </button>
        )}
      </div>

      {mode === 'auth' && (
        <div className="card">
          <p className="section-label">MOT DE PASSE ADMIN</p>
          <input className="input-titre" type="password" placeholder="Mot de passe..." value={mdp} onChange={e => setMdp(e.target.value)} onKeyDown={e => e.key === 'Enter' && verifierMdp()} />
          <button className="btn-save" onClick={verifierMdp}>Confirmer</button>
        </div>
      )}

      {mode === 'editer' && adminOk && (
        <div>
          <button className="btn-save" onClick={genererResumes} disabled={generationEnCours}
            style={{ marginBottom: '16px', background: generationEnCours ? '#b0a8f0' : '#6b63d4' }}>
            {generationEnCours ? '⏳ Génération en cours...' : '✨ Générer les résumés avec l\'IA'}
          </button>
          <div className="card" style={{ marginBottom: '12px' }}>
            <p className="section-label" style={{ color: '#6b63d4' }}>✦ TA RÉFLEXION PERSONNELLE</p>
            <textarea className="textarea-contenu" rows={5} placeholder="Ton résumé de l'homélie ou ta réflexion personnelle..." value={reflexion} onChange={e => setReflexion(e.target.value)} />
            <input className="input-titre" placeholder="Source (ex: Père Francis Goossens)" value={source} onChange={e => setSource(e.target.value)} style={{ marginTop: '8px' }} />
          </div>
          <button className="btn-save" onClick={sauvegarderReflexion}>Sauvegarder</button>
        </div>
      )}

      {mode === 'voir' && !parole && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#b0a89c' }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>📖</p>
          <p style={{ fontStyle: 'italic' }}>Aucune réflexion pour aujourd'hui.</p>
          <p style={{ fontSize: '13px', marginTop: '8px' }}>Appuie sur Admin pour générer.</p>
        </div>
      )}

      {mode === 'voir' && parole && (
        <div>
          {parole.lectures?.map((lecture, i) => (
            <LectureCard key={i} lecture={lecture} index={i} />
          ))}

          {parole.synthese && (
            <div className="card" style={{ marginBottom: '12px', background: '#f0eefc', border: '1px solid #dcd8f5' }}>
              <p className="section-label" style={{ color: '#6b63d4' }}>✨ SYNTHÈSE DU JOUR</p>
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
              <p className="section-label" style={{ color: '#6b63d4' }}>✦ RÉFLEXION</p>
              <p style={{ fontSize: '14px', color: '#1e1b18', lineHeight: '1.8' }}>{parole.reflexion}</p>
              {parole.source && <p style={{ fontSize: '11px', color: '#b0a89c', marginTop: '6px' }}>— {parole.source}</p>}
            </div>
          )}
        </div>
      )}

    </div>
  )
}