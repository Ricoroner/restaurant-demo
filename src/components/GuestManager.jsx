import { useState } from "react";

const PHONE_RE = /^[+0-9 ()-]{6,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function GuestManager({ guests, onAddGuest, onRemoveGuest }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");

  function handleAdd(e) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedContact = contact.trim();

    if (!trimmedName) {
      setError("Le nom est requis.");
      return;
    }

    let phone = "";
    let email = "";
    if (trimmedContact) {
      if (EMAIL_RE.test(trimmedContact)) {
        email = trimmedContact;
      } else if (PHONE_RE.test(trimmedContact)) {
        phone = trimmedContact;
      } else {
        setError("Téléphone ou email invalide.");
        return;
      }
    }

    onAddGuest({ name: trimmedName, phone, email });
    setName("");
    setContact("");
    setError("");
  }

  return (
    <div className="guest-manager">
      <h3 className="guest-manager-title">Invités</h3>

      <form className="guest-form" onSubmit={handleAdd}>
        <input
          className="guest-input"
          type="text"
          placeholder="Nom"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(""); }}
        />
        <input
          className="guest-input"
          type="text"
          placeholder="Téléphone ou email (optionnel)"
          value={contact}
          onChange={(e) => { setContact(e.target.value); setError(""); }}
        />
        <button type="submit" className="guest-add-btn">Ajouter</button>
      </form>
      {error && <p className="guest-error">{error}</p>}

      {guests.length > 0 && (
        <ul className="guest-list">
          {guests.map((guest) => (
            <li key={guest.id} className="guest-row">
              <span className="guest-name">{guest.name}</span>
              {!guest.phone && !guest.email && (
                <span className="guest-badge">pas de contact renseigné</span>
              )}
              <button
                type="button"
                className="remove-btn"
                onClick={() => onRemoveGuest(guest.id)}
                aria-label={`Retirer ${guest.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
