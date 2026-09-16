import { useState } from "react";
import { dishes, deliveryInfo } from "./data";
import Menu from "./components/Menu";
import Cart from "./components/Cart";
import PaymentModal from "./components/PaymentModal";
import { trackEvent } from "./lib/track";
import "./App.css";

function generateGuestId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function App() {
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showPayment, setShowPayment] = useState(false);
  const [guests, setGuests] = useState([]);
  const [assignments, setAssignments] = useState({}); // { [itemId]: "all" | guestId[] }

  function addToCart(dish) {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === dish.id);
      if (existing) {
        return prev.map((item) =>
          item.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...dish, quantity: 1 }];
    });
  }

  function removeFromCart(id) {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }

  function addGuest({ name, phone, email }) {
    setGuests((prev) => {
      const next = [...prev, { id: generateGuestId(), name, phone, email }];
      trackEvent("group_order_guest_added", { guestCount: next.length, hasContact: Boolean(phone || email) });
      return next;
    });
  }

  function removeGuest(guestId) {
    setGuests((prev) => prev.filter((g) => g.id !== guestId));
    setAssignments((prev) => {
      const next = {};
      for (const [itemId, assigned] of Object.entries(prev)) {
        next[itemId] = Array.isArray(assigned)
          ? assigned.filter((id) => id !== guestId)
          : assigned;
      }
      return next;
    });
  }

  function setItemAssignment(itemId, guestIds) {
    setAssignments((prev) => ({ ...prev, [itemId]: guestIds }));
    const mode = guestIds === "all" ? "all" : guestIds.length > 1 ? "multiple" : "single";
    trackEvent("group_order_item_assigned", { mode });
  }

  const cartCount = cart.length;

  return (
    <div className="app">
      <header className="app-header">
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          <img src={`${import.meta.env.BASE_URL}deliveroo-logo.png`} alt="Deliveroo" height="36" />
          <h1>roo<span style={{color:"#1a271f"}}>food</span></h1>
          <span className="delivery-eta">
            <span className="eta-dot" />
            <span className="eta-icon">🛵</span>
            Delivery in {deliveryInfo.etaMin}–{deliveryInfo.etaMax} min
          </span>
        </div>
        <div className="cart-badge-wrapper">
          <span className="cart-icon">🛒</span>
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </div>
      </header>

      <main className="app-main">
        <Menu
          dishes={dishes}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          onAddToCart={addToCart}
        />
        <Cart
          cart={cart}
          onRemove={removeFromCart}
          onCheckout={() => setShowPayment(true)}
          guests={guests}
          assignments={assignments}
          onAddGuest={addGuest}
          onRemoveGuest={removeGuest}
          onSetItemAssignment={setItemAssignment}
        />
      </main>
      {showPayment && (
        <PaymentModal
          cart={cart}
          guests={guests}
          assignments={assignments}
          onClose={() => setShowPayment(false)}
          onSuccess={() => { setCart([]); setShowPayment(false); }}
        />
      )}
    </div>
  );
}
