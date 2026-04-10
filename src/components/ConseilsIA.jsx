import { useState, useEffect } from 'react'
import { traductions } from '../i18n'

const conseilsData = {
  resume: [
    { icon: '💡', titre: 'Relire lentement', tag: 'LECTURE', texte: 'Relis le texte du jour une seconde fois, en t\'arrêtant sur les mots qui te touchent. Laisse-les résonner en toi avant de passer à la suite.' },
    { icon: '❤️', titre: 'Un mot, une prière', tag: 'MÉDITATION', texte: 'Choisis un seul mot qui résume ce que tu as retenu de la Parole aujourd\'hui. Fais-en le fil conducteur de ta journée.' },
    { icon: '⭐', titre: 'Partager la Bonne Nouvelle', tag: 'ACTION', texte: 'Pense à une personne à qui tu pourrais partager ce que tu as lu aujourd\'hui. Un message, un appel, un sourire.' },
  ],
  priere: [
    { icon: '💡', titre: 'La posture du cœur', tag: 'PRÉPARATION', texte: 'Avant de prier, prends 3 respirations profondes. Laisse partir les tensions du corps pour entrer dans une présence plus profonde à Dieu.' },
    { icon: '❤️', titre: 'Prier avec les psaumes', tag: 'PRIÈRE', texte: 'Utilise les paroles du psaume du jour comme prière personnelle. Remplace "il" par "toi" pour personnaliser ta relation avec le Seigneur.' },
    { icon: '⭐', titre: 'L\'intercession', tag: 'ACTION', texte: 'Nomme 3 personnes pour qui tu veux prier aujourd\'hui. Présente-les à Dieu avec leurs joies et leurs peines.' },
  ],
  guidance: [
    { icon: '💡', titre: 'Une action concrète', tag: 'ACTION', texte: 'La Parole de Dieu appelle à l\'action. Identifie une chose concrète et simple que tu peux faire aujourd\'hui pour vivre ce que tu as lu.' },
    { icon: '❤️', titre: 'Examen de conscience', tag: 'SOIR', texte: 'Ce soir, reviens sur ta journée : où as-tu ressenti la présence de Dieu ? Dans quelle situation as-tu pu témoigner de sa bonté ?' },
    { icon: '⭐', titre: 'La lectio divina', tag: 'APPROFONDISSEMENT', texte: 'Lis le texte du jour 4 fois : pour comprendre, pour méditer, pour prier, pour contempler. Laisse chaque lecture te toucher différemment.' },
  ]
}

