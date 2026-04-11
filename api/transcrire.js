export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { audio, langue } = req.body

    if (!audio) return res.status(400).json({ error: 'No audio provided' })

    const buffer = Buffer.from(audio, 'base64')
    
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2)
    
    const header = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.webm"\r\nContent-Type: audio/webm\r\n\r\n`
    )
    const modelPart = Buffer.from(
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-large-v3`
    )
    const langPart = Buffer.from(
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\n${langue || 'fr'}`
    )
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`)
    
    const body = Buffer.concat([header, buffer, modelPart, langPart, footer])

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_KEY}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body
    })

    const text = await response.text()
    
    // Log pour debug
    console.log('Groq status:', response.status)
    console.log('Groq response:', text)
    
    try {
      const data = JSON.parse(text)
      res.status(200).json(data)
    } catch(e) {
      res.status(500).json({ error: 'Parse error', raw: text, status: response.status })
    }
    
  } catch(e) {
    res.status(500).json({ error: e.message, stack: e.stack })
  }
}