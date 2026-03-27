import { useState } from 'react'

export default function Ecrire({ onSave }) {
  const [titre, setTitre] = useState('')
  const [contenu, setContenu] = useState('')
  const [mood, setMood] = useState('')

  const sauvegarder = () => {
    if (!contenu) return

    const entree = {
      id: Date.now(),
      date: new Date().toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
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
    alert('Entrée sauvegardée ✓')
  }

  return (
    <div>
      <h2>Nouvelle entrée</h2>

      <input
        type="text"
        placeholder="Titre (optionnel)"
        value={titre}
        onChange={(e) => setTitre(e.target.value)}
      />

      <textarea
        placeholder="Écris ton entrée ici..."
        value={contenu}
        onChange={(e) => setContenu(e.target.value)}
      />

      <div>
        <p>Humeur du jour :</p>
        {['😄 Bien', '😐 Neutre', '😞 Difficile', '💪 Fort', '🙏 En paix'].map(m => (
          <button
            key={m}
            onClick={() => setMood(m)}
            style={{ fontWeight: mood === m ? 'bold' : 'normal' }}
          >
            {m}
          </button>
        ))}
      </div>

        <button onClick={sauvegarder}>Sauvegarder</button>
      </div>
    )
  }