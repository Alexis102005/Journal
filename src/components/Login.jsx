import { signInWithRedirect, getRedirectResult } from 'firebase/auth'
import { auth, googleProvider } from '../firebase'
import { useEffect } from 'react'

export default function Login() {
    useEffect(() => {
        getRedirectResult(auth).catch(e => console.error(e))
    }, [])

    const seConnecter = async () => {
        try {
            await signInWithRedirect(auth, googleProvider)
        } catch (e) {
            console.error('Erreur connexion:', e)
        }
    }

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100vh', padding: '32px',
            background: 'var(--bg)'
        }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✝️</div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
                Journal
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '48px', textAlign: 'center', lineHeight: '1.6' }}>
                Ton espace de prière et de réflexion spirituelle
            </p>
            <button
                onClick={seConnecter}
                style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '14px 24px', borderRadius: '16px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-card)', color: 'var(--text-primary)',
                    fontSize: '15px', fontWeight: '600', cursor: 'pointer',
                    boxShadow: 'var(--shadow-card)', width: '100%', maxWidth: '280px',
                    justifyContent: 'center'
                }}
            >
                <img src="https://www.google.com/favicon.ico" width="18" height="18" alt="Google" />
                Continuer avec Google
            </button>
        </div>
    )
}