import { useState } from 'react'

export default function WrappedPopup({ data, periode, onClose }) {
  const [etape, setEtape] = useState(0)

  const etapes = [
    'intro',
    'stats',
    'humeurs',
    'mots',
    'themes',
    'insight',
    'priere',
    'verset'
  ]

  const etapeActuelle = etapes[etape]

  const suivant = () => {
    if (etape < etapes.length - 1) setEtape(etape + 1)
    else onClose()
  }

  const precedent = () => {
    if (etape > 0) setEtape(etape - 1)
  }

  const titreperiode = periode === 'semaine' ? 'Ta semaine' : 'Ton mois'

  const gradients = [
    'linear-gradient(135deg, #1e1b4b, #312e81)',
    'linear-gradient(135deg, #0f172a, #1e3a5f)',
    'linear-gradient(135deg, #1a1a2e, #16213e)',
    'linear-gradient(135deg, #0d1117, #1e3a5f)',
    'linear-gradient(135deg, #1e1b4b, #4a1942)',
    'linear-gradient(135deg, #0f2027, #203a43)',
    'linear-gradient(135deg, #1a1a2e, #2d1b69)',
    'linear-gradient(135deg, #0d1117, #1e1b4b)',
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        width: '100%', maxWidth: '380px',
        background: gradients[etape],
        borderRadius: '28px', overflow: 'hidden',
        minHeight: '520px', display: 'flex', flexDirection: 'column',
        position: 'relative',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)'
      }}>

        {/* Barre de progression */}
        <div style={{ display: 'flex', gap: '4px', padding: '16px 16px 0' }}>
          {etapes.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: '3px', borderRadius: '2px',
              background: i <= etape ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)',
              transition: 'background 0.3s'
            }} />
          ))}
        </div>

        {/* Bouton fermer */}
        <button onClick={onClose} style={{
          position: 'absolute', top: '16px', right: '16px',
          background: 'rgba(255,255,255,0.15)', border: 'none',
          borderRadius: '50%', width: '32px', height: '32px',
          color: 'white', cursor: 'pointer', fontSize: '16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>✕</button>

        {/* Contenu */}
        <div style={{
          flex: 1, padding: '32px 28px',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center'
        }}>

          {/* INTRO */}
          {etapeActuelle === 'intro' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '24px' }}>✨</div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.15em', marginBottom: '12px', textTransform: 'uppercase' }}>
                {titreperiode} EN REVUE
              </p>
              <h2 style={{ fontSize: '32px', fontWeight: '800', color: 'white', marginBottom: '16px', lineHeight: '1.2' }}>
                {titreperiode} spirituelle
              </h2>
              <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
                {data.stats.nbEntrees} entrée{data.stats.nbEntrees > 1 ? 's' : ''} · {data.stats.streak} jour{data.stats.streak > 1 ? 's' : ''} de suite
              </p>
            </div>
          )}

          {/* STATS */}
          {etapeActuelle === 'stats' && (
            <div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.15em', marginBottom: '24px' }}>
                📊 EN CHIFFRES
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {[
                  { label: 'Entrées écrites', value: data.stats.nbEntrees, icon: '📝' },
                  { label: 'Jours consécutifs', value: data.stats.streak, icon: '🔥' },
                  { label: 'Heure moyenne', value: data.stats.heureMoyenne, icon: '⏰' },
                ].map(item => (
                  <div key={item.label} style={{
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '16px', padding: '16px 20px',
                    display: 'flex', alignItems: 'center', gap: '16px'
                  }}>
                    <span style={{ fontSize: '28px' }}>{item.icon}</span>
                    <div>
                      <p style={{ fontSize: '28px', fontWeight: '800', color: 'white', margin: 0 }}>{item.value}</p>
                      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>{item.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HUMEURS */}
          {etapeActuelle === 'humeurs' && (
            <div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.15em', marginBottom: '24px' }}>
                💫 TES JOURNÉES
              </p>
              {data.stats.meilleurJour ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: 'rgba(134,239,172,0.2)', borderRadius: '16px', padding: '20px' }}>
                    <p style={{ fontSize: '12px', color: 'rgba(134,239,172,0.9)', marginBottom: '8px', fontWeight: '700' }}>✨ MEILLEUR JOUR</p>
                    <p style={{ fontSize: '18px', color: 'white', fontWeight: '700' }}>{data.stats.meilleurJour}</p>
                  </div>
                  <div style={{ background: 'rgba(248,113,113,0.2)', borderRadius: '16px', padding: '20px' }}>
                    <p style={{ fontSize: '12px', color: 'rgba(248,113,113,0.9)', marginBottom: '8px', fontWeight: '700' }}>💙 JOUR DIFFICILE</p>
                    <p style={{ fontSize: '18px', color: 'white', fontWeight: '700' }}>{data.stats.jourDifficile}</p>
                  </div>
                </div>
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', lineHeight: '1.6' }}>
                  Pas assez de données d'humeur cette période. Pense à noter comment tu te sens quand tu écris !
                </p>
              )}
            </div>
          )}

          {/* MOTS CLÉS */}
          {etapeActuelle === 'mots' && (
            <div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.15em', marginBottom: '16px' }}>
                💬 TES MOTS
              </p>
              {data.motDeLaSemaine && (
                <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Mot de la {periode}</p>
                  <p style={{ fontSize: '48px', fontWeight: '900', color: 'white', letterSpacing: '-0.02em' }}>
                    {data.motDeLaSemaine}
                  </p>
                </div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {data.motsCles.slice(1).map((mot, i) => (
                  <span key={i} style={{
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: '20px', padding: '8px 16px',
                    color: 'white', fontSize: `${16 - i}px`, fontWeight: '600'
                  }}>
                    {mot}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* THÈMES */}
          {etapeActuelle === 'themes' && (
            <div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.15em', marginBottom: '24px' }}>
                🌿 THÈMES SPIRITUELS
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data.themes?.map((theme, i) => (
                  <div key={i} style={{
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '14px', padding: '16px 20px',
                    display: 'flex', alignItems: 'center', gap: '12px'
                  }}>
                    <span style={{ fontSize: '20px' }}>
                      {i === 0 ? '✦' : i === 1 ? '✧' : '·'}
                    </span>
                    <p style={{ color: 'white', fontSize: '16px', fontWeight: '600', margin: 0 }}>{theme}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* INSIGHT */}
          {etapeActuelle === 'insight' && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.15em', marginBottom: '32px' }}>
                💡 L'ESSENTIEL
              </p>
              <p style={{
                fontSize: '24px', fontWeight: '700', color: 'white',
                lineHeight: '1.5', fontStyle: 'italic'
              }}>
                "{data.insight}"
              </p>
            </div>
          )}

          {/* PRIÈRE */}
          {etapeActuelle === 'priere' && (
            <div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.15em', marginBottom: '24px' }}>
                🙏 PRIÈRE DE LA {periode.toUpperCase()}
              </p>
              <p style={{
                fontSize: '15px', color: 'rgba(255,255,255,0.9)',
                lineHeight: '2', fontStyle: 'italic',
                fontFamily: 'Georgia, serif'
              }}>
                {data.priere}
              </p>
            </div>
          )}

          {/* VERSET */}
          {etapeActuelle === 'verset' && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.15em', marginBottom: '32px' }}>
                📖 VERSET DE LA {periode.toUpperCase()}
              </p>
              <p style={{
                fontSize: '20px', color: 'white', lineHeight: '1.7',
                fontStyle: 'italic', fontFamily: 'Georgia, serif',
                marginBottom: '16px'
              }}>
                "{data.verset?.texte}"
              </p>
              <p style={{ fontSize: '13px', color: 'rgba(165,180,252,0.9)', fontWeight: '600' }}>
                — {data.verset?.ref}
              </p>
            </div>
          )}

        </div>

        {/* Navigation */}
        <div style={{
          padding: '16px 28px 28px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <button
            onClick={precedent}
            style={{
              background: 'rgba(255,255,255,0.1)', border: 'none',
              borderRadius: '20px', padding: '10px 20px',
              color: 'white', cursor: etape > 0 ? 'pointer' : 'not-allowed',
              opacity: etape > 0 ? 1 : 0.3, fontSize: '14px'
            }}
          >
            ←
          </button>

          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
            {etape + 1} / {etapes.length}
          </p>

          <button
            onClick={suivant}
            style={{
              background: 'white', border: 'none',
              borderRadius: '20px', padding: '10px 24px',
              color: '#1e1b4b', cursor: 'pointer',
              fontSize: '14px', fontWeight: '700'
            }}
          >
            {etape === etapes.length - 1 ? 'Terminer' : 'Suivant →'}
          </button>
        </div>
      </div>
    </div>
  )
}
