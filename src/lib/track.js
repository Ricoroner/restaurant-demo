// Stub de tracking analytics — ce projet n'a aucune intégration analytics réelle.
// Remplacer par un vrai SDK (Amplitude, Segment, ...) si besoin.
export function trackEvent(name, props = {}) {
  console.log(`[track] ${name}`, props);
}
