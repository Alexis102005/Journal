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
import { SpeedInsights } from '@vercel/speed-insights/react'
import WrappedPopup from './components/WrappedPopup'
import Parametres from './components/Parametres'

export default function App() {
  const [ecran, setEcran] = useState('accueil')
  const [langue, setLangue] = useState(() => localStorage.getItem('langue') || 'fr')
  const [isAdmin, setIsAdmin] = useState(window.location.hash === '#admin')
  const [entrees, setEntrees] = useState([])
  const [chargement, setChargement] = useState(true)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')
  const [utilisateur, setUtilisateur] = useState(null)
  const [authChargement, setAuthChargement] = useState(true)
  const [wrappedData, setWrappedData] = useState(null)
  const [wrappedPeriode, setWrappedPeriode] = useState('')
  const [wrappedVisible, setWrappedVisible] = useState(false)

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

  useEffect(() => {
    if (!utilisateur || entrees.length === 0) return

    const verifierWrapped = async () => {
      const maintenant = new Date()
      const jourSemaine = maintenant.getDay() // 0 = dimanche
      const jourMois = maintenant.getDate()
      const dernierJourMois = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0).getDate()

      const estDimanche = jourSemaine === 0
      const estFinDeMois = jourMois === dernierJourMois

      if (!estDimanche && !estFinDeMois) return

      const periode = estFinDeMois ? 'mois' : 'semaine'
      const cleCache = `wrapped_${utilisateur.uid}_${maintenant.getFullYear()}_${maintenant.getMonth()}_${periode}`

      // Vérifier si déjà affiché aujourd'hui
      const dejaVu = localStorage.getItem(cleCache)
      if (dejaVu) return

      // Filtrer les entrées de la période
      const debut = new Date()
      if (periode === 'semaine') {
        debut.setDate(debut.getDate() - 7)
      } else {
        debut.setDate(1)
      }

      const entreesperiode = entrees.filter(e => new Date(e.id) >= debut)
      if (entreesperiode.length < 3) return

      try {
        const res = await fetch('/api/wrapped', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entrees: entreesperiode, periode, langue })
        })
        const data = await res.json()
        setWrappedData(data)
        setWrappedPeriode(periode)
        setWrappedVisible(true)
        localStorage.setItem(cleCache, 'true')
      } catch(e) {
        console.error('Erreur wrapped:', e)
      }
    }

    verifierWrapped()
  }, [utilisateur, entrees])

  const ouvrirWrapped = (data, periode) => {
    setWrappedData(data)
    setWrappedPeriode(periode)
    setWrappedVisible(true)
  }

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
        position: 'fixed', top: '12px', right: '12px', zIndex: 100
      }}>
        <button
          onClick={() => setEcran('parametres')}
          style={{
            width: '36px', height: '36px', borderRadius: '50%',
            border: '2px solid var(--accent)',
            padding: 0, cursor: 'pointer', overflow: 'hidden',
            background: 'var(--bg-card)'
          }}
        >
          {utilisateur?.photoURL
            ? <img src={utilisateur.photoURL} width="36" height="36" style={{ display: 'block' }} />
            : <span style={{ fontSize: '16px' }}>👤</span>
          }
        </button>
      </div>

      <div className="contenu">
        {ecran === 'accueil' && (
          <Accueil
            entrees={entrees}
            langue={langue}
            theme={theme}
            setTheme={setTheme}
            setEcran={setEcran}
            onOuvrirWrapped={ouvrirWrapped}
          />
        )}
        {ecran === 'ecrire' && <Ecrire onSave={ajouterEntree} setEcran={setEcran} langue={langue} />}
        {ecran === 'entrees' && <Entrees entrees={entrees} onUpdate={mettreAJourEntree} onDelete={supprimerEntree} />}
        {ecran === 'parole' && <Parole langue={langue} isAdmin={isAdmin} />}
        {ecran === 'conseils' && <ConseilsIA entrees={entrees} langue={langue} utilisateur={utilisateur} />}
        {ecran === 'parametres' && (
          <Parametres
            langue={langue}
            changerLangue={changerLangue}
            theme={theme}
            setTheme={setTheme}
            utilisateur={utilisateur}
            seDeconnecter={seDeconnecter}
          />
        )}
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
      {wrappedVisible && wrappedData && (
        <WrappedPopup
          data={wrappedData}
          periode={wrappedPeriode}
          onClose={() => setWrappedVisible(false)}
        />
      )}
    </div>
  )
}