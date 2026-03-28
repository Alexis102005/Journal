export default function Entrees({ entrees }) {
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

      <div style={{ marginTop: '16px' }}>
        {entrees.map(entree => (
          <div key={entree.id} className="entree-card">
            <div className="entree-meta">
              <span className="entree-date">{entree.date}</span>
              {entree.mood && <span className="entree-mood">{entree.mood}</span>}
            </div>
            <p className="entree-titre">{entree.titre}</p>
            <p className="entree-contenu">{entree.contenu}</p>
            <p className="entree-mots">📝 {entree.mots} mots</p>
          </div>
        ))}
      </div>
    </div>
  )
}