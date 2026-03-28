import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'

const MOT_DE_PASSE_ADMIN = 'alexis2026'

export default function Parole() {
  const [parole, setParole] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [mode, setMode] = useState('voir')
  const [mdp, setMdp] = useState('')
  const [adminOk, setAdminOk] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const dateAffichee = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  const [form, setForm] = useState({
    lecture1_ref: '',
    lecture1_mots: '',
    lecture1_resume: '',
    psaume_verset: '',
    evangile_ref: '',
    evangile_mots: '',
    evangile_resume: '',
    reflexion: '',
    source: ''
  })

  useEffect(() => {
    const charger = async () => {
      const ref = doc(db, 'paroles', today)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        setParole(snap.data())
        setForm(snap.data())
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

  const sauvegarder = async () => {
    await setDoc(doc(db, 'paroles', today), form)
    setParole(form)
    setMode('voir')
    setAdminOk(false)
  }

  if (chargement) return <div className="ecran"><p style={{color:'#999'}}>Chargement...</p></div>

  return (
    <div className="ecran">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2>Parole du jour</h2>
          <p style={{ fontSize: '12px', color: '#a09890' }}>{dateAffichee}</p>
        </div>
        {mode === 'voir' && (
          <button
            onClick={() => setMode('auth')}
            style={{ background: '#f0eefc', color: '#6b63d4', border: 'none', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', cursor: 'pointer' }}
          >
            ✏️ Admin
          </button>
        )}
        {mode !== 'voir' && (
          <button
            onClick={() => { setMode('voir'); setAdminOk(false); setMdp('') }}
            style={{ background: '#fee', color: '#a05050', border: 'none', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', cursor: 'pointer' }}
          >
            ✕ Annuler
          </button>
        )}
      </div>

      {/* AUTH */}
      {mode === 'auth' && (
        <div className="card">
          <p className="section-label">MOT DE PASSE ADMIN</p>
          <input
            className="input-titre"
            type="password"
            placeholder="Mot de passe..."
            value={mdp}
            onChange={e => setMdp(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && verifierMdp()}
          />
          <button className="btn-save" onClick={verifierMdp}>Confirmer</button>
        </div>
      )}

      {/* VOIR */}
      {mode === 'voir' && !parole && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#b0a89c' }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>📖</p>
          <p style={{ fontStyle: 'italic' }}>Aucune réflexion pour aujourd'hui.</p>
        </div>
      )}

      {mode === 'voir' && parole && (
        <div>
          <div className="card" style={{ marginBottom: '12px' }}>
            <p className="section-label" style={{ color: '#3a7d5a' }}>📗 1ÈRE LECTURE — {parole.lecture1_ref}</p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '8px 0' }}>
              {parole.lecture1_mots.split(',').map(m => m.trim()).filter(Boolean).map(mot => (
                <span key={mot} style={{ background: '#e8f4ef', color: '#3a7d5a', padding: '3px 10px', borderRadius: '20px', fontSize: '12px' }}>{mot}</span>
              ))}
            </div>
            <p style={{ fontSize: '13px', color: '#4a4a4a', lineHeight: '1.7', fontStyle: 'italic' }}>{parole.lecture1_resume}</p>
          </div>

          {parole.psaume_verset && (
            <div style={{ background: '#f0eefc', border: '0.5px solid #dcd8f5', borderRadius: '12px', padding: '12px 16px', marginBottom: '12px' }}>
              <p className="section-label" style={{ color: '#6b63d4' }}>🎵 PSAUME</p>
              <p style={{ fontSize: '14px', color: '#4a4460', fontStyle: 'italic', lineHeight: '1.7' }}>« {parole.psaume_verset} »</p>
            </div>
          )}

          <div className="card" style={{ marginBottom: '12px' }}>
            <p className="section-label" style={{ color: '#a05030' }}>📕 ÉVANGILE — {parole.evangile_ref}</p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '8px 0' }}>
              {parole.evangile_mots.split(',').map(m => m.trim()).filter(Boolean).map(mot => (
                <span key={mot} style={{ background: '#fff0e8', color: '#a05030', padding: '3px 10px', borderRadius: '20px', fontSize: '12px' }}>{mot}</span>
              ))}
            </div>
            <p style={{ fontSize: '13px', color: '#4a4a4a', lineHeight: '1.7', fontStyle: 'italic' }}>{parole.evangile_resume}</p>
          </div>

          {parole.reflexion && (
            <div style={{ borderLeft: '3px solid #6b63d4', paddingLeft: '14px', marginBottom: '12px' }}>
              <p className="section-label" style={{ color: '#6b63d4' }}>✦ RÉFLEXION</p>
              <p style={{ fontSize: '14px', color: '#1e1b18', lineHeight: '1.8' }}>{parole.reflexion}</p>
              {parole.source && <p style={{ fontSize: '11px', color: '#b0a89c', marginTop: '6px' }}>— {parole.source}</p>}
            </div>
          )}
        </div>
      )}

      {/* ÉDITER */}
      {mode === 'editer' && adminOk && (
        <div>
          <div className="card" style={{ marginBottom: '12px' }}>
            <p className="section-label" style={{ color: '#3a7d5a' }}>📗 1ÈRE LECTURE</p>
            <input className="input-titre" placeholder="Référence (ex: Ez 37, 21-28)" value={form.lecture1_ref} onChange={e => setForm({...form, lecture1_ref: e.target.value})} />
            <input className="input-titre" placeholder="Mots clés (séparés par virgules)" value={form.lecture1_mots} onChange={e => setForm({...form, lecture1_mots: e.target.value})} />
            <textarea className="textarea-contenu" rows={3} placeholder="Résumé..." value={form.lecture1_resume} onChange={e => setForm({...form, lecture1_resume: e.target.value})} />
          </div>

          <div className="card" style={{ marginBottom: '12px' }}>
            <p className="section-label" style={{ color: '#6b63d4' }}>🎵 PSAUME</p>
            <input className="input-titre" placeholder="Verset essentiel..." value={form.psaume_verset} onChange={e => setForm({...form, psaume_verset: e.target.value})} />
          </div>

          <div className="card" style={{ marginBottom: '12px' }}>
            <p className="section-label" style={{ color: '#a05030' }}>📕 ÉVANGILE</p>
            <input className="input-titre" placeholder="Référence (ex: Jn 11, 45-57)" value={form.evangile_ref} onChange={e => setForm({...form, evangile_ref: e.target.value})} />
            <input className="input-titre" placeholder="Mots clés (séparés par virgules)" value={form.evangile_mots} onChange={e => setForm({...form, evangile_mots: e.target.value})} />
            <textarea className="textarea-contenu" rows={3} placeholder="Résumé..." value={form.evangile_resume} onChange={e => setForm({...form, evangile_resume: e.target.value})} />
          </div>

          <div className="card" style={{ marginBottom: '12px' }}>
            <p className="section-label" style={{ color: '#6b63d4' }}>✦ RÉFLEXION</p>
            <textarea className="textarea-contenu" rows={5} placeholder="Ta réflexion ou résumé de l'homélie..." value={form.reflexion} onChange={e => setForm({...form, reflexion: e.target.value})} />
            <input className="input-titre" placeholder="Source (ex: Père Francis Goossens)" value={form.source} onChange={e => setForm({...form, source: e.target.value})} style={{ marginTop: '8px' }} />
          </div>

          <button className="btn-save" onClick={sauvegarder}>Sauvegarder dans Firebase</button>
        </div>
      )}
    </div>
  )
}