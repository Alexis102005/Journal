import { traductions } from '../i18n'

export default function Parametres({ langue, changerLangue, theme, setTheme, utilisateur, seDeconnecter }) {
  const t = traductions[langue] || traductions.fr

  return (
    <div className="ecran">
      {/* Profil */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        padding: '20px 0 24px'
      }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          overflow: 'hidden', border: '2px solid var(--accent)',
          flexShrink: 0
        }}>
          {utilisateur?.photoURL
            ? <img src={utilisateur.photoURL} width="64" height="64" style={{ display: 'block' }} />
            : <div style={{
                width: '64px', height: '64px',
                background: 'var(--accent-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '28px'
              }}>👤</div>
          }
        </div>
        <div>
          <p style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
            {utilisateur?.displayName}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {utilisateur?.email}
          </p>
        </div>
      </div>

      {/* Langue */}
      <div className="card" style={{ marginBottom: '12px' }}>
        <p className="section-label">🌍 Langue</p>
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          {[
            { code: 'fr', label: '🇫🇷 Français' },
            { code: 'en', label: '🇬🇧 English' }
          ].map(l => (
            <button
              key={l.code}
              onClick={() => changerLangue(l.code)}
              style={{
                flex: 1, padding: '12px', borderRadius: '12px',
                border: `1px solid ${langue === l.code ? 'var(--accent)' : 'var(--border)'}`,
                background: langue === l.code ? 'var(--accent-light)' : 'var(--bg-card)',
                color: langue === l.code ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: langue === l.code ? '700' : '500',
                fontSize: '14px', cursor: 'pointer'
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Thème */}
      <div className="card" style={{ marginBottom: '12px' }}>
        <p className="section-label">🎨 Thème</p>
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          {[
            { code: 'light', label: '☀️ Clair' },
            { code: 'dark', label: '🌙 Sombre' }
          ].map(th => (
            <button
              key={th.code}
              onClick={() => setTheme(th.code)}
              style={{
                flex: 1, padding: '12px', borderRadius: '12px',
                border: `1px solid ${theme === th.code ? 'var(--accent)' : 'var(--border)'}`,
                background: theme === th.code ? 'var(--accent-light)' : 'var(--bg-card)',
                color: theme === th.code ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: theme === th.code ? '700' : '500',
                fontSize: '14px', cursor: 'pointer'
              }}
            >
              {th.label}
            </button>
          ))}
        </div>
      </div>

      {/* Déconnexion */}
      <div className="card" style={{ marginBottom: '12px' }}>
        <p className="section-label">⚙️ Compte</p>
        <button
          onClick={seDeconnecter}
          style={{
            width: '100%', padding: '14px', borderRadius: '12px',
            border: '1px solid #e05050', background: 'transparent',
            color: '#e05050', fontSize: '15px', fontWeight: '600',
            cursor: 'pointer', marginTop: '8px'
          }}
        >
          🚪 Se déconnecter
        </button>
      </div>
    </div>
  )
}
