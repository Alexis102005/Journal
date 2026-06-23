import { useState, useEffect, useRef } from 'react'
import { db } from '../firebase'
import { collection, getDocs, addDoc, query, orderBy, limit, doc, setDoc, getDoc } from 'firebase/firestore'
import { traductions } from '../i18n'

export default function ConseilsIA({ entrees, langue, utilisateur, contexteIA, setContexteIA, messagesChat, setMessagesChat }) {
  const [input, setInput] = useState('')
  const [chargement, setChargement] = useState(false)
  const [lectures, setLectures] = useState([])
  const [memoire, setMemoire] = useState([])
  const [conversationId, setConversationId] = useState(null)
  const [typeConversation, setTypeConversation] = useState('general')
  const bottomRef = useRef(null)
  const t = traductions[langue] || traductions.fr

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
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!utilisateur) return
    const init = async () => {
      const newConvId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const typeConv = contexteIA?.type === 'planning' ? 'planning' : 'general'
      await setDoc(doc(db, 'users', utilisateur.uid, 'conversations', newConvId), {
        type: typeConv,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      setConversationId(newConvId)
      setTypeConversation(typeConv)
    }
    init()
  }, [utilisateur])

  useEffect(() => {
    if (!utilisateur) return
    const chargerMemoire = async () => {
      try {
        const q = query(collection(db, 'memoire', utilisateur.uid, 'faits'), orderBy('date', 'desc'), limit(20))
        const snapshot = await getDocs(q)
        setMemoire(snapshot.docs.map(d => d.data()))
      } catch(e) { console.error(e) }
    }
    chargerMemoire()
  }, [utilisateur])

  useEffect(() => {
    if (!utilisateur || messagesChat.length > 0) return
    const charger = async () => {
      try {
        const snap = await getDoc(doc(db, 'conversations', utilisateur.uid))
        if (snap.exists() && snap.data().messages?.length > 0) {
          setMessagesChat(snap.data().messages)
        } else {
          const heure = new Date().getHours()
          const salutation = heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir'
          setMessagesChat([{ role: 'assistant', content: `${salutation} 🙏 Je suis là pour t'accompagner. Tu peux me parler de ce que tu vis, de tes questions, de tes luttes — je suis là.` }])
        }
      } catch(e) {
        const heure = new Date().getHours()
        const salutation = heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir'
        setMessagesChat([{ role: 'assistant', content: `${salutation} 🙏 Je suis là pour t'accompagner.` }])
      }
    }
    charger()
  }, [utilisateur])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagesChat, chargement])

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
    return '\n\nCe que tu sais déjà sur cette personne :\n' +
      memoire.map(f => `- [${f.type}] ${f.contenu}`).join('\n')
  }

  const sauvegarderConversation = async (messages) => {
    if (!utilisateur) return
    try {
      await setDoc(doc(db, 'conversations', utilisateur.uid), {
        messages: messages.slice(-50),
        updatedAt: new Date().toISOString()
      })
    } catch(e) { console.error(e) }
  }

  const sauvegarderMessage = async (message) => {
    if (!utilisateur || !conversationId) return
    try {
      await addDoc(collection(db, 'users', utilisateur.uid, 'conversations', conversationId, 'messages'), {
        role: message.role,
        content: message.content,
        timestamp: new Date().toISOString()
      })
      await setDoc(doc(db, 'users', utilisateur.uid, 'conversations', conversationId), { updatedAt: new Date().toISOString() }, { merge: true })
    } catch(e) { console.error(e) }
  }

  const extraireMemoire = async (historique) => {
    if (historique.filter(m => m.role === 'user').length < 2) return
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'extraire_memoire', historique })
      })
      const data = await res.json()
      if (!data.faits?.length) return
      const ref = collection(db, 'memoire', utilisateur.uid, 'faits')
      for (const fait of data.faits) {
        await addDoc(ref, { ...fait, date: new Date().toISOString() })
      }
      setMemoire(prev => [...data.faits.map(f => ({ ...f, date: new Date().toISOString() })), ...prev])
    } catch(e) { console.error(e) }
  }

  const envoyerMessage = async () => {
    if (!input.trim() || chargement) return

    const nouveauMessage = { role: 'user', content: input.trim() }
    const nouvelHistorique = [...messagesChat, nouveauMessage]
    setMessagesChat(nouvelHistorique)
    setInput('')
    setChargement(true)
    await sauvegarderMessage(nouveauMessage)

    try {
      const contexteSupplementaire = typeConversation === 'planning'
        ? `\n\nCONTEXTE PLANNING : ${contexteIA?.message || 'Planifier pour demain'}`
        : ''

      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'chat',
          messages: nouvelHistorique,
          lectures,
          entreeSemaine: getEntreesRecentes() + getMemoireFormatee() + contexteSupplementaire,
          langue
        })
      })

      const data = await res.json()
      let texteVisible = data.texte || ''
      let tacheDetectee = null

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
      sauvegarderConversation(nouvelHistoriqueComplet)
      await sauvegarderMessage(msgAssistant)

      if (tacheDetectee && utilisateur) {
        try {
          const { ajouterTache } = await import('../services/objectifs')
          await ajouterTache(utilisateur.uid, tacheDetectee)
          const notifMsg = { role: 'assistant', content: `✅ J'ai ajouté "${tacheDetectee.texte}" à tes objectifs.` }
          setMessagesChat(prev => [...prev, notifMsg])
          sauvegarderConversation([...nouvelHistoriqueComplet, notifMsg])
        } catch(e) { console.error('Erreur ajout tâche:', e) }
      }

      const nbUser = nouvelHistoriqueComplet.filter(m => m.role === 'user').length
      if (nbUser > 0 && nbUser % 3 === 0) extraireMemoire(nouvelHistoriqueComplet)

    } catch(e) {
      const msgErreur = { role: 'assistant', content: 'Une erreur est survenue, réessaie.' }
      const historiqueErreur = [...messagesChat, msgErreur]
      setMessagesChat(historiqueErreur)
      sauvegarderConversation(historiqueErreur)
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
      <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
        <h2 style={{ fontSize: '18px', margin: 0 }}>✨ Accompagnement spirituel</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
          {memoire.length > 0 ? `${memoire.length} souvenir${memoire.length > 1 ? 's' : ''} · Parle librement` : 'Parle librement — je suis là'}
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messagesChat.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
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
            <div style={{ padding: '12px 16px', borderRadius: '18px 18px 18px 4px', background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '20px', letterSpacing: '4px' }}>✦</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
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
            width: '44px', height: '44px', borderRadius: '50%', border: 'none',
            background: input.trim() && !chargement ? 'var(--accent)' : 'var(--border)',
            color: 'white', fontSize: '18px',
            cursor: input.trim() && !chargement ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'background 0.2s'
          }}
        >↑</button>
      </div>
    </div>
  )
}