import { useState, useEffect } from 'react'
import Accueil from './components/Accueil'
import Ecrire from './components/Ecrire'
import Entrees from './components/Entrees'
import Parole from './components/ParoleAuto'
import { traductions } from './i18n'
import ConseilsIA from './components/ConseilsIA'

export default function App() {
  const [ecran, setEcran] = useState('accueil')
  const [langue, setLangue] = useState(() =>
    localStorage.getItem('langue') || 'fr'
  )
  const [isAdmin, setIsAdmin] = useState(
    window.location.hash === '#admin'
  )

  const t = traductions[langue] || traductions.fr

  // Détecte changement de hash pour admin
  useEffect(() => {
    const onHashChange = () => {
      setIsAdmin(window.location.hash === '#admin')
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const changerLangue = (l) => {
    setLangue(l)
    localStorage.setItem('langue', l)
  }

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
  
  const [theme, setTheme] = useState(() =>
  localStorage.getItem('theme') || 'light'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : '')
    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <div className="app">

      {/* Sélecteur de langue flottant */}
      <div style={{
        position: 'fixed', top: '12px', right: '12px',
        display: 'flex', gap: '4px', zIndex: 100
      }}>
        {['fr', 'en'].map(l => (
          <button
            key={l}
            onClick={() => changerLangue(l)}
            style={{
              padding: '4px 10px', borderRadius: '20px', fontSize: '12px',
              border: '1px solid #ddd',
              background: langue === l ? '#6b63d4' : 'white',
              color: langue === l ? 'white' : '#666',
              cursor: 'pointer'
            }}
          >
            {l === 'fr' ? '🇫🇷' : '🇬🇧'}
          </button>
        ))}
      </div>

      <div className="contenu">
        {ecran === 'accueil' && <Accueil entrees={entrees} langue={langue} theme={theme} setTheme={setTheme} />}
        {ecran === 'ecrire' && <Ecrire onSave={ajouterEntree} setEcran={setEcran} />}
        {ecran === 'entrees' && <Entrees entrees={entrees} onUpdate={mettreAJourEntree} onDelete={supprimerEntree} />}
        {ecran === 'parole' && <Parole langue={langue} isAdmin={isAdmin} />}
        {ecran === 'conseils' && <ConseilsIA entrees={entrees} langue={langue} />}
      </div>

      <nav className="nav-bar">
  <button onClick={() => setEcran('accueil')} className={ecran === 'accueil' ? 'actif' : ''}>
    🏠<span>{t.accueil}</span>
  </button>
  <button onClick={() => setEcran('parole')} className={ecran === 'parole' ? 'actif' : ''}>
    📖<span>{t.parole}</span>
  </button>
  <button onClick={() => setEcran('conseils')} className={`nav-fab ${ecran === 'conseils' ? 'actif' : ''}`}>
    ✨
  </button>
  <button onClick={() => setEcran('ecrire')} className={ecran === 'ecrire' ? 'actif' : ''}>
    ✏️<span>{t.ecrire}</span>
  </button>
  <button onClick={() => setEcran('entrees')} className={ecran === 'entrees' ? 'actif' : ''}>
    📓<span>{t.entrees}</span>
  </button>
</nav>

    </div>
  )
}