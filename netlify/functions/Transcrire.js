const https = require('https')
const { Readable } = require('stream')

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  const contentType = event.headers['content-type'] || ''
  const boundary = contentType.split('boundary=')[1]
  
  const body = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8')
  
  const data = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.groq.com',
      path: '/openai/v1/audio/transcriptions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_KEY}`,
        'Content-Type': contentType,
        'Content-Length': body.length
      }
    }, (res) => {
      let responseBody = ''
      res.on('data', chunk => responseBody += chunk)
      res.on('end', () => resolve(JSON.parse(responseBody)))
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }
}