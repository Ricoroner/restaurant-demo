// Répartition de l'addition entre invités (centimes entiers pour éviter les erreurs flottantes).

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// PRNG déterministe (mulberry32) : même seed => même suite de tirages.
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickIndexDeterministic(seedInput, length) {
  if (length <= 1) return 0;
  const rand = mulberry32(hashString(seedInput));
  return Math.floor(rand() * length);
}

function guestIdsForItem(item, assignments, allGuestIds) {
  const assigned = assignments[item.id];
  if (Array.isArray(assigned) && assigned.length > 0) return assigned;
  return allGuestIds; // undefined, "all", ou tableau vidé => tout le monde
}

// Répartit `totalCents` également entre `guestIds`, reliquat distribué au centime
// près à des invités choisis de façon déterministe (seedée) parmi `guestIds`.
function splitCents(totalCents, guestIds, seedPrefix) {
  const n = guestIds.length;
  const base = Math.floor(totalCents / n);
  const remainder = totalCents - base * n;
  const shares = Object.fromEntries(guestIds.map((id) => [id, base]));

  const pool = [...guestIds];
  for (let i = 0; i < remainder; i++) {
    const idx = pickIndexDeterministic(`${seedPrefix}:${i}`, pool.length);
    const guestId = pool.splice(idx, 1)[0];
    shares[guestId] += 1;
  }
  return shares;
}

/**
 * Calcule la répartition de l'addition entre invités.
 *
 * @param {Object} params
 * @param {Array<{id: number|string, price: number, quantity: number}>} params.cart
 * @param {Array<{id: string, name: string}>} params.guests
 * @param {Object<string, "all"|string[]>} params.assignments - clé = item.id
 * @param {number} [params.discount] - remise globale (montant, prorata au niveau commande)
 * @returns {{ perGuest: Array<{guestId:string,name:string,itemsSubtotal:number,tax:number,discount:number,total:number}>, sumCheck: boolean }}
 */
export function computeSplit({ cart, guests, assignments = {}, discount = 0 }) {
  if (!guests || guests.length === 0) {
    return { perGuest: [], sumCheck: true };
  }

  const allGuestIds = guests.map((g) => g.id);
  const itemSubtotalCents = Object.fromEntries(allGuestIds.map((id) => [id, 0]));

  // Étape 1 — répartition par article, en centimes, avec reliquat par-article.
  for (const item of cart) {
    const itemTotalCents = Math.round(item.price * item.quantity * 100);
    const assignees = guestIdsForItem(item, assignments, allGuestIds);
    const shares = splitCents(itemTotalCents, assignees, `item:${item.id}`);
    for (const [guestId, cents] of Object.entries(shares)) {
      itemSubtotalCents[guestId] += cents;
    }
  }

  const subtotalCents = cart.reduce((sum, item) => sum + Math.round(item.price * item.quantity * 100), 0);
  const taxCents = Math.round(subtotalCents * 0.1);
  const discountCents = Math.round(discount * 100);
  const totalCents = subtotalCents + taxCents - discountCents;

  // Étape 2 — taxe et remise au prorata du sous-total de chaque invité, arrondies.
  const perGuestRaw = allGuestIds.map((guestId) => {
    const share = subtotalCents === 0 ? 0 : itemSubtotalCents[guestId] / subtotalCents;
    const guestTaxCents = Math.round(taxCents * share);
    const guestDiscountCents = Math.round(discountCents * share);
    const guestTotalCents = itemSubtotalCents[guestId] + guestTaxCents - guestDiscountCents;
    return {
      guestId,
      itemsSubtotalCents: itemSubtotalCents[guestId],
      taxCents: guestTaxCents,
      discountCents: guestDiscountCents,
      totalCents: guestTotalCents,
    };
  });

  // Étape 3 — réconciliation finale : Σ(totaux arrondis) doit égaler totalCents exactement.
  const sumRounded = perGuestRaw.reduce((sum, g) => sum + g.totalCents, 0);
  const diff = totalCents - sumRounded;
  if (diff !== 0) {
    const seed = `reconcile:${cart.map((i) => `${i.id}:${i.quantity}`).join(",")}:${allGuestIds.join(",")}:${JSON.stringify(assignments)}`;
    const idx = pickIndexDeterministic(seed, perGuestRaw.length);
    perGuestRaw[idx].totalCents += diff;
  }

  const guestById = Object.fromEntries(guests.map((g) => [g.id, g]));
  const perGuest = perGuestRaw.map((g) => ({
    guestId: g.guestId,
    name: guestById[g.guestId]?.name ?? "",
    itemsSubtotal: g.itemsSubtotalCents / 100,
    tax: g.taxCents / 100,
    discount: g.discountCents / 100,
    total: g.totalCents / 100,
  }));

  const sumCheck = perGuest.reduce((sum, g) => sum + Math.round(g.total * 100), 0) === totalCents;

  return { perGuest, sumCheck };
}
