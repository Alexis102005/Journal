import { useState, useEffect, useRef } from 'react'
import { traductions } from '../i18n'

export default function ConseilsIA({ entrees, langue }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [chargement, setChargement] = useState(false)
  const [lectures, setLectures] = useState([])
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

  // Scroll automatique vers le bas
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chargement])

  // Message d'accueil au premier chargement
  useEffect(() => {
    if (!initialise) {
      const heure = new Date().getHours()
      let salutation = 'Bonsoir'
      if (heure < 12) salutation = 'Bonjour'
      else if (heure < 18) salutation = 'Bon après-midi'

      const msgAccueil = entrees.length > 0
        ? `${salutation} 🙏 Je suis là pour t'accompagner. Tu peux me parler de ce que tu vis, de tes questions, de tes luttes — je suis là.`
        : `${salutation} 🙏 Je suis là pour t'accompagner spirituellement. De quoi veux-tu parler aujourd'hui ?`

      setMessages([{ role: 'assistant', content: msgAccueil }])
      setInitialise(true)
    }
  }, [initialise, entrees])

  const getEntreesRecentes = () => {
    const il7jours = new Date()
    il7jours.setDate(il7jours.getDate() - 7)
    return entrees
      .filter(e => new Date(e.id) >= il7jours)
      .map(e => `[${new Date(e.id).toLocaleDateString('fr-FR')}]\n${e.contenu}`)
      .join('\n\n---\n\n')
  }

  const envoyerMessage = async () => {
    if (!input.trim() || chargement) return

    const nouveauMessage = { role: 'user', content: input.trim() }
    const nouvelHistorique = [...messages, nouveauMessage]
    setMessages(nouvelHistorique)
    setInput('')
    setChargement(true)

    try {
      // On envoie uniquement les messages user/assistant, pas le message d'accueil statique
      const messagesAAEnvoyer = nouvelHistorique.filter(m =>
        !(m.role === 'assistant' && m === messages[0])
      )

      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'chat',
          messages: messagesAAEnvoyer,
          lectures,
          entreeSemaine: getEntreesRecentes(),
          langue
        })
      })

      const data = await res.json()
      setMessages([...nouvelHistorique, { role: 'assistant', content: data.texte }])
    } catch (e) {
      setMessages([...nouvelHistorique, { role: 'assistant', content: 'Une erreur est survenue, réessaie.' }])
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
          Parle librement — je suis là
        </p>
      </div>

      {/* Zone messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
          }}>
            <div style={{
              maxWidth: '80%',
              padding: '12px 16px',
              borderRadius: msg.role === 'user'
                ? '18px 18px 4px 18px'
                : '18px 18px 18px 4px',
              background: msg.role === 'user'
                ? 'var(--accent)'
                : 'var(--bg-card)',
              color: msg.role === 'user'
                ? 'white'
                : 'var(--text-primary)',
              fontSize: '14px',
              lineHeight: '1.7',
              boxShadow: 'var(--shadow-card)',
              border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none'
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* Indicateur de chargement */}
        {chargement && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '12px 16px',
              borderRadius: '18px 18px 18px 4px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              fontSize: '20px',
              letterSpacing: '4px'
            }}>
              <span style={{ animation: 'pulse 1s infinite' }}>✦</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Zone input */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg)',
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-end'
      }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écris ce que tu ressens..."
          rows={1}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '20px',
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            fontSize: '14px',
            resize: 'none',
            outline: 'none',
            lineHeight: '1.5',
            fontFamily: 'inherit'
          }}
        />
        <button
          onClick={envoyerMessage}
          disabled={!input.trim() || chargement}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: 'none',
            background: input.trim() && !chargement ? 'var(--accent)' : 'var(--border)',
            color: 'white',
            fontSize: '18px',
            cursor: input.trim() && !chargement ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.2s'
          }}
        >
          ↑
        </button>
      </div>

    </div>
  )
}