export default function Entrees({ entrees }) {
  if (entrees.length === 0) {
    return (
      <div>
        <h2>Mes entrées</h2>
        <p>Aucune entrée pour l'instant. Commence à écrire !</p>
      </div>
    )
  }

  return (
    <div>
      <h2>Mes entrées ({entrees.length})</h2>

      {entrees.map(entree => (
        <div key={entree.id} style={{ border: '1px solid #ccc', margin: '10px 0', padding: '10px' }}>
          <p style={{ color: 'gray', fontSize: '12px' }}>{entree.date} · {entree.mood}</p>
          <h3>{entree.titre}</h3>
          <p>{entree.contenu}</p>
          <p style={{ color: 'gray', fontSize: '12px' }}>📝 {entree.mots} mots</p>
        </div>
      ))}
    </div>
  )
}