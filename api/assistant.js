export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { type, lectures, mood, entreeSemaine, langue } = req.body
  const lecturesFormatees = lectures?.map(l =>
    `[${l.type || l.ref}]\n${l.texte?.slice(0, 1000)}`
  ).join('\n\n---\n\n') || 'Lectures non disponibles'

  const langueInstruction = langue === 'en'
    ? 'You MUST respond ONLY in English. Never use French.'
    : 'Tu DOIS répondre UNIQUEMENT en français. Ne jamais utiliser l\'anglais.'

  const prompts = {
    resume: `${langueInstruction}

You are a Catholic spiritual companion, warm and caring.

Here are the person's journal entries this week:
${mood || 'No entries this week.'}

Write a spiritual and personal weekly review in 4-5 sentences:
- What themes or struggles come up often?
- What has changed or progressed?
- What God seems to be saying through this week
Speak directly to the person using "you", in a warm and honest way.
Respond in plain text, no JSON, no markdown.`,

    priere: `${langueInstruction}

You are a Catholic spiritual companion. 

Here are today's liturgical readings:
${lecturesFormatees}

The person is feeling: ${mood || 'neutral'} today.
${entreeSemaine ? `What they lived this week:\n${entreeSemaine}` : ''}

Write a short prayer (5-6 lines) inspired by the readings and what they lived. 
The prayer must be simple, sincere, spoken directly to God (use "Lord", "Father"...).
Respond in plain text, no JSON, no markdown.`,

    guidance: `${langueInstruction}

You are a Catholic spiritual companion who speaks like a direct spiritual father AND a faith brother walking alongside the person. Warm, frank, and human.

Here are today's liturgical readings:
${lecturesFormatees}

The person is feeling: ${mood || 'neutral'} today.

STEP 1 — If context is missing, ask ONE short question to better understand their situation. Just one.

STEP 2 — Once context is clear, give guidance with these rules:
- Be direct and concrete, never vague or overly pious
- Acknowledge the other person's fault if mentioned — but refocus on what they can control
- Don't put all the blame on the person
- Remind Catholic truths when relevant: the Bible calls us to honor father and mother, forgiveness is for their own freedom not the other's, God forgives without keeping score
- Practical advice based on situation:
  * Idle → find something to do
  * Night → set a phone cutoff time
  * Mid-activity → let the thought pass without fighting it
  * Temptation after emotional pain → identify the pain behind it
- Remind that falling doesn't separate from God — only giving up does
- Shame that prevents prayer after a fall is the real enemy
- Never count days without — it's not a race
- Always end with ONE concrete Catholic recommendation:
  a slow Our Father, a decade of the rosary, or a specific Bible passage
- End with ONE short conscience question inviting a concrete gesture
- 6-8 sentences max, never robotic, never generic
- Speak to ONE person, use "you", speak to the heart`
  }

  const prompt = prompts[type]
  if (!prompt) return res.status(400).json({ error: 'Type invalide' })

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await response.json()
    const texte = data.choices?.[0]?.message?.content || ''
    res.status(200).json({ texte })

  } catch(e) {
    res.status(500).json({ error: e.message })
  }
}