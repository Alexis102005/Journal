export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end()

    const { type, lectures, entreesRecentes, langue } = req.body

    const langueInstruction = langue === 'en'
        ? 'You MUST respond ONLY in English.'
        : 'Tu DOIS répondre UNIQUEMENT en français.'

    const lecturesFormatees = lectures?.map(l =>
        `[${l.type || l.ref}]\n${l.texte?.slice(0, 800)}`
    ).join('\n\n---\n\n') || 'Lectures non disponibles'

    const contextePersonnel = entreesRecentes
        ? `Ce que la personne a vécu récemment :\n${entreesRecentes}`
        : 'Pas d\'entrées récentes — base-toi uniquement sur les lectures.'

    const typePriere = type === 'matin'
        ? 'prière du matin — pour commencer la journée avec Dieu, offrir sa journée, demander la force et la clarté'
        : 'prière du soir — pour clore la journée, rendre grâce, confesser ses manquements, trouver la paix'

    const prompt = `${langueInstruction}

Tu es un accompagnateur spirituel catholique. Écris une ${typePriere}.

Lectures liturgiques du jour :
${lecturesFormatees}

${contextePersonnel}

Règles :
- 6-8 lignes maximum
- Adressée directement à Dieu ("Seigneur", "Père", "Jésus")
- Inspirée des lectures ET du vécu personnel si disponible
- Simple, sincère, pas trop pieuse
- Termine par "Amen."
- Texte simple, pas de markdown`

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GROQ_KEY}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                max_tokens: 300,
                messages: [{ role: 'user', content: prompt }]
            })
        })
        const data = await response.json()
        const texte = data.choices?.[0]?.message?.content || ''
        res.status(200).json({ texte })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}