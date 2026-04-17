import { useState } from 'react'
import { getIllustration } from '../utils/illustration'

export default function Ecrire({ onSave, setEcran, langue }) {
  const [titre, setTitre] = useState('')
  const [contenu, setContenu] = useState('')
  const [mood, setMood] = useState('')
  const [focus, setFocus] = useState(false)
  const [enregistrement, setEnregistrement] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState(null)
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [transcriptionEnCours, setTranscriptionEnCours] = useState(false)

  const illustration = getIllustration()

  const sauvegarder = () => {
    if (!contenu) return
    const entree = {
      id: Date.now(),
      date: new Date().toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      }),
      titre: titre || 'Sans titre',
      contenu,
      mood,
      mots: contenu.trim().split(/\s+/).length
    }
    onSave(entree)
    setTitre('')
    setContenu('')
    setMood('')
    setFocus(false)
    setEcran('entrees')
  }

  const demarrerEnregistrement = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks = []
      recorder.ondataavailable = e => chunks.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
      }
      recorder.start()
      setMediaRecorder(recorder)
      setEnregistrement(true)
    } catch(e) {
      alert(langue === 'en' ? 'Microphone access denied.' : 'Accès au micro refusé.')
    }
  }

  const arreterEnregistrement = () => {
    mediaRecorder.stop()
    mediaRecorder.stream.getTracks().forEach(t => t.stop())
    setEnregistrement(false)
  }

  const transcrire = async () => {
    if (!audioBlob) return
    setTranscriptionEnCours(true)
    try {
      const reader = new FileReader()
      reader.readAsDataURL(audioBlob)
      reader.onloadend = async () => {
        try {
          const base64 = reader.result.split(',')[1]
          const res = await fetch('/api/transcrire', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio: base64, langue: langue === 'en' ? 'en' : 'fr' })
          })
          const data = await res.json()
          if (data.text) {
            setContenu(prev => prev ? prev + '\n' + data.text : data.text)
            setAudioBlob(null)
            setAudioUrl(null)
          } else {
            alert(langue === 'en' ? 'Transcription failed.' : 'Échec de la transcription.')
          }
        } catch(e) { console.error(e) }
        setTranscriptionEnCours(false)
      }
    } catch(e) {
      console.error(e)
      setTranscriptionEnCours(false)
    }
  }

  // MODE FOCUS — plein écran immersif
  if (focus) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 200,
        backgroundImage: `url(${illustration})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        display: 'flex', flexDirection: 'column'
      }}>
        {/* Overlay sombre pour lisibilité */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)'
        }} />

        {/* Barre du haut */}
        <div style={{
          position: 'relative', zIndex: 1,
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', padding: '16px 20px'
        }}>
          <button onClick={() => setFocus(false)} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none',
            borderRadius: '20px', padding: '8px 16px',
            color: 'white', cursor: 'pointer', fontSize: '13px'
          }}>
            ← {langue === 'en' ? 'Reduce' : 'Réduire'}
          </button>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
            {contenu.trim() ? contenu.trim().split(/\s+/).length : 0} {langue === 'en' ? 'words' : 'mots'}
          </span>
          <button onClick={sauvegarder} disabled={!contenu} style={{
            background: contenu ? 'var(--accent)' : 'rgba(255,255,255,0.15)',
            border: 'none', borderRadius: '20px', padding: '8px 16px',
            color: 'white', cursor: contenu ? 'pointer' : 'not-allowed',
            fontSize: '13px', fontWeight: '600'
          }}>
            {langue === 'en' ? 'Save' : 'Sauvegarder'}
          </button>
        </div>

        {/* Zone de texte */}
        <textarea
          autoFocus
          value={contenu}
          onChange={e => setContenu(e.target.value)}
          style={{
            position: 'relative', zIndex: 1,
            flex: 1, background: 'transparent', border: 'none',
            padding: '20px 28px', color: 'white',
            fontSize: '17px', lineHeight: '2', resize: 'none',
            outline: 'none', fontFamily: 'Georgia, serif',
            textShadow: '0 1px 3px rgba(0,0,0,0.8)'
          }}
          placeholder={langue === 'en' ? "Write freely..." : "Écris librement..."}
        />

        {/* Barre audio en bas */}
        <div style={{
          position: 'relative', zIndex: 1,
          padding: '12px 20px', display: 'flex',
          alignItems: 'center', gap: '10px',
          background: 'rgba(0,0,0,0.3)'
        }}>
          {!enregistrement && !audioUrl && (
            <button onClick={demarrerEnregistrement} style={{
              background: 'rgba(255,255,255,0.15)', color: 'white',
              border: '1px solid rgba(255,255,255,0.3)', borderRadius: '24px',
              padding: '8px 16px', fontSize: '13px', cursor: 'pointer'
            }}>
              🎙️ {langue === 'en' ? 'Record' : 'Dicter'}
            </button>
          )}
          {enregistrement && (
            <button onClick={arreterEnregistrement} style={{
              background: 'rgba(220,38,38,0.4)', color: 'white',
              border: '1px solid #dc2626', borderRadius: '24px',
              padding: '8px 16px', fontSize: '13px', cursor: 'pointer'
            }}>
              ⏹️ {langue === 'en' ? 'Stop' : 'Arrêter'} ●
            </button>
          )}
          {audioUrl && !enregistrement && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <audio controls src={audioUrl} style={{ flex: 1, height: '32px' }} />
              <button onClick={transcrire} disabled={transcriptionEnCours} style={{
                background: 'var(--accent)', color: 'white', border: 'none',
                borderRadius: '20px', padding: '8px 14px',
                fontSize: '12px', fontWeight: '600', cursor: 'pointer'
              }}>
                {transcriptionEnCours ? '⏳...' : '✨ Transcrire'}
              </button>
              <button onClick={() => { setAudioBlob(null); setAudioUrl(null) }}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px' }}>
                ✕
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // MODE NORMAL
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 80px)' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 0', marginBottom: '12px'
      }}>
        <div>
          <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--accent)', letterSpacing: '0.1em' }}>
            {langue === 'en' ? 'WRITE' : 'ÉCRITURE'}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString(langue === 'en' ? 'en-GB' : 'fr-FR', {
              weekday: 'long', day: 'numeric', month: 'long'
            })}
          </p>
        </div>
        <button onClick={sauvegarder} disabled={!contenu} style={{
          background: contenu ? 'var(--accent)' : 'var(--border)',
          color: contenu ? 'white' : 'var(--text-muted)',
          border: 'none', borderRadius: '12px',
          padding: '10px 20px', fontSize: '14px', fontWeight: '600',
          cursor: contenu ? 'pointer' : 'not-allowed'
        }}>
          💾 {langue === 'en' ? 'Save' : 'Sauvegarder'}
        </button>
      </div>

      {/* Mood chips */}
      <div className="card" style={{ marginBottom: '12px' }}>
        <p className="section-label">{langue === 'en' ? 'HOW DO YOU FEEL ?' : 'COMMENT TU TE SENS ?'}</p>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[['😄', langue === 'en' ? 'Good' : 'Bien'],
            ['😐', langue === 'en' ? 'Neutral' : 'Neutre'],
            ['😞', langue === 'en' ? 'Difficult' : 'Difficile'],
            ['💪', langue === 'en' ? 'Strong' : 'Fort'],
            ['🙏', langue === 'en' ? 'At peace' : 'En paix']
          ].map(([emoji, label]) => (
            <button key={label} onClick={() => setMood(`${emoji} ${label}`)}
              className={`chip ${mood === `${emoji} ${label}` ? 'actif' : ''}`}>
              {emoji} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Zone écriture + aperçu illustration */}
      <div className="card" style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
        onClick={() => setFocus(true)}>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.08,
          backgroundImage: `url(${illustration})`,
          backgroundSize: 'cover', backgroundPosition: 'center'
        }} />
        <input
          style={{
            position: 'relative', zIndex: 1,
            border: 'none', borderBottom: '0.5px solid var(--border)',
            padding: '0 0 12px', fontSize: '17px', fontWeight: '700',
            background: 'transparent', color: 'var(--text-primary)',
            outline: 'none', width: '100%', marginBottom: '12px'
          }}
          placeholder={langue === 'en' ? 'Title...' : 'Titre...'}
          value={titre}
          onChange={e => { e.stopPropagation(); setTitre(e.target.value) }}
          onClick={e => e.stopPropagation()}
        />
        <p style={{
          position: 'relative', zIndex: 1,
          fontSize: '14px', color: contenu ? 'var(--text-primary)' : 'var(--text-muted)',
          lineHeight: '1.8', minHeight: '80px'
        }}>
          {contenu || (langue === 'en' ? 'Tap to write...' : 'Appuie pour écrire...')}
        </p>
        <p style={{
          position: 'relative', zIndex: 1,
          fontSize: '11px', color: 'var(--accent)',
          marginTop: '12px', fontWeight: '600'
        }}>
          ✏️ {langue === 'en' ? 'Open full screen' : 'Écrire en plein écran'} →
        </p>
      </div>

      {/* Barre audio */}
      <div style={{
        padding: '12px 0', borderTop: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px'
      }}>
        {!enregistrement && !audioUrl && (
          <button onClick={demarrerEnregistrement} style={{
            background: 'var(--accent-light)', color: 'var(--accent)',
            border: '1px solid var(--accent)', borderRadius: '24px',
            padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
          }}>
            🎙️ {langue === 'en' ? 'Record' : 'Dicter'}
          </button>
        )}
        {enregistrement && (
          <button onClick={arreterEnregistrement} style={{
            background: '#fee2e2', color: '#dc2626',
            border: '1px solid #dc2626', borderRadius: '24px',
            padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
          }}>
            ⏹️ {langue === 'en' ? 'Stop' : 'Arrêter'} ●
          </button>
        )}
        {audioUrl && !enregistrement && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <audio controls src={audioUrl} style={{ flex: 1, height: '32px' }} />
            <button onClick={transcrire} disabled={transcriptionEnCours} style={{
              background: 'var(--accent)', color: 'white',
              border: 'none', borderRadius: '20px',
              padding: '8px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer'
            }}>
              {transcriptionEnCours ? '⏳...' : '✨ Transcrire'}
            </button>
            <button onClick={() => { setAudioBlob(null); setAudioUrl(null) }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }}>
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  )
}