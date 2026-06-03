const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY
const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite']

const PARSE_PROMPT = `You are a rental agreement parser for Indian rent agreements.
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
- If any field is not found, use null`

async function callGemini(parts, maxTokens = 2048) {
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
              contents: [{ parts }],
              generationConfig: { maxOutputTokens: maxTokens, temperature: 0.1 },
            }),
          }
        )
        if (res.status === 503) { await new Promise(r => setTimeout(r, 1500)); continue }
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
  throw lastError ?? new Error('All Gemini models unavailable. Please try again.')
}

function parseJSON(text) {
  // Strip markdown code fences anywhere in the response
  let clean = text.trim()
    .replace(/```json/gi, '').replace(/```/g, '').trim()

  // Strategy 1: direct parse
  try { return JSON.parse(clean) } catch {}

  // Strategy 2: find the largest {...} block (greedy — handles trailing text)
  const matches = [...clean.matchAll(/\{[\s\S]*\}/g)]
  for (const m of matches.reverse()) {
    try { return JSON.parse(m[0]) } catch {}
  }

  // Strategy 3: find first { and last } and try everything in between
  const start = clean.indexOf('{')
  const end = clean.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(clean.slice(start, end + 1)) } catch {}
  }

  console.error('Raw Gemini response that failed JSON parse:', text)
  throw new Error('Could not read the agreement. Please try uploading again.')
}

// Send PDF directly to Gemini as base64 — no pdfjs-dist needed
export async function parseAgreementFromPdf(pdfBase64) {
  const text = await callGemini([
    { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
    { text: PARSE_PROMPT },
  ], 4096)
  return parseJSON(text)
}

// Fallback: parse from extracted text (DOCX or plain text)
export async function parseAgreement(pdfText) {
  const text = await callGemini(
    [{ text: `${PARSE_PROMPT}\n\nRental agreement text:\n${pdfText}` }],
    4096
  )
  return parseJSON(text)
}

export async function getMarketRate(itemName, city) {
  const prompt = `You are a property cost estimator for Indian rental markets.
For the item "${itemName}" in ${city}, provide the current 2025 replacement cost range.
Return ONLY valid JSON, no markdown, no explanation:
{"market_rate_min": 0, "market_rate_max": 0, "source_note": ""}
Provide realistic Indian market rates in INR.`
  try {
    const text = await callGemini([{ text: prompt }], 256)
    return parseJSON(text)
  } catch {
    return { market_rate_min: null, market_rate_max: null, source_note: '' }
  }
}
