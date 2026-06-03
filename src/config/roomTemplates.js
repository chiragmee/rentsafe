// Standard items per room type — all quantities are defaults, tenant can edit
export const ROOM_ITEM_TEMPLATES = {
  'Living Room': [
    { item_name: 'Ceiling Fan',    quantity: 1, category: 'Electrical', tier: 2 },
    { item_name: 'Tube Light',     quantity: 2, category: 'Electrical', tier: 2 },
    { item_name: 'Switch Board',   quantity: 3, category: 'Fixtures',   tier: 2 },
    { item_name: 'Window',         quantity: 2, category: 'Fixtures',   tier: 2 },
    { item_name: 'Main Door',      quantity: 1, category: 'Fixtures',   tier: 2 },
    { item_name: 'Doorbell',       quantity: 1, category: 'Electrical', tier: 2 },
    { item_name: 'Curtain',        quantity: 2, category: 'Other',      tier: 2 },
    { item_name: 'Curtain Rod',    quantity: 2, category: 'Fixtures',   tier: 2 },
  ],
  'Kitchen': [
    { item_name: 'Exhaust Fan',      quantity: 1, category: 'Electrical', tier: 2 },
    { item_name: 'Tube Light',       quantity: 2, category: 'Electrical', tier: 2 },
    { item_name: 'Switch Board',     quantity: 3, category: 'Fixtures',   tier: 2 },
    { item_name: 'Kitchen Sink',     quantity: 1, category: 'Plumbing',   tier: 2 },
    { item_name: 'Kitchen Cabinet',  quantity: 1, category: 'Furniture',  tier: 1 },
    { item_name: 'Tap',              quantity: 1, category: 'Plumbing',   tier: 2 },
  ],
  'Bedroom': [
    { item_name: 'Ceiling Fan',  quantity: 1, category: 'Electrical', tier: 2 },
    { item_name: 'Tube Light',   quantity: 2, category: 'Electrical', tier: 2 },
    { item_name: 'Switch Board', quantity: 2, category: 'Fixtures',   tier: 2 },
    { item_name: 'Window',       quantity: 1, category: 'Fixtures',   tier: 2 },
    { item_name: 'Door',         quantity: 1, category: 'Fixtures',   tier: 2 },
    { item_name: 'Curtain',      quantity: 1, category: 'Other',      tier: 2 },
    { item_name: 'Curtain Rod',  quantity: 1, category: 'Fixtures',   tier: 2 },
  ],
  'Bathroom': [
    { item_name: 'Geyser',       quantity: 1, category: 'Electrical', tier: 1 },
    { item_name: 'Wash Basin',   quantity: 1, category: 'Plumbing',   tier: 2 },
    { item_name: 'Commode',      quantity: 1, category: 'Plumbing',   tier: 2 },
    { item_name: 'Bulb',         quantity: 1, category: 'Electrical', tier: 2 },
    { item_name: 'Switch Board', quantity: 1, category: 'Fixtures',   tier: 2 },
    { item_name: 'Mirror',       quantity: 1, category: 'Fixtures',   tier: 2 },
    { item_name: 'Tap',          quantity: 2, category: 'Plumbing',   tier: 2 },
    { item_name: 'Shower',       quantity: 1, category: 'Plumbing',   tier: 2 },
  ],
  'Balcony': [
    { item_name: 'Balcony Door', quantity: 1, category: 'Fixtures',   tier: 2 },
    { item_name: 'Grill',        quantity: 1, category: 'Fixtures',   tier: 2 },
    { item_name: 'Bulb',         quantity: 1, category: 'Electrical', tier: 2 },
    { item_name: 'Switch Board', quantity: 1, category: 'Fixtures',   tier: 2 },
  ],
}

// BHK type → list of rooms. Bedrooms reuse the 'Bedroom' template
export const BHK_CONFIGS = {
  'Studio':  ['Living Room + Kitchen', 'Bathroom'],
  '1 BHK':   ['Living Room', 'Kitchen', 'Bedroom 1', 'Bathroom', 'Balcony'],
  '2 BHK':   ['Living Room', 'Kitchen', 'Bedroom 1', 'Bedroom 2', 'Bathroom 1', 'Bathroom 2', 'Balcony'],
  '3 BHK':   ['Living Room', 'Kitchen', 'Bedroom 1', 'Bedroom 2', 'Bedroom 3', 'Bathroom 1', 'Bathroom 2', 'Balcony'],
  '4 BHK':   ['Living Room', 'Kitchen', 'Bedroom 1', 'Bedroom 2', 'Bedroom 3', 'Bedroom 4', 'Bathroom 1', 'Bathroom 2', 'Bathroom 3', 'Balcony'],
}

// Resolve a room name to its template key
function templateKey(roomName) {
  if (roomName.startsWith('Bedroom'))   return 'Bedroom'
  if (roomName.startsWith('Bathroom'))  return 'Bathroom'
  if (roomName === 'Living Room + Kitchen') return 'Living Room' // Studio
  return roomName // Living Room, Kitchen, Balcony match directly
}

// Build the initial items array for a given BHK config
export function buildRoomItems(bhkType, parsedAssets = []) {
  const rooms = BHK_CONFIGS[bhkType] ?? BHK_CONFIGS['1 BHK']
  const result = []

  for (const room of rooms) {
    const key = templateKey(room)
    const templateItems = (ROOM_ITEM_TEMPLATES[key] ?? []).map(t => ({ ...t }))

    // Merge parsed assets into template: if name fuzzy-matches, update quantity
    const usedParsedIds = new Set()
    for (const tpl of templateItems) {
      const match = parsedAssets.find(
        p => !usedParsedIds.has(p.id) && fuzzyMatch(p.item_name, tpl.item_name)
      )
      if (match) {
        tpl.quantity = match.quantity ?? tpl.quantity
        tpl.replacement_cost = match.replacement_cost ?? null
        usedParsedIds.add(match.id)
      }
    }

    result.push({ room, items: templateItems, usedParsedIds })
  }

  // Remaining parsed assets not matched to any template → add to Living Room as extras
  const allUsed = new Set(result.flatMap(r => [...r.usedParsedIds]))
  const extras = parsedAssets.filter(p => !allUsed.has(p.id))
  if (extras.length && result.length > 0) {
    result[0].items.push(...extras.map(e => ({
      item_name: e.item_name,
      quantity: e.quantity ?? 1,
      category: e.category ?? 'Other',
      tier: e.tier ?? 3,
      replacement_cost: e.replacement_cost ?? null,
    })))
  }

  return result.map(({ room, items }) => ({ room, items }))
}

function fuzzyMatch(a = '', b = '') {
  const norm = s => s.toLowerCase().replace(/[^a-z]/g, '')
  const na = norm(a), nb = norm(b)
  return na === nb || na.includes(nb) || nb.includes(na)
}

// Try to detect BHK type from agreement text
export function detectBHK(rawText = '') {
  const t = rawText.toLowerCase()
  if (/\b4\s*bhk\b|\bfour\s+bedroom/.test(t)) return '4 BHK'
  if (/\b3\s*bhk\b|\bthree\s+bedroom/.test(t)) return '3 BHK'
  if (/\b2\s*bhk\b|\btwo\s+bedroom/.test(t)) return '2 BHK'
  if (/\b1\s*bhk\b|\bone\s+bedroom/.test(t)) return '1 BHK'
  if (/\bstudio\b/.test(t)) return 'Studio'
  return null
}
