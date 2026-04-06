import { useState } from 'react'

export default function Ecrire({ onSave, setEcran }) {
  const [titre, setTitre] = useState('')
  const [contenu, setContenu] = useState('')
  const [mood, setMood] = useState('')
  const [enregistrement, setEnregistrement] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState(null)
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [transcription, setTranscription] = useState('')
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
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const recorder = new MediaRecorder(stream)
  const chunks = []

  recorder.ondataavailable = e => chunks.push(e.data)
  recorder.onstop = async () => {
    const blob = new Blob(chunks, { type: 'audio/webm' })
    const url = URL.createObjectURL(blob)
    setAudioBlob(blob)
    setAudioUrl(url)
    transcrire(blob)
  }

  recorder.start()
  setMediaRecorder(recorder)
  setEnregistrement(true)
}

const arreterEnregistrement = () => {
  mediaRecorder.stop()
  setEnregistrement(false)
}

const transcrire = async (blob) => {
  setTranscriptionEnCours(true)
  const formData = new FormData()
  formData.append('file', blob, 'audio.webm')
  formData.append('model', 'whisper-large-v3')
  formData.append('language', 'fr')

  try {
    const res = await fetch('/api/transcrire', {
      method: 'POST',
      body: formData
    })
    const data = await res.json()
    setTranscription(data.text || '')
  } catch(e) {
    console.error(e)
  }
  setTranscriptionEnCours(false)
}

const validerTranscription = () => {
  setContenu(prev => prev + '\n' + transcription)
  setTranscription('')
  setAudioBlob(null)
  setAudioUrl(null)
}

const garderAudio = () => {
  setTranscription('')
}

  return (
    <div className="ecran">
      <h2>Nouvelle entrée</h2>

      <div className="mood-section">
        <p className="section-label">Humeur du jour</p>
        <div className="mood-chips">
          {['😄 Bien', '😐 Neutre', '😞 Difficile', '💪 Fort', '🙏 En paix'].map(m => (
            <button
              key={m}
              onClick={() => setMood(m)}
              className={`chip ${mood === m ? 'actif' : ''}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <input
        className="input-titre"
        type="text"
        placeholder="Titre (optionnel)"
        value={titre}
        onChange={e => setTitre(e.target.value)}
      />

      <textarea
        className="textarea-contenu"
        placeholder="Qu'as-tu vécu aujourd'hui ? Quelles pensées t'ont traversé ?"
        value={contenu}
        onChange={e => setContenu(e.target.value)}
        rows={8}
      />
      <div style={{ border: '1px solid #ddd', borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
  <p className="section-label">🎙️ ENREGISTREMENT VOCAL</p>
  
  {!enregistrement && !audioUrl && (
    <button onClick={demarrerEnregistrement} style={{ background: '#6b63d4', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 20px', cursor: 'pointer', fontSize: '14px' }}>
      🎙️ Commencer à enregistrer
    </button>
  )}

  {enregistrement && (
    <button onClick={arreterEnregistrement} style={{ background: '#e05050', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 20px', cursor: 'pointer', fontSize: '14px', animation: 'pulse 1s infinite' }}>
      ⏹️ Arrêter l'enregistrement
    </button>
  )}

  {transcriptionEnCours && (
    <p style={{ color: '#999', fontStyle: 'italic', marginTop: '10px' }}>⏳ Transcription en cours...</p>
  )}

  {audioUrl && (
    <div style={{ marginTop: '12px' }}>
      <audio controls src={audioUrl} style={{ width: '100%', marginBottom: '10px' }} />
      
      {transcription && (
        <div style={{ background: '#f0eefc', borderRadius: '10px', padding: '12px', marginBottom: '10px' }}>
          <p style={{ fontSize: '11px', color: '#6b63d4', fontWeight: 'bold', marginBottom: '6px' }}>TRANSCRIPTION</p>
          <p style={{ fontSize: '14px', color: '#1e1b18', lineHeight: '1.7' }}>{transcription}</p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <button onClick={validerTranscription} style={{ flex: 1, background: '#6b63d4', color: 'white', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontSize: '13px' }}>
              ✓ Valider
            </button>
            <button onClick={garderAudio} style={{ flex: 1, background: 'white', color: '#6b63d4', border: '1px solid #6b63d4', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontSize: '13px' }}>
              🎵 Garder l'audio
            </button>
          </div>
        </div>
      )}
    </div>
  )}
</div>

      <button className="btn-save" onClick={sauvegarder}>
        Sauvegarder
      </button>
    </div>
  )
}