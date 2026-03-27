import { useState } from 'react'
import Accueil from './components/Accueil'
import Ecrire from './components/Ecrire'
import Entrees from './components/Entrees'

export default function App() {
  const [ecran, setEcran] = useState('accueil')
  const [entrees, setEntrees] = useState([])

  const ajouterEntree = (entree) => {
    setEntrees([entree, ...entrees])
  }

  return (
    <div>
      <div>
        {ecran === 'accueil' && <Accueil entrees={entrees} />}
        {ecran === 'ecrire'  && <Ecrire onSave={ajouterEntree} />}
        {ecran === 'entrees' && <Entrees entrees={entrees} />}
      </div>

      <nav>
        <button onClick={() => setEcran('accueil')}>🏠 Accueil</button>
        <button onClick={() => setEcran('ecrire')}>✏️ Écrire</button>
        <button onClick={() => setEcran('entrees')}>📓 Entrées</button>
      </nav>
    </div>
  )
}