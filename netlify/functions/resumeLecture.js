exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  const { texte, ref } = JSON.parse(event.body)

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Tu es un assistant spirituel catholique. Voici une lecture liturgique :

Référence : ${ref}
Texte : ${texte.slice(0, 2000)}

Réponds en JSON uniquement, sans markdown, sans backticks :
{"ref":"référence courte","mots_cles":["mot1","mot2","mot3"],"resume":"résumé en 2-3 phrases simples et spirituelles"}`
      }]
    })
  })

  const data = await response.json()
  const texteReponse = data.content?.[0]?.text || '{}'
  const clean = texteReponse.replace(/```json|```/g, '').trim()

  try {
    const parsed = JSON.parse(clean)
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed)
    }
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Parse error' }) }
  }
}