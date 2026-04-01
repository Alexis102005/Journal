import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'

const MOT_DE_PASSE_ADMIN = 'alexis2026'

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

  const verifierMdp = () => {
    if (mdp === MOT_DE_PASSE_ADMIN) {
      setAdminOk(true)
      setMode('editer')
    } else {
      alert('Mot de passe incorrect')
    }
  }

  const genererResumes = async () => {
    setGenerationEnCours(true)
    try {
      const dateStr = today
      const url = `https://corsproxy.io/?url=${encodeURIComponent(`https://api.aelf.org/v1/messes/${dateStr}/france`)}`
      const res = await fetch(url)
      const data = await res.json()
      const lectures = data.messes?.[0]?.lectures || []

      const resultats = {}

      for (const lecture of lectures) {
  const texte = lecture.contenu?.replace(/<[^>]*>/g, '') || ''
  if (!texte) continue

  const prompt = `Tu es un assistant spirituel catholique. Voici une lecture liturgique :

Référence : ${lecture.ref || lecture.titre || ''}
Texte : ${texte.slice(0, 2000)}

Réponds en JSON uniquement, sans markdown, sans backticks :
{"ref":"référence courte","mots_cles":["mot1","mot2","mot3"],"resume":"résumé en 2-3 phrases simples et spirituelles"}`

const response = await fetch('/.netlify/functions/resumeLecture', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ texte, ref: lecture.ref || lecture.titre || '' })
})
const parsed = await response.json() 

  const aiData = await response.json()
  const texteReponse = aiData.content?.[0]?.text || '{}'
  const clean = texteReponse.replace(/```json|```/g, '').trim()
  
  try {
    const parsed = JSON.parse(clean)
    const type = lecture.type?.toLowerCase() || ''
    
    console.log('type lecture:', type, lecture.type)
    
    if (type.includes('evangile')) {
      resultats.evangile = parsed
    } else if (type.includes('psaume')) {
      resultats.psaume = parsed
    } else if (type.includes('lecture_2') || type.includes('lecture2')) {
      resultats.lecture2 = parsed
    } else {
      resultats.lecture1 = parsed
    }
  } catch(e) {
    console.log('Parse error:', e, texteReponse)
  }
}

      const docData = {
        ...resultats,
        reflexion,
        source,
        date: today
      }

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

      {/* AUTH */}
      {mode === 'auth' && (
        <div className="card">
          <p className="section-label">MOT DE PASSE ADMIN</p>
          <input className="input-titre" type="password" placeholder="Mot de passe..." value={mdp} onChange={e => setMdp(e.target.value)} onKeyDown={e => e.key === 'Enter' && verifierMdp()} />
          <button className="btn-save" onClick={verifierMdp}>Confirmer</button>
        </div>
      )}

      {/* EDITER */}
      {mode === 'editer' && adminOk && (
        <div>
          <button
            className="btn-save"
            onClick={genererResumes}
            disabled={generationEnCours}
            style={{ marginBottom: '16px', background: generationEnCours ? '#b0a8f0' : '#6b63d4' }}
          >
            {generationEnCours ? '⏳ Génération en cours...' : '✨ Générer les résumés avec l\'IA'}
          </button>

          <div className="card" style={{ marginBottom: '12px' }}>
            <p className="section-label" style={{ color: '#6b63d4' }}>✦ TA RÉFLEXION PERSONNELLE</p>
            <textarea className="textarea-contenu" rows={5} placeholder="Ton résumé de l'homélie ou ta réflexion personnelle..." value={reflexion} onChange={e => setReflexion(e.target.value)} />
            <input className="input-titre" placeholder="Source (ex: Père Francis Goossens)" value={source} onChange={e => setSource(e.target.value)} style={{ marginTop: '8px' }} />
          </div>

          <button className="btn-save" onClick={sauvegarderReflexion}>
            Sauvegarder
          </button>
        </div>
      )}

      {/* VOIR */}
      {mode === 'voir' && !parole && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#b0a89c' }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>📖</p>
          <p style={{ fontStyle: 'italic' }}>Aucune réflexion pour aujourd'hui.</p>
          <p style={{ fontSize: '13px', marginTop: '8px' }}>Appuie sur Admin pour générer.</p>
        </div>
      )}

      {mode === 'voir' && parole && (
        <div>
          {parole.lecture1 && (
            <div className="card" style={{ marginBottom: '12px' }}>
              <p className="section-label" style={{ color: '#3a7d5a' }}>📗 1ÈRE LECTURE — {parole.lecture1.ref}</p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '8px 0' }}>
                {parole.lecture1.mots_cles?.map(mot => (
                  <span key={mot} style={{ background: '#e8f4ef', color: '#3a7d5a', padding: '3px 10px', borderRadius: '20px', fontSize: '12px' }}>{mot}</span>
                ))}
              </div>
              <p style={{ fontSize: '13px', color: '#4a4a4a', lineHeight: '1.7', fontStyle: 'italic' }}>{parole.lecture1.resume}</p>
            </div>
          )}

          {parole.lecture2 && (
            <div className="card" style={{ marginBottom: '12px' }}>
              <p className="section-label" style={{ color: '#3a6d7a' }}>📘 2ÈME LECTURE — {parole.lecture2.ref}</p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '8px 0' }}>
                {parole.lecture2.mots_cles?.map(mot => (
                  <span key={mot} style={{ background: '#e8f4f8', color: '#3a6d7a', padding: '3px 10px', borderRadius: '20px', fontSize: '12px' }}>{mot}</span>
                ))}
              </div>
              <p style={{ fontSize: '13px', color: '#4a4a4a', lineHeight: '1.7', fontStyle: 'italic' }}>{parole.lecture2.resume}</p>
            </div>
          )}

          {parole.psaume && (
            <div style={{ background: '#f0eefc', border: '0.5px solid #dcd8f5', borderRadius: '12px', padding: '12px 16px', marginBottom: '12px' }}>
              <p className="section-label" style={{ color: '#6b63d4' }}>🎵 PSAUME</p>
              <p style={{ fontSize: '14px', color: '#4a4460', fontStyle: 'italic', lineHeight: '1.7' }}>« {parole.psaume.resume} »</p>
            </div>
          )}

          {parole.evangile && (
            <div className="card" style={{ marginBottom: '12px' }}>
              <p className="section-label" style={{ color: '#a05030' }}>📕 ÉVANGILE — {parole.evangile.ref}</p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '8px 0' }}>
                {parole.evangile.mots_cles?.map(mot => (
                  <span key={mot} style={{ background: '#fff0e8', color: '#a05030', padding: '3px 10px', borderRadius: '20px', fontSize: '12px' }}>{mot}</span>
                ))}
              </div>
              <p style={{ fontSize: '13px', color: '#4a4a4a', lineHeight: '1.7', fontStyle: 'italic' }}>{parole.evangile.resume}</p>
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