// netlify/functions/resumeLecture.js
const https = require('https')

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  const { lectures } = JSON.parse(event.body)
  // lectures = [{ ref, texte, type }, ...]

  // On concatene toutes les lectures en un seul bloc
  const lecturesFormatees = lectures.map(l => 
    `[${l.type || l.ref}]\n${l.texte.slice(0, 1500)}`
  ).join('\n\n---\n\n')

  const requestBody = JSON.stringify({
    model: 'llama-3.1-8b-instant',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `Tu es un assistant spirituel catholique. Voici les lectures liturgiques du jour :

${lecturesFormatees}

À partir de TOUTES ces lectures, donne une synthèse spirituelle unifiée.
Réponds en JSON uniquement, sans markdown, sans backticks :
{"mots_cles":["mot1","mot2","mot3"],"resume":"synthèse spirituelle en 3-4 phrases qui relie toutes les lectures du jour"}`
    }]
  })

  const data = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_KEY}`,
        'Content-Length': Buffer.byteLength(requestBody)
      }
    }, (res) => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => resolve(JSON.parse(body)))
    })
    req.on('error', reject)
    req.write(requestBody)
    req.end()
  })

  const texteReponse = data.choices?.[0]?.message?.content || '{}'
  const clean = texteReponse.replace(/```json|```/g, '').trim()

  try {
    const parsed = JSON.parse(clean)
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed)
    }
  } catch(e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Parse error', raw: texteReponse })
    }
  }
}