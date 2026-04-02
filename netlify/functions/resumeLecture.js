const https = require('https')

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  const { texte, ref } = JSON.parse(event.body)

  const requestBody = JSON.stringify({
    model: 'llama-3.1-8b-instant',
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

  console.log('Groq response:', JSON.stringify(data))

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