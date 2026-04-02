import { useState } from 'react'

export default function Entrees({ entrees, onUpdate, onDelete }) {
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editContenu, setEditContenu] = useState('')
  const [editTitre, setEditTitre] = useState('')

  const ouvrirEntree = (entree) => {
    setSelected(entree)
    setEditing(false)
  }

  const fermer = () => {
    setSelected(null)
    setEditing(false)
  }

  const demarrerEdition = () => {
    setEditContenu(selected.contenu)
    setEditTitre(selected.titre)
    setEditing(true)
  }

  const sauvegarderEdition = () => {
    const updated = {
      ...selected,
      titre: editTitre,
      contenu: editContenu,
      mots: editContenu.trim().split(/\s+/).length
    }
    onUpdate(updated)
    setSelected(updated)
    setEditing(false)
  }

  const supprimerEntree = () => {
    if (confirm('Supprimer cette entrée ?')) {
      onDelete(selected.id)
      fermer()
    }
  }

  if (entrees.length === 0) {
    return (
      <div className="ecran">
        <h2>Mes entrées</h2>
        <p style={{ color: '#999', marginTop: '20px', textAlign: 'center' }}>
          Aucune entrée pour l'instant.<br />Commence à écrire !
        </p>
      </div>
    )
  }

  return (
    <div className="ecran">
      <h2>Mes entrées ({entrees.length})</h2>

      {/* LISTE */}
      {!selected && (
        <div style={{ marginTop: '16px' }}>
          {entrees.map(entree => (
            <div key={entree.id} className="entree-card" onClick={() => ouvrirEntree(entree)} style={{ cursor: 'pointer' }}>
              <div className="entree-meta">
                <span className="entree-date">{entree.date}</span>
                {entree.mood && <span className="entree-mood">{entree.mood}</span>}
              </div>
              <p className="entree-titre">{entree.titre}</p>
              <p className="entree-contenu">{entree.contenu}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                <p className="entree-mots">📝 {entree.mots} mots</p>
                {entree.audioUrl && <span style={{ fontSize: '11px', color: '#6b63d4' }}>🎙️ Audio</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAIL */}
      {selected && !editing && (
        <div style={{ marginTop: '16px' }}>
          <button onClick={fermer} style={{ background: 'none', border: 'none', color: '#6b63d4', cursor: 'pointer', fontSize: '14px', marginBottom: '16px', padding: '0' }}>
            ← Retour
          </button>

          <div className="entree-card">
            <div className="entree-meta">
              <span className="entree-date">{selected.date}</span>
              {selected.mood && <span className="entree-mood">{selected.mood}</span>}
            </div>
            <p className="entree-titre" style={{ fontSize: '18px', marginBottom: '12px' }}>{selected.titre}</p>
            <p style={{ fontSize: '15px', color: '#4a4040', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>{selected.contenu}</p>
            <p className="entree-mots" style={{ marginTop: '12px' }}>📝 {selected.mots} mots</p>

            {selected.audioUrl && (
              <div style={{ marginTop: '12px' }}>
                <p style={{ fontSize: '11px', color: '#6b63d4', fontWeight: 'bold', marginBottom: '6px' }}>🎙️ ENREGISTREMENT</p>
                <audio controls src={selected.audioUrl} style={{ width: '100%' }} />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button onClick={demarrerEdition} style={{ flex: 1, background: '#6b63d4', color: 'white', border: 'none', borderRadius: '12px', padding: '12px', cursor: 'pointer', fontSize: '14px' }}>
              ✏️ Modifier
            </button>
            <button onClick={supprimerEntree} style={{ flex: 1, background: 'white', color: '#e05050', border: '1px solid #e05050', borderRadius: '12px', padding: '12px', cursor: 'pointer', fontSize: '14px' }}>
              🗑️ Supprimer
            </button>
          </div>
        </div>
      )}

      {/* EDITION */}
      {selected && editing && (
        <div style={{ marginTop: '16px' }}>
          <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', color: '#6b63d4', cursor: 'pointer', fontSize: '14px', marginBottom: '16px', padding: '0' }}>
            ← Annuler
          </button>

          <input
            className="input-titre"
            value={editTitre}
            onChange={e => setEditTitre(e.target.value)}
            placeholder="Titre"
          />

          <textarea
            className="textarea-contenu"
            value={editContenu}
            onChange={e => setEditContenu(e.target.value)}
            rows={12}
          />

          <button className="btn-save" onClick={sauvegarderEdition}>
            Sauvegarder les modifications
          </button>
        </div>
      )}
    </div>
  )
}