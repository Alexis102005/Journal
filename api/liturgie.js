export default async function handler(req, res) {
  const date = new Date()
  const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
  
  const response = await fetch(`https://api.aelf.org/v1/messes/${dateStr}/france`)
  const data = await response.json()
  
  res.status(200).json(data)
}