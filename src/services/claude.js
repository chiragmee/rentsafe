const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY

// Fallback chain — tries each model in order until one responds
const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite']

async function callGemini(prompt, maxTokens = 2048) {
  let lastError
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: maxTokens, temperature: 0.1 },
            }),
          }
        )
        // 503 = overloaded, retry once then move to next model
        if (res.status === 503) {
          await new Promise(r => setTimeout(r, 1500))
          continue
        }
        // 429 with limit:0 = this model has no quota, skip immediately
        if (res.status === 429) break

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error?.message ?? `Gemini error ${res.status}`)
        }

        const data = await res.json()
        return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      } catch (e) {
        lastError = e
      }
    }
  }
  throw lastError ?? new Error('All Gemini models unavailable. Please try again in a moment.')
}

function parseJSON(text) {
  const trimmed = text.trim()
  // Strip markdown code fences if present
  const clean = trimmed.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  try {
    return JSON.parse(clean)
  } catch {
    const match = clean.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('Could not parse JSON from AI response')
  }
}

export async function parseAgreement(pdfText) {
  const prompt = `You are a rental agreement parser for Indian rent agreements.
Extract the following fields and return ONLY valid JSON. No markdown, no explanation, no extra text.

{
  "tenant_name": "",
  "owner_name": "",
  "tenant_phone": "",
  "owner_phone": "",
  "property_address": "",
  "property_state": "",
  "monthly_rent": 0,
  "deposit_amount": 0,
  "tenure_start_date": "",
  "tenure_months": 0,
  "rent_escalation_percent": 0,
  "escalation_trigger": "",
  "notice_period_days": 0,
  "items": [
    { "item_name": "", "quantity": 1, "category": "", "tier": 1 }
  ]
}

Rules:
- property_state: detect Indian state from address (e.g. "Karnataka", "Maharashtra")
- Items: extract every physical item mentioned — furniture, appliances, fixtures, keys, locks
- category: one of Furniture / Electrical / Fixtures / Plumbing / Other
- tier: 1 for high-value (AC, fridge, sofa, TV, beds, wardrobes, washing machine, geyser, microwave, dining table)
       2 for frequently disputed (keys, locks, curtains, curtain rods, fans, tube lights, switches, door handles, mirrors, gas stove)
       3 for everything else
- tenure_start_date: ISO date string YYYY-MM-DD
- If any field is not found, use null

Rental agreement text:
${pdfText}`

  const text = await callGemini(prompt, 2048)
  return parseJSON(text)
}

export async function getMarketRate(itemName, city) {
  const prompt = `You are a property cost estimator for Indian rental markets.
For the item "${itemName}" in ${city}, provide the current 2025 replacement cost range.
Return ONLY valid JSON, no markdown, no explanation:
{
  "market_rate_min": 0,
  "market_rate_max": 0,
  "source_note": ""
}
Provide realistic Indian market rates in INR. If unsure, give a wide range.`

  try {
    const text = await callGemini(prompt, 256)
    return parseJSON(text)
  } catch {
    return { market_rate_min: null, market_rate_max: null, source_note: '' }
  }
}
