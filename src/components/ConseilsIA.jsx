import { useState, useEffect, useRef } from 'react'
import { db } from '../firebase'
import { collection, getDocs, addDoc, query, orderBy, limit } from 'firebase/firestore'
import { traductions } from '../i18n'

export default function ConseilsIA({ entrees, langue, utilisateur }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [chargement, setChargement] = useState(false)
  const [lectures, setLectures] = useState([])
  const [memoire, setMemoire] = useState([])
  const [initialise, setInitialise] = useState(false)
  const bottomRef = useRef(null)
  const t = traductions[langue] || traductions.fr

  // Charger les lectures du jour
  useEffect(() => {
    fetch('/api/liturgie')
      .then(res => res.json())
      .then(data => {
        const lecturesBrutes = data.messes?.[0]?.lectures || []
        const lecturesFormatees = lecturesBrutes.map(l => ({
          ref: l.ref || l.titre || '',
          type: l.type || l.titre || '',
          texte: l.contenu?.replace(/<[^>]*>/g, '') || ''
        })).filter(l => l.texte.length > 0)
        setLectures(lecturesFormatees)
      })
      .catch(() => { })
  }, [])

  // Charger la mémoire depuis Firestore
  useEffect(() => {
    if (!utilisateur) return
    const chargerMemoire = async () => {
      try {
        const q = query(
          collection(db, 'memoire', utilisateur.uid, 'faits'),
          orderBy('date', 'desc'),
          limit(20)
        )
        const snapshot = await getDocs(q)
        const faits = snapshot.docs.map(d => d.data())
        setMemoire(faits)
      } catch (e) {
        console.error('Erreur chargement mémoire:', e)
      }
    }
    chargerMemoire()
  }, [utilisateur])

  // Scroll automatique
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chargement])

  // Message d'accueil
  useEffect(() => {
    if (!initialise) {
      const initChat = async () => {
        const aujourdhui = new Date().toDateString()
        const entreesDuJour = entrees.filter(e => new Date(e.id).toDateString() === aujourdhui)
        const derniereEntree = entreesDuJour.length > 0 ? entreesDuJour[0] : null

        if (derniereEntree && derniereEntree.contenu) {
          setChargement(true)
          try {
            const res = await fetch('/api/assistant', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'intro_jour',
                entreeDuJour: derniereEntree.contenu,
                langue
              })
            })
            const data = await res.json()
            if (data.texte) {
              setMessages([{ role: 'assistant', content: data.texte }])
            } else {
              throw new Error('Pas de texte')
            }
          } catch (e) {
            console.error('Erreur intro IA:', e)
            // fallback
            const heure = new Date().getHours()
            let salutation = 'Bonsoir'
            if (heure < 12) salutation = 'Bonjour'
            else if (heure < 18) salutation = 'Bon après-midi'
            setMessages([{ role: 'assistant', content: `${salutation} 🙏 Je suis là pour t'accompagner. Tu peux me parler de ce que tu vis, de tes questions, de tes luttes — je suis là.` }])
          }
          setChargement(false)
        } else {
          const heure = new Date().getHours()
          let salutation = 'Bonsoir'
          if (heure < 12) salutation = 'Bonjour'
          else if (heure < 18) salutation = 'Bon après-midi'

          const msgAccueil = entrees.length > 0
            ? `${salutation} 🙏 Je suis là pour t'accompagner. Tu peux me parler de ce que tu vis, de tes questions, de tes luttes — je suis là.`
            : `${salutation} 🙏 Je suis là pour t'accompagner spirituellement. De quoi veux-tu parler aujourd'hui ?`

          setMessages([{ role: 'assistant', content: msgAccueil }])
        }
        setInitialise(true)
      }

      initChat()
    }
  }, [initialise, entrees, langue])

  const getEntreesRecentes = () => {
    const il7jours = new Date()
    il7jours.setDate(il7jours.getDate() - 7)
    return entrees
      .filter(e => new Date(e.id) >= il7jours)
      .map(e => `[${new Date(e.id).toLocaleDateString('fr-FR')}]\n${e.contenu}`)
      .join('\n\n---\n\n')
  }

  const getMemoireFormatee = () => {
    if (memoire.length === 0) return ''
    return '\n\nCe que tu sais déjà sur cette personne (mémoire des conversations passées) :\n' +
      memoire.map(f => `- [${f.type}] ${f.contenu}`).join('\n')
  }

  // Extraire et sauvegarder la mémoire après la conversation
  const extraireMemoire = async (historique) => {
    const messagesSignificatifs = historique.filter(m => m.role === 'user')
    if (messagesSignificatifs.length < 2) return // Pas assez de contenu

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'extraire_memoire',
          historique
        })
      })
      const data = await res.json()
      if (!data.faits || data.faits.length === 0) return

      // Sauvegarder chaque fait dans Firestore
      const ref = collection(db, 'memoire', utilisateur.uid, 'faits')
      for (const fait of data.faits) {
        await addDoc(ref, {
          ...fait,
          date: new Date().toISOString()
        })
      }

      // Mettre à jour la mémoire locale
      setMemoire(prev => [...data.faits.map(f => ({ ...f, date: new Date().toISOString() })), ...prev])
    } catch (e) {
      console.error('Erreur extraction mémoire:', e)
    }
  }

  const envoyerMessage = async () => {
    if (!input.trim() || chargement) return

    const nouveauMessage = { role: 'user', content: input.trim() }
    const nouvelHistorique = [...messages, nouveauMessage]
    setMessages(nouvelHistorique)
    setInput('')
    setChargement(true)

    try {
      const messagesAAEnvoyer = nouvelHistorique

      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'chat',
          messages: messagesAAEnvoyer,
          lectures,
          entreeSemaine: getEntreesRecentes() + getMemoireFormatee(),
          langue
        })
      })

      const data = await res.json()
      const nouvelHistoriqueComplet = [...nouvelHistorique, { role: 'assistant', content: data.texte }]
      setMessages(nouvelHistoriqueComplet)

      // Extraire la mémoire tous les 3 messages utilisateur
      const nbMessagesUser = nouvelHistoriqueComplet.filter(m => m.role === 'user').length
      if (nbMessagesUser > 0 && nbMessagesUser % 3 === 0) {
        extraireMemoire(nouvelHistoriqueComplet)
      }

    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Une erreur est survenue, réessaie.' }])
    }

    setChargement(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      envoyerMessage()
    }
  }

  return (
    <div className="ecran" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 0 }}>

      {/* Header */}
      <div style={{
        padding: '20px 20px 12px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)'
      }}>
        <h2 style={{ fontSize: '18px', margin: 0 }}>✨ Accompagnement spirituel</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
          {memoire.length > 0 ? `${memoire.length} souvenir${memoire.length > 1 ? 's' : ''} · Parle librement` : 'Parle librement — je suis là'}
        </p>
      </div>

      {/* Zone messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px 20px',
        display: 'flex', flexDirection: 'column', gap: '12px'
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
          }}>
            <div style={{
              maxWidth: '80%', padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-card)',
              color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
              fontSize: '14px', lineHeight: '1.7',
              boxShadow: 'var(--shadow-card)',
              border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none'
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {chargement && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '12px 16px', borderRadius: '18px 18px 18px 4px',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              fontSize: '20px', letterSpacing: '4px'
            }}>✦</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Zone input */}
      <div style={{
        padding: '12px 16px', borderTop: '1px solid var(--border)',
        background: 'var(--bg)', display: 'flex', gap: '10px', alignItems: 'flex-end'
      }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écris ce que tu ressens..."
          rows={1}
          style={{
            flex: 1, padding: '12px 16px', borderRadius: '20px',
            border: '1px solid var(--border)', background: 'var(--bg-card)',
            color: 'var(--text-primary)', fontSize: '14px',
            resize: 'none', outline: 'none', lineHeight: '1.5', fontFamily: 'inherit'
          }}
        />
        <button
          onClick={envoyerMessage}
          disabled={!input.trim() || chargement}
          style={{
            width: '44px', height: '44px', borderRadius: '50%',
            border: 'none',
            background: input.trim() && !chargement ? 'var(--accent)' : 'var(--border)',
            color: 'white', fontSize: '18px',
            cursor: input.trim() && !chargement ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'background 0.2s'
          }}
        >
          ↑
        </button>
      </div>
    </div>
  )
}