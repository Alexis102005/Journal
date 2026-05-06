import { useState, useEffect } from 'react'
import { db } from './firebase'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore'
import Accueil from './components/Accueil'
import Ecrire from './components/Ecrire'
import Entrees from './components/Entrees'
import Parole from './components/ParoleAuto'
import { traductions } from './i18n'
import ConseilsIA from './components/ConseilsIA'

export default function App() {
  const [ecran, setEcran] = useState('accueil')
  const [langue, setLangue] = useState(() => localStorage.getItem('langue') || 'fr')
  const [isAdmin, setIsAdmin] = useState(window.location.hash === '#admin')
  const [entrees, setEntrees] = useState([])
  const [chargement, setChargement] = useState(true)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')

  const t = traductions[langue] || traductions.fr

  // Lire les entrées depuis Firestore au démarrage
  useEffect(() => {
    const chargerEntrees = async () => {
      try {
        const q = query(collection(db, 'entrees'), orderBy('id', 'desc'))
        const snapshot = await getDocs(q)
        const data = snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id }))
        setEntrees(data)
      } catch (e) {
        console.error('Erreur chargement Firestore:', e)
      }
      setChargement(false)
    }
    chargerEntrees()
  }, [])

  // Détecter changement de hash admin
  useEffect(() => {
    const onHashChange = () => setIsAdmin(window.location.hash === '#admin')
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Thème
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : '')
    localStorage.setItem('theme', theme)
  }, [theme])

  const changerLangue = (l) => {
    setLangue(l)
    localStorage.setItem('langue', l)
  }

  const ajouterEntree = async (entree) => {
    try {
      const docRef = await addDoc(collection(db, 'entrees'), entree)
      setEntrees([{ ...entree, docId: docRef.id }, ...entrees])
    } catch (e) {
      console.error('Erreur ajout:', e)
    }
  }

  const mettreAJourEntree = async (entreeModifiee) => {
    try {
      const ref = doc(db, 'entrees', entreeModifiee.docId)
      await updateDoc(ref, entreeModifiee)
      setEntrees(entrees.map(e => e.docId === entreeModifiee.docId ? entreeModifiee : e))
    } catch (e) {
      console.error('Erreur modification:', e)
    }
  }

  const supprimerEntree = async (docId) => {
    try {
      await deleteDoc(doc(db, 'entrees', docId))
      setEntrees(entrees.filter(e => e.docId !== docId))
    } catch (e) {
      console.error('Erreur suppression:', e)
    }
  }

  if (chargement) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>
        <p>Chargement...</p>
      </div>
    )
  }

  return (
    <div className="app">
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
              border: '1px solid var(--border)',
              background: langue === l ? 'var(--accent)' : 'var(--bg-card)',
              color: langue === l ? 'white' : 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            {l === 'fr' ? '🇫🇷' : '🇬🇧'}
          </button>
        ))}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          style={{
            padding: '4px 10px', borderRadius: '20px', fontSize: '12px',
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      <div className="contenu">
        {ecran === 'accueil' && <Accueil entrees={entrees} langue={langue} theme={theme} setTheme={setTheme} setEcran={setEcran} />}
        {ecran === 'ecrire' && <Ecrire onSave={ajouterEntree} setEcran={setEcran} langue={langue} />}
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