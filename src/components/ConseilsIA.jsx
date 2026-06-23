import { useState, useEffect, useRef } from 'react'
import { db } from '../firebase'
import { collection, getDocs, addDoc, query, orderBy, limit, doc, setDoc, getDoc } from 'firebase/firestore'
import { traductions } from '../i18n'

export default function ConseilsIA({ entrees, langue, utilisateur, contexteIA, setContexteIA, messagesChat, setMessagesChat }) {
  const [input, setInput] = useState('')
  const [chargement, setChargement] = useState(false)
  const [lectures, setLectures] = useState([])
  const [memoire, setMemoire] = useState([])
  const [initialise, setInitialise] = useState(false)
  const [conversationId, setConversationId] = useState(null)
  const [typeConversation, setTypeConversation] = useState('general')
  const [historiqueCharge, setHistoriqueCharge] = useState(false)
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

  // Créer une nouvelle conversation au démarrage
  useEffect(() => {
    if (!utilisateur) return

    const creerConversation = async () => {
      const newConvId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const typeConv = contexteIA?.type === 'planning' ? 'planning' : 'general'

      // Créer le document conversation
      await setDoc(doc(db, 'users', utilisateur.uid, 'conversations', newConvId), {
        type: typeConv,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      setConversationId(newConvId)
      setTypeConversation(typeConv)
      setHistoriqueCharge(true)
    }

    creerConversation()
  }, [utilisateur])

  // Charger l'historique des conversations précédentes
  useEffect(() => {
    if (!utilisateur || historiqueCharge) return

    const chargerHistorique = async () => {
      try {
        const q = query(
          collection(db, 'users', utilisateur.uid, 'conversations'),
          orderBy('createdAt', 'desc'),
          limit(50)
        )
        const snapshot = await getDocs(q)
        // Chargé mais non affiché - disponible pour référence/contexte futur
        console.log(`${snapshot.docs.length} conversations chargées depuis Firebase`)
      } catch (e) {
        console.error('Erreur chargement historique:', e)
      }
    }

    chargerHistorique()
  }, [utilisateur, historiqueCharge])

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
  }, [messagesChat, chargement])

  // Message d'accueil
  useEffect(() => {
    if (!initialise && conversationId) {
      let msgAccueil

      if (typeConversation === 'planning') {
        msgAccueil = '💬 Parlons de ton planning. Comment tu veux t\'organiser ?'
      } else {
        const heure = new Date().getHours()
        let salutation = heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir'
        msgAccueil = entrees.length > 0
          ? `${salutation} 🙏 Je suis là pour t'accompagner. Tu peux me parler de ce que tu vis, de tes questions, de tes luttes — je suis là.`
          : `${salutation} 🙏 Je suis là pour t'accompagner spirituellement. De quoi veux-tu parler aujourd'hui ?`
      }

      const nouveauMsg = { role: 'assistant', content: msgAccueil }
      setMessagesChat([nouveauMsg])
      
      // Sauvegarder le message d'accueil dans Firebase
      sauvegarderMessage(nouveauMsg)
      
      setInitialise(true)

      // Nettoyer le contexte après utilisation
      if (contexteIA) setContexteIA(null)
    }
  }, [initialise, conversationId, typeConversation, entrees, contexteIA])

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

  // Sauvegarder un message dans Firebase
  const sauvegarderMessage = async (message) => {
    if (!utilisateur || !conversationId) return

    try {
      const messagesRef = collection(
        db,
        'users',
        utilisateur.uid,
        'conversations',
        conversationId,
        'messages'
      )
      await addDoc(messagesRef, {
        role: message.role,
        content: message.content,
        timestamp: new Date().toISOString()
      })

      // Mettre à jour le timestamp de la conversation
      await setDoc(
        doc(db, 'users', utilisateur.uid, 'conversations', conversationId),
        { updatedAt: new Date().toISOString() },
        { merge: true }
      )
    } catch (e) {
      console.error('Erreur sauvegarde message:', e)
    }
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
    const nouvelHistorique = [...messagesChat, nouveauMessage]
    setMessagesChat(nouvelHistorique)
    setInput('')
    setChargement(true)

    // Sauvegarder le message utilisateur
    await sauvegarderMessage(nouveauMessage)

    try {
      const messagesAAEnvoyer = nouvelHistorique

      const contexteSupplementaire = typeConversation === 'planning'
        ? `\n\nCONTEXTE PLANNING : ${contexteIA?.message || 'Planifier pour demain'}`
        : ''

      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'chat',
          messages: messagesAAEnvoyer,
          lectures,
          entreeSemaine: getEntreesRecentes() + getMemoireFormatee() + contexteSupplementaire,
          langue
        })
      })

      const data = await res.json()
      let texteVisible = data.texte || ''
      let tacheDetectee = null

      // Extraire la tâche cachée si présente
      const regexTache = /%%TACHE%%(.+?)%%FIN%%/s
      const match = texteVisible.match(regexTache)
      if (match) {
        try {
          tacheDetectee = JSON.parse(match[1])
          texteVisible = texteVisible.replace(regexTache, '').trim()
        } catch(e) {
          console.error('Erreur parsing tâche:', e)
        }
      }

      const msgAssistant = { role: 'assistant', content: texteVisible }
      const nouvelHistoriqueComplet = [...nouvelHistorique, msgAssistant]
      setMessagesChat(nouvelHistoriqueComplet)

      // Sauvegarder le message assistant
      await sauvegarderMessage(msgAssistant)

      // Sauvegarder la tâche dans Firestore si détectée
      if (tacheDetectee && utilisateur) {
        try {
          const { ajouterTache } = await import('../services/objectifs')
          await ajouterTache(utilisateur.uid, tacheDetectee)
          // Notifier l'utilisateur
          setMessagesChat(prev => [...prev, {
            role: 'assistant',
            content: `✅ J'ai ajouté "${tacheDetectee.texte}" à tes objectifs.`
          }])
        } catch(e) {
          console.error('Erreur ajout tâche:', e)
        }
      }

      // Extraire la mémoire tous les 3 messages utilisateur
      const nbMessagesUser = nouvelHistoriqueComplet.filter(m => m.role === 'user').length
      if (nbMessagesUser > 0 && nbMessagesUser % 3 === 0) {
        extraireMemoire(nouvelHistoriqueComplet)
      }

    } catch (e) {
      const msgErreur = { role: 'assistant', content: 'Une erreur est survenue, réessaie.' }
      setMessagesChat(prev => [...prev, msgErreur])
      await sauvegarderMessage(msgErreur)
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
        {messagesChat.map((msg, i) => (
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