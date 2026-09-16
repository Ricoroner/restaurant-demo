// Envoi du lien récap aux invités après paiement.
// MOCK : ce projet n'a pas de backend ni de provider SMS/email réel — cette fonction
// simule l'envoi (délai + résolution) pour permettre à l'UI de refléter le comportement
// attendu par la spec. À remplacer par un vrai appel API si un backend est ajouté.

function recapUrl(orderNumber, guestId) {
  return `https://roofood.demo/recap/${orderNumber}/${guestId}`;
}

export async function sendRecapLinks(orderNumber, guests) {
  const results = await Promise.all(
    guests.map(async (guest) => {
      const channel = guest.phone ? "sms" : guest.email ? "email" : null;
      if (!channel) {
        return { guestId: guest.id, channel: null, sent: false };
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
      return { guestId: guest.id, channel, sent: true, link: recapUrl(orderNumber, guest.id) };
    })
  );
  return results;
}
