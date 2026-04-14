import { useState } from 'react'

export default function Ecrire({ onSave, setEcran, langue }) {
  const [titre, setTitre] = useState('')
  const [contenu, setContenu] = useState('')
  const [mood, setMood] = useState('')
  const [enregistrement, setEnregistrement] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState(null)
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [transcriptionEnCours, setTranscriptionEnCours] = useState(false)

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
        // On ne transcrit pas automatiquement — bouton manuel
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

  const transcrire = async (blobToTranscribe) => {
    const blob = blobToTranscribe || audioBlob
    if (!blob) return
    setTranscriptionEnCours(true)
    try {
      const reader = new FileReader()
      reader.readAsDataURL(blob)
      reader.onloadend = async () => {
        try {
          const base64 = reader.result.split(',')[1]
          const res = await fetch('/api/transcrire', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audio: base64,
              langue: langue === 'en' ? 'en' : 'fr'
            })
          })
          const data = await res.json()
          if (data.text) {
            setContenu(prev => prev ? prev + '\n' + data.text : data.text)
            setAudioBlob(null)
            setAudioUrl(null)
          } else {
            alert(langue === 'en' ? 'Transcription failed.' : 'Échec de la transcription.')
          }
        } catch(e) {
          console.error(e)
        }
        setTranscriptionEnCours(false)
      }
    } catch(e) {
      console.error(e)
      setTranscriptionEnCours(false)
    }
  }

  return (
      <div style={{
        display: 'flex', flexDirection: 'column',
         minHeight: 'calc(100vh - 80px)'
      }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 20px', borderBottom: '0.5px solid var(--border)'
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
        <button
          onClick={sauvegarder}
          disabled={!contenu}
          style={{
            background: contenu ? 'linear-gradient(135deg, var(--accent), #5a52b8)' : 'var(--border)',
            color: contenu ? 'white' : 'var(--text-muted)',
            border: 'none', borderRadius: '12px',
            padding: '10px 20px', fontSize: '14px', fontWeight: '600',
            cursor: contenu ? 'pointer' : 'not-allowed'
          }}
        >
          💾 {langue === 'en' ? 'Save' : 'Sauvegarder'}
        </button>
      </div>

      {/* Humeur */}
      <div style={{ padding: '10px 20px', borderBottom: '0.5px solid var(--border)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {[['😄', langue === 'en' ? 'Good' : 'Bien'], ['😐', langue === 'en' ? 'Neutral' : 'Neutre'], ['😞', langue === 'en' ? 'Difficult' : 'Difficile'], ['💪', langue === 'en' ? 'Strong' : 'Fort'], ['🙏', langue === 'en' ? 'At peace' : 'En paix']].map(([emoji, label]) => (
          <button
            key={label}
            onClick={() => setMood(`${emoji} ${label}`)}
            style={{
              padding: '5px 12px', borderRadius: '20px', fontSize: '12px',
              border: `1px solid ${mood === `${emoji} ${label}` ? 'var(--accent)' : 'var(--border)'}`,
              background: mood === `${emoji} ${label}` ? 'var(--accent-light)' : 'var(--bg-card)',
              color: mood === `${emoji} ${label}` ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer', fontWeight: '500'
            }}
          >
            {emoji} {label}
          </button>
        ))}
      </div>

      {/* Zone écriture */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <input
          style={{
            border: 'none', borderBottom: '0.5px solid var(--border)',
            padding: '16px 20px', fontSize: '18px', fontWeight: '700',
            background: 'transparent', color: 'var(--text-primary)', outline: 'none', width: '100%'
          }}
          placeholder={langue === 'en' ? 'Title...' : 'Titre...'}
          value={titre}
          onChange={e => setTitre(e.target.value)}
        />
        <textarea
          style={{
            flex: 1, border: 'none', padding: '16px 20px',
            fontSize: '15px', lineHeight: '1.8',
            background: 'transparent', color: 'var(--text-primary)',
            resize: 'none', outline: 'none', fontFamily: 'inherit'
          }}
          placeholder={langue === 'en' ? "What did you experience today? What is on your heart?" : "Qu'as-tu vécu aujourd'hui ? Qu'est-ce que Dieu a mis sur ton cœur ?"}
          value={contenu}
          onChange={e => setContenu(e.target.value)}
        />
      </div>

      {/* Barre audio */}
      <div style={{
        padding: '12px 20px', borderTop: '0.5px solid var(--border)',
        background: 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: '10px'
      }}>
        {!enregistrement && !audioUrl && (
          <button onClick={demarrerEnregistrement} style={{
            background: 'var(--accent-light)', color: 'var(--accent)',
            border: '1px solid var(--accent)', borderRadius: '24px',
            padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
          }}>
            🎙️ {langue === 'en' ? 'Record' : 'Enregistrer'}
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
            <button
              onClick={() => transcrire()}
              disabled={transcriptionEnCours}
              style={{
                background: 'linear-gradient(135deg, var(--accent), #5a52b8)',
                color: 'white', border: 'none', borderRadius: '20px',
                padding: '8px 14px', fontSize: '12px', fontWeight: '600',
                cursor: 'pointer', whiteSpace: 'nowrap'
              }}
            >
              {transcriptionEnCours ? '⏳...' : langue === 'en' ? '✨ Transcribe' : '✨ Transcrire'}
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