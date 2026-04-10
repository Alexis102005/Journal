export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    // Lire le body comme buffer
    const chunks = []
    for await (const chunk of req) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)
    const contentType = req.headers['content-type']

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_KEY}`,
        'Content-Type': contentType
      },
      body: buffer
    })

    const data = await response.json()
    res.status(200).json(data)
  } catch(e) {
    res.status(500).json({ error: e.message })
  }
}