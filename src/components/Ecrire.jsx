import { useState } from 'react'

export default function Ecrire({ onSave, setEcran }) {
  const [titre, setTitre] = useState('')
  const [contenu, setContenu] = useState('')
  const [mood, setMood] = useState('')

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

      <button className="btn-save" onClick={sauvegarder}>
        Sauvegarder
      </button>
    </div>
  )
}