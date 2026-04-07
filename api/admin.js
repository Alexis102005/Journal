export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { mdp } = req.body
  if (mdp === process.env.ADMIN_PASSWORD) {
    res.status(200).json({ ok: true })
  } else {
    res.status(401).json({ ok: false })
  }
}