export default function ConseilsIA({ entrees, langue }) {
  const [onglet, setOnglet] = useState('resume')
  const [assistantResultat, setAssistantResultat] = useState('')
  const [assistantChargement, setAssistantChargement] = useState(false)
  const [mood, setMood] = useState('')
  const [versetDuJour, setVersetDuJour] = useState(null)

  const t = traductions[langue] || traductions.fr

  useEffect(() => {
    fetch('/api/liturgie')
      .then(res => res.json())
      .then(data => {
        const lectures = data.messes?.[0]?.lectures
        if (lectures && lectures.length > 0) {
          const evangile = lectures.find(l => l.type?.toLowerCase().includes('evangile')) || lectures[0]
          const texte = evangile.contenu?.replace(/<[^>]*>/g, '') || ''
          setVersetDuJour({
            texte: texte.slice(0, 120) + '...',
            ref: evangile.ref || evangile.titre
          })
        }
      })
      .catch(() => {})
  }, [])

  const appellerAssistant = async (type) => {
    setOnglet(type)
    setAssistantChargement(true)
    setAssistantResultat('')
    try {
      const res = await fetch('/api/liturgie')
      const data = await res.json()
      const lecturesBrutes = data.messes?.[0]?.lectures || []
      const lectures = lecturesBrutes.map(l => ({
        ref: l.ref || l.titre || '',
        type: l.type || l.titre || '',
        texte: l.contenu?.replace(/<[^>]*>/g, '') || ''
      })).filter(l => l.texte.length > 0)

      const il7jours = new Date()
      il7jours.setDate(il7jours.getDate() - 7)
      const entreeSemaine = entrees
        .filter(e => new Date(e.id) >= il7jours)
        .map(e => `[${new Date(e.id).toLocaleDateString('fr-FR')}]\n${e.contenu}`)
        .join('\n\n---\n\n')

      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          lectures,
          mood,
          entreeSemaine,
          langue,
          ...(type === 'resume' && { mood: entreeSemaine || 'Aucune entrée cette semaine.' })
        })
      })
      const result = await response.json()
      setAssistantResultat(result.texte)
    } catch(e) {
      setAssistantResultat('Erreur, réessaie.')
    }
    setAssistantChargement(false)
  }

  const ongletConfig = {
    resume: { label: t.resume, icon: '📋', color: '#60a5fa', bg: '#1e3a5f' },
    priere: { label: t.priere, icon: '🙏', color: '#a78bfa', bg: '#2d1b69' },
    guidance: { label: t.guidance, icon: '🧭', color: '#f87171', bg: '#7f1d1d' },
  }

  return (
    <div className="ecran">
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px' }}>Conseils IA</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Guidance spirituelle personnalisée</p>
      </div>

      {/* Verset du jour */}
      {versetDuJour && (
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
          borderRadius: '18px',
          padding: '18px',
          marginBottom: '16px',
          color: 'white'
        }}>
          <p style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.1em', color: '#a5b4fc', marginBottom: '8px' }}>
            ✨ PAROLE DU JOUR
          </p>
          <p style={{ fontSize: '14px', fontStyle: 'italic', lineHeight: '1.7', marginBottom: '8px' }}>
            « {versetDuJour.texte} »
          </p>
          <p style={{ fontSize: '11px', color: '#a5b4fc' }}>— {versetDuJour.ref}</p>
        </div>
      )}

      {/* Onglets */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {Object.entries(ongletConfig).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => appellerAssistant(key)}
            disabled={assistantChargement}
            style={{
              flex: 1, padding: '12px 6px', borderRadius: '16px',
              border: 'none',
              background: onglet === key
                ? `linear-gradient(135deg, ${cfg.bg}, ${cfg.bg}dd)`
                : 'var(--bg-card)',
              color: onglet === key ? cfg.color : 'var(--text-muted)',
              cursor: 'pointer', fontWeight: '600', fontSize: '12px',
              boxShadow: onglet === key ? `0 4px 14px ${cfg.color}40` : 'var(--shadow-card)',
              transition: 'all 0.2s',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
            }}
          >
            <span style={{ fontSize: '20px' }}>{cfg.icon}</span>
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Résultat IA ou conseils statiques */}
      {assistantChargement && (
        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '24px', marginBottom: '8px' }}>✨</p>
          <p style={{ fontSize: '13px', fontStyle: 'italic' }}>Génération en cours...</p>
        </div>
      )}

      {assistantResultat && !assistantChargement && (
        <div style={{
          background: `linear-gradient(135deg, ${ongletConfig[onglet].bg}33, ${ongletConfig[onglet].bg}11)`,
          border: `1px solid ${ongletConfig[onglet].color}30`,
          borderRadius: '18px', padding: '18px', marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={{ fontSize: '11px', fontWeight: '700', color: ongletConfig[onglet].color, letterSpacing: '0.1em' }}>
              {ongletConfig[onglet].icon} {ongletConfig[onglet].label.toUpperCase()}
            </p>
            <button
              onClick={() => setAssistantResultat('')}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}
            >✕</button>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.8', fontStyle: 'italic' }}>
            {assistantResultat}
          </p>
        </div>
      )}

      {/* Conseils statiques */}
      {!assistantChargement && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={{ fontSize: '11px', fontWeight: '700', color: ongletConfig[onglet].color, letterSpacing: '0.1em' }}>
              📋 CONSEILS {ongletConfig[onglet].label.toUpperCase()}
            </p>
            <button
              onClick={() => appellerAssistant(onglet)}
              style={{
                background: 'none', border: `1px solid ${ongletConfig[onglet].color}50`,
                color: ongletConfig[onglet].color, borderRadius: '20px',
                padding: '4px 12px', fontSize: '11px', cursor: 'pointer', fontWeight: '500'
              }}
            >
              🔄 Actualiser
            </button>
          </div>
          {conseilsData[onglet].map((conseil, i) => (
            <div key={i} style={{
              background: 'var(--bg-card)', borderRadius: '16px', padding: '16px',
              marginBottom: '10px', boxShadow: 'var(--shadow-card)',
              border: '0.5px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: `${ongletConfig[onglet].color}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px', flexShrink: 0
                }}>
                  {conseil.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <p style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>
                      {conseil.titre}
                    </p>
                    <span style={{
                      fontSize: '9px', fontWeight: '700', padding: '2px 8px',
                      borderRadius: '20px', background: `${ongletConfig[onglet].color}20`,
                      color: ongletConfig[onglet].color, letterSpacing: '0.05em'
                    }}>
                      {conseil.tag}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    {conseil.texte}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}