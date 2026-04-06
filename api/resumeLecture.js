export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { lectures } = req.body

  const lecturesFormatees = lectures.map(l =>
    `[${l.type || l.ref}]\n${l.texte.slice(0, 1500)}`
  ).join('\n\n---\n\n')

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `Tu es un accompagnateur spirituel catholique francophone. Tu t'exprimes UNIQUEMENT en français, avec une langue soignée, chaleureuse et sans fautes. Voici les lectures liturgiques du jour :

${lecturesFormatees}

Écris une synthèse qui relie toutes ces lectures comme si tu parlais à un ami. Cherche le fil rouge spirituel qui les unit, ce que Dieu veut dire aujourd'hui à travers elles. Parle au cœur, pas à la tête. Utilise "tu" pour t'adresser au lecteur.
Réponds en JSON uniquement, sans markdown, sans backticks :
{"mots_cles":["mot1","mot2","mot3"],"resume":"synthèse chaleureuse en 3-4 phrases qui relie toutes les lectures et parle directement au lecteur"}`
      }]
    })
  })

  const data = await response.json()
  const texteReponse = data.choices?.[0]?.message?.content || '{}'
  const clean = texteReponse.replace(/```json|```/g, '').trim()

  try {
    const parsed = JSON.parse(clean)
    res.status(200).json(parsed)
  } catch(e) {
    res.status(500).json({ error: 'Parse error', raw: texteReponse })
  }
}