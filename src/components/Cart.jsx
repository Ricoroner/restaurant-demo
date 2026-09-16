import GuestManager from "./GuestManager";

function ItemAssignment({ item, guests, assignments, onSetItemAssignment }) {
  const assigned = assignments[item.id];
  const isAll = !Array.isArray(assigned) || assigned.length === 0;

  function toggleGuest(guestId) {
    const current = Array.isArray(assigned) ? assigned : [];
    const next = current.includes(guestId)
      ? current.filter((id) => id !== guestId)
      : [...current, guestId];
    onSetItemAssignment(item.id, next);
  }

  return (
    <div className="assign-chips">
      <button
        type="button"
        className={`assign-chip${isAll ? " assign-chip--active" : ""}`}
        onClick={() => onSetItemAssignment(item.id, "all")}
      >
        Tout le monde
      </button>
      {guests.map((guest) => (
        <button
          type="button"
          key={guest.id}
          className={`assign-chip${!isAll && assigned.includes(guest.id) ? " assign-chip--active" : ""}`}
          onClick={() => toggleGuest(guest.id)}
        >
          {guest.name}
        </button>
      ))}
    </div>
  );
}

export default function Cart({
  cart,
  onRemove,
  onCheckout,
  guests = [],
  assignments = {},
  onAddGuest,
  onRemoveGuest,
  onSetItemAssignment,
}) {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const tax = subtotal * 0.10;
  const total = subtotal + tax;

  return (
    <aside className="cart">
      <h2>Your Order</h2>

      {onAddGuest && (
        <GuestManager guests={guests} onAddGuest={onAddGuest} onRemoveGuest={onRemoveGuest} />
      )}

      {cart.length === 0 ? (
        <p className="cart-empty">No items yet.</p>
      ) : (
        <ul className="cart-list">
          {cart.map((item, index) => (
            <li key={index} className="cart-item-block">
              <div className="cart-item">
                <span className="cart-item-emoji">{item.emoji}</span>
                <div className="cart-item-details">
                  <span className="cart-item-name">{item.name}</span>
                  <span className="cart-item-qty">x{item.quantity}</span>
                </div>
                <span className="cart-item-price">€{(item.price * item.quantity).toFixed(2)}</span>
                <button className="remove-btn" onClick={() => onRemove(item.id)}>✕</button>
              </div>
              {guests.length > 0 && (
                <ItemAssignment
                  item={item}
                  guests={guests}
                  assignments={assignments}
                  onSetItemAssignment={onSetItemAssignment}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="cart-totals">
        <div className="cart-totals-row">
          <span>Subtotal</span>
          <span>€{subtotal.toFixed(2)}</span>
        </div>
        <div className="cart-totals-row">
          <span>Tax (10%)</span>
          <span>€{tax.toFixed(2)}</span>
        </div>
        <div className="cart-totals-row total">
          <span>Total</span>
          <span>€{total.toFixed(2)}</span>
        </div>
      </div>

      <button
        className="checkout-btn"
        disabled={cart.length === 0}
        onClick={onCheckout}
      >
        Place Order
      </button>
    </aside>
  );
}
