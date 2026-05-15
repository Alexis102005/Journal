export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end()

    const { entrees, periode, langue } = req.body
    // periode = 'semaine' ou 'mois'

    if (!entrees || entrees.length === 0) {
        return res.status(400).json({ error: 'Aucune entrée' })
    }

    // --- STATS PURES (calculées sans IA) ---
    const nbEntrees = entrees.length

    // Streak
    const datesUniques = [...new Set(entrees.map(e => {
        const d = new Date(e.id)
        d.setHours(0, 0, 0, 0)
        return d.getTime()
    }))].sort((a, b) => b - a)

    let streak = 0
    for (let i = 0; i < datesUniques.length; i++) {
        const diff = i === 0 ? 0 : (datesUniques[i - 1] - datesUniques[i]) / (1000 * 60 * 60 * 24)
        if (i === 0 || diff === 1) streak++
        else break
    }

    // Heure moyenne d'écriture
    const heures = entrees.map(e => new Date(e.id).getHours())
    const heureMoyenne = Math.round(heures.reduce((a, b) => a + b, 0) / heures.length)
    const heureMoyenneStr = `${heureMoyenne}h${String(new Date(0, 0, 0, heureMoyenne).getMinutes()).padStart(2, '0')}`

    // Meilleur jour vs plus difficile (basé sur mood)
    const moodScores = { '😄 Bien': 2, '💪 Fort': 2, '🙏 En paix': 1, '😐 Neutre': 0, '😞 Difficile': -1 }
    const entreesAvecMood = entrees.filter(e => e.mood && moodScores[e.mood] !== undefined)
    let meilleurJour = null
    let jourDifficile = null
    if (entreesAvecMood.length > 0) {
        const sorted = [...entreesAvecMood].sort((a, b) => moodScores[b.mood] - moodScores[a.mood])
        meilleurJour = sorted[0].date
        jourDifficile = sorted[sorted.length - 1].date
    }

    // Mots clés fréquents
    const stopWords = new Set(['le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'en', 'je', 'tu', 'il', 'me', 'mon', 'ma', 'mes', 'ce', 'que', 'qui', 'pas', 'ne', 'se', 'on', 'est', 'au', 'dans', 'pour', 'par', 'sur', 'the', 'a', 'an', 'of', 'to', 'in', 'is', 'it', 'my', 'i', 'and', 'or', 'but'])
    const tousLesMots = entrees
        .flatMap(e => e.contenu.toLowerCase().split(/\s+/))
        .map(m => m.replace(/[^a-záàâéèêëïîôùûü]/gi, ''))
        .filter(m => m.length > 3 && !stopWords.has(m))

    const frequence = {}
    tousLesMots.forEach(m => { frequence[m] = (frequence[m] || 0) + 1 })
    const motsCles = Object.entries(frequence)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([mot]) => mot)

    const motDeLaSemaine = motsCles[0] || ''

    // --- PARTIE IA ---
    const langueInstruction = langue === 'en'
        ? 'You MUST respond ONLY in English.'
        : 'Tu DOIS répondre UNIQUEMENT en français.'

    const contenuEntrees = entrees
        .map(e => `[${e.date}] ${e.mood || ''}\n${e.contenu}`)
        .join('\n\n---\n\n')

    const prompt = `${langueInstruction}

Tu es un accompagnateur spirituel catholique. Analyse ces entrées de journal de la ${periode} :

${contenuEntrees}

Génère une analyse spirituelle en JSON uniquement, sans markdown, sans backticks :
{
  "themes": ["thème1", "thème2", "thème3"],
  "priere": "une courte prière de 4-5 lignes qui résume cette ${periode}, adressée à Dieu",
  "verset": {
    "texte": "un verset biblique court qui correspond à l'état spirituel de cette ${periode}",
    "ref": "Livre chapitre:verset"
  },
  "insight": "une seule phrase qui capture l'essence de cette ${periode} (commence par 'Cette ${periode}...')"
}`

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GROQ_KEY}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                max_tokens: 600,
                messages: [{ role: 'user', content: prompt }]
            })
        })

        const data = await response.json()
        const texte = data.choices?.[0]?.message?.content || '{}'
        const clean = texte.replace(/```json|```/g, '').trim()
        const iaResultat = JSON.parse(clean)

        res.status(200).json({
            stats: {
                nbEntrees,
                streak,
                heureMoyenne: heureMoyenneStr,
                meilleurJour,
                jourDifficile
            },
            motsCles,
            motDeLaSemaine,
            ...iaResultat
        })

    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}