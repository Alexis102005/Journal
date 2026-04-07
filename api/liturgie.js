export default async function handler(req, res) {
  try {
    const { lang } = req.query
    const date = new Date()
    const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
    
    const region = lang === 'en' ? 'england' : 'france'
    const response = await fetch(`https://api.aelf.org/v1/messes/${dateStr}/${region}`)
    const data = await response.json()
    
    res.status(200).json(data)
  } catch(e) {
    res.status(500).json({ error: e.message })
  }
}