import { useState, useEffect } from 'react'
import Accueil from './components/Accueil'
import Ecrire from './components/Ecrire'
import Entrees from './components/Entrees'
import Parole from './components/ParoleAuto'


export default function App() {
  const [ecran, setEcran] = useState('accueil')

  const [entrees, setEntrees] = useState(() => {
    const saved = localStorage.getItem('journal_entrees')
    return saved ? JSON.parse(saved) : []
  })
  const mettreAJourEntree = (entreeModifiee) => {
  setEntrees(entrees.map(e => e.id === entreeModifiee.id ? entreeModifiee : e))
}

const supprimerEntree = (id) => {
  setEntrees(entrees.filter(e => e.id !== id))
}

  useEffect(() => {
    localStorage.setItem('journal_entrees', JSON.stringify(entrees))
  }, [entrees])

  const ajouterEntree = (entree) => {
    setEntrees([entree, ...entrees])
  }

  return (
    <div className="app">
      <div className="contenu">
        {ecran === 'accueil'  && <Accueil entrees={entrees} />}
        {ecran === 'ecrire'   && <Ecrire onSave={ajouterEntree} setEcran={setEcran} />}
        {ecran === 'entrees' && <Entrees entrees={entrees} onUpdate={mettreAJourEntree} onDelete={supprimerEntree} />}
        {ecran === 'parole' && <Parole />}
      </div>

      <nav className="nav-bar">
        <button onClick={() => setEcran('accueil')} className={ecran === 'accueil' ? 'actif' : ''}>
        🏠<span>Accueil</span>
          </button>
        <button onClick={() => setEcran('parole')} className={ecran === 'parole' ? 'actif' : ''}>
         📖<span>Parole</span>
        </button>
        <button onClick={() => setEcran('ecrire')} className={ecran === 'ecrire' ? 'actif' : ''}>
        ✏️<span>Écrire</span>
        </button>
        <button onClick={() => setEcran('entrees')} className={ecran === 'entrees' ? 'actif' : ''}>
        📓 <span>Entrées</span>
        </button>
      </nav>
    </div>
  )
}