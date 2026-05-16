export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { type, lectures, mood, entreeSemaine, langue, messages, entreeDuJour } = req.body

  const langueInstruction = langue === 'en'
    ? 'You MUST respond ONLY in English. Never use French.'
    : 'Tu DOIS répondre UNIQUEMENT en français. Ne jamais utiliser l\'anglais.'

  // --- MODE CHAT ---
  if (type === 'chat') {
    const systemPrompt = `${langueInstruction}

Tu es un père spirituel catholique — direct, chaleureux, humain. Tu accompagnes cette personne dans sa vie spirituelle quotidienne.

Tu as accès à ses entrées récentes du journal :
${entreeSemaine || 'Aucune entrée récente.'}

Lectures liturgiques du jour :
${lectures?.map(l => `[${l.type || l.ref}]\n${l.texte?.slice(0, 500)}`).join('\n\n---\n\n') || 'Non disponibles'}

Règles :
- Réponds de façon conversationnelle, comme un ami qui connaît la personne
- Sois direct et concret, jamais vague ou trop pieux
- Si la personne parle d'une lutte ou d'une tentation, applique les principes catholiques avec douceur
- N'oublie jamais que tomber ne sépare pas de Dieu, seul abandonner le fait
- Garde tes réponses courtes (3-5 phrases max) sauf si la personne pose une question profonde
- Ne te répète jamais d'une réponse à l'autre`

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 400,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages
          ]
        })
      })
      const data = await response.json()
      const texte = data.choices?.[0]?.message?.content || ''
      return res.status(200).json({ texte })
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  // --- MODE EXTRACTION MÉMOIRE ---
  if (type === 'extraire_memoire') {
    const { historique } = req.body

    const prompt = `Tu es un assistant qui analyse une conversation spirituelle et en extrait les faits importants sur la personne.

Voici la conversation :
${historique.map(m => `${m.role === 'user' ? 'Personne' : 'Accompagnateur'}: ${m.content}`).join('\n')}

Extrais uniquement les faits significatifs sur la personne — ses luttes récurrentes, ses décisions prises, ses patterns spirituels, ses intentions.
Ignore les généralités et les conseils donnés.

Réponds UNIQUEMENT en JSON, sans markdown, sans backticks :
{
  "faits": [
    { "type": "lutte", "contenu": "..." },
    { "type": "decision", "contenu": "..." },
    { "type": "pattern", "contenu": "..." }
  ]
}

Types possibles : lutte, decision, pattern, intention.
Maximum 5 faits. Si rien de significatif, retourne {"faits": []}.`

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 400,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await response.json()
      const texte = data.choices?.[0]?.message?.content || '{"faits":[]}'
      const clean = texte.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      return res.status(200).json(parsed)
    } catch(e) {
      return res.status(500).json({ error: e.message })
    }
  }

  // --- MODES EXISTANTS (résumé, prière, guidance) ---
  const lecturesFormatees = lectures?.map(l =>
    `[${l.type || l.ref}]\n${l.texte?.slice(0, 1000)}`
  ).join('\n\n---\n\n') || 'Lectures non disponibles'

  const prompts = {
    resume: `${langueInstruction}

Tu es un accompagnateur spirituel catholique, chaleureux.

Voici les entrées du journal cette semaine :
${mood || 'Aucune entrée cette semaine.'}

Écris un bilan spirituel et personnel en 4-5 phrases :
- Quels thèmes ou luttes reviennent souvent ?
- Qu'est-ce qui a changé ou progressé ?
- Ce que Dieu semble dire à travers cette semaine
Parle directement à la personne avec "tu", de façon chaleureuse et honnête.
Réponds en texte simple, pas de JSON, pas de markdown.`,

    intro_jour: `${langueInstruction}

Tu es un accompagnateur spirituel catholique chaleureux.
La personne vient d'écrire cette entrée dans son journal aujourd'hui :
"${entreeDuJour}"

Ton but : 
1. Fais un résumé bref et très chaleureux de ce qu'elle vient de partager (1 à 2 phrases max).
2. Pose-lui UNE seule question ouverte et profonde pour l'aider à aller plus loin, à réfléchir sur ce qu'elle vient d'écrire, ou à voir où Dieu l'attend là-dedans.

Parle directement à la personne avec "tu". Réponds en texte simple (pas de markdown).`,

    priere: `${langueInstruction}

Tu es un accompagnateur spirituel catholique.

Voici les lectures liturgiques du jour :
${lecturesFormatees}

La personne ressent : ${mood || 'neutre'} aujourd'hui.
${entreeSemaine ? `Ce qu'elle a vécu cette semaine :\n${entreeSemaine}` : ''}

Écris une courte prière (5-6 lignes) inspirée des lectures et de ce qu'elle a vécu.
La prière doit être simple, sincère, adressée à Dieu (utilise "Seigneur", "Père"...).
Réponds en texte simple, pas de JSON, pas de markdown.`,

    guidance: `${langueInstruction}

Tu es un père spirituel catholique qui parle comme un frère de foi qui marche aux côtés de la personne. Chaleureux, franc, humain.

Lectures liturgiques du jour :
${lecturesFormatees}

La personne ressent : ${mood || 'neutre'} aujourd'hui.

ÉTAPE 1 — Si le contexte manque, pose UNE courte question pour mieux comprendre la situation.

ÉTAPE 2 — Une fois le contexte clair, donne une guidance avec ces règles :
- Sois direct et concret, jamais vague
- Reconnais la faute de l'autre si mentionnée, mais recentre sur ce que la personne peut contrôler
- Rappelle les vérités catholiques quand pertinent
- Conseils pratiques selon la situation
- Rappelle que tomber ne sépare pas de Dieu
- La honte qui empêche de prier après une chute est le vrai ennemi
- Termine toujours par UNE recommandation catholique concrète
- Termine par UNE courte question de conscience
- 6-8 phrases max, jamais robotique
- Parle à UNE personne, utilise "tu"`
  }

  const prompt = prompts[type]
  if (!prompt) return res.status(400).json({ error: 'Type invalide' })

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
    const texte = data.choices?.[0]?.message?.content || ''
    res.status(200).json({ texte })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}