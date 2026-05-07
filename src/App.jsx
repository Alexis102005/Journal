import { useState, useEffect } from 'react'
import { db, auth } from './firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, query, where } from 'firebase/firestore'
import Accueil from './components/Accueil'
import Ecrire from './components/Ecrire'
import Entrees from './components/Entrees'
import Parole from './components/ParoleAuto'
import { traductions } from './i18n'
import ConseilsIA from './components/ConseilsIA'
import Login from './components/Login'

export default function App() {
  const [ecran, setEcran] = useState('accueil')
  const [langue, setLangue] = useState(() => localStorage.getItem('langue') || 'fr')
  const [isAdmin, setIsAdmin] = useState(window.location.hash === '#admin')
  const [entrees, setEntrees] = useState([])
  const [chargement, setChargement] = useState(true)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')
  const [utilisateur, setUtilisateur] = useState(null)
  const [authChargement, setAuthChargement] = useState(true)
  const [menuOuvert, setMenuOuvert] = useState(false)

  const t = traductions[langue] || traductions.fr

  // Écouter l'état de connexion
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUtilisateur(user)
      setAuthChargement(false)
    })
    return () => unsub()
  }, [])

  // Charger les entrées quand l'utilisateur est connecté
  useEffect(() => {
    if (!utilisateur) {
      setEntrees([])
      setChargement(false)
      return
    }
    const chargerEntrees = async () => {
      setChargement(true)
      try {
        const q = query(
          collection(db, 'entrees'),
          where('userId', '==', utilisateur.uid),
          orderBy('id', 'desc')
        )
        const snapshot = await getDocs(q)
        const data = snapshot.docs.map(d => ({ ...d.data(), docId: d.id }))
        setEntrees(data)
      } catch (e) {
        console.error('Erreur chargement:', e)
      }
      setChargement(false)
    }
    chargerEntrees()
  }, [utilisateur])

  useEffect(() => {
    const onHashChange = () => setIsAdmin(window.location.hash === '#admin')
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

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
      const entreeAvecUser = { ...entree, userId: utilisateur.uid }
      const docRef = await addDoc(collection(db, 'entrees'), entreeAvecUser)
      setEntrees([{ ...entreeAvecUser, docId: docRef.id }, ...entrees])
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

  const seDeconnecter = async () => {
    await signOut(auth)
    setEntrees([])
    setEcran('accueil')
  }

  // Écrans de chargement
  if (authChargement) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p style={{ color: 'var(--text-muted)' }}>Chargement...</p>
      </div>
    )
  }

  // Pas connecté → écran de login
  if (!utilisateur) return <Login />

  // Connecté → app normale
  if (chargement) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p style={{ color: 'var(--text-muted)' }}>Chargement...</p>
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
            background: 'var(--bg-card)', color: 'var(--text-muted)', cursor: 'pointer'
          }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOuvert(!menuOuvert)}
            style={{
              width: '32px', height: '32px', borderRadius: '50%',
              border: '2px solid var(--accent)',
              padding: 0, cursor: 'pointer', overflow: 'hidden',
              background: 'var(--bg-card)'
            }}
          >
            {utilisateur?.photoURL
              ? <img src={utilisateur.photoURL} width="32" height="32" style={{ display: 'block' }} />
              : <span style={{ fontSize: '14px' }}>👤</span>
            }
          </button>

          {menuOuvert && (
            <div style={{
              position: 'absolute', right: 0, top: '40px',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '12px', minWidth: '180px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 200
            }}>
              <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {utilisateur?.displayName}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                {utilisateur?.email}
              </p>
              <button
                onClick={() => { seDeconnecter(); setMenuOuvert(false) }}
                style={{
                  width: '100%', padding: '8px', borderRadius: '8px',
                  border: '1px solid #e05050', background: 'transparent',
                  color: '#e05050', fontSize: '13px', cursor: 'pointer'
                }}
              >
                🚪 Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="contenu">
        {ecran === 'accueil' && <Accueil entrees={entrees} langue={langue} theme={theme} setTheme={setTheme} setEcran={setEcran} />}
        {ecran === 'ecrire' && <Ecrire onSave={ajouterEntree} setEcran={setEcran} langue={langue} />}
        {ecran === 'entrees' && <Entrees entrees={entrees} onUpdate={mettreAJourEntree} onDelete={supprimerEntree} />}
        {ecran === 'parole' && <Parole langue={langue} isAdmin={isAdmin} />}
        {ecran === 'conseils' && <ConseilsIA entrees={entrees} langue={langue} utilisateur={utilisateur} />}
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