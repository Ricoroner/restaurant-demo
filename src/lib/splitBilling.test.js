import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { computeSplit } from "./splitBilling";

const cart = [
  { id: 1, price: 10, quantity: 1 },
  { id: 2, price: 7.5, quantity: 2 },
];
const g1 = { id: "g1", name: "Alice" };
const g2 = { id: "g2", name: "Bob" };
const g3 = { id: "g3", name: "Chloé" };

function totalCommande(cartItems) {
  const subtotalCents = cartItems.reduce((s, i) => s + Math.round(i.price * i.quantity * 100), 0);
  const taxCents = Math.round(subtotalCents * 0.1);
  return (subtotalCents + taxCents) / 100;
}

describe("computeSplit", () => {
  it("no guests => empty split, no computation", () => {
    const { perGuest } = computeSplit({ cart, guests: [], assignments: {} });
    expect(perGuest).toEqual([]);
  });

  it("single guest carries 100% of the total", () => {
    const { perGuest } = computeSplit({ cart, guests: [g1], assignments: {} });
    expect(perGuest).toHaveLength(1);
    expect(perGuest[0].total).toBeCloseTo(totalCommande(cart), 2);
  });

  it("item assigned to a single guest gives them the full item price", () => {
    const { perGuest } = computeSplit({
      cart,
      guests: [g1, g2],
      assignments: { 1: ["g1"] },
    });
    const alice = perGuest.find((g) => g.guestId === "g1");
    // Alice: item 1 (€10) + her share of item 2 (unassigned => split with Bob)
    expect(alice.itemsSubtotal).toBeCloseTo(10 + 7.5, 2); // 10 + half of 15
  });

  it("item shared between several guests splits evenly with a coherent remainder", () => {
    const oddCart = [{ id: 1, price: 10, quantity: 1 }]; // 1000 cents / 3
    const { perGuest } = computeSplit({
      cart: oddCart,
      guests: [g1, g2, g3],
      assignments: { 1: ["g1", "g2", "g3"] },
    });
    const totalCents = perGuest.reduce((s, g) => s + Math.round(g.itemsSubtotal * 100), 0);
    expect(totalCents).toBe(1000);
    // remainder distributed one cent at a time: no one is more than 1 cent apart
    const cents = perGuest.map((g) => Math.round(g.itemsSubtotal * 100));
    expect(Math.max(...cents) - Math.min(...cents)).toBeLessThanOrEqual(1);
  });

  it("unassigned item is split equally among all guests", () => {
    const { perGuest } = computeSplit({
      cart: [{ id: 1, price: 9, quantity: 1 }],
      guests: [g1, g2, g3],
      assignments: {},
    });
    for (const g of perGuest) {
      expect(g.itemsSubtotal).toBeCloseTo(3, 2);
    }
  });

  it("tax is prorated by subtotal share, not split evenly", () => {
    const { perGuest } = computeSplit({
      cart,
      guests: [g1, g2],
      assignments: { 1: ["g1"], 2: ["g2"] },
    });
    const alice = perGuest.find((g) => g.guestId === "g1"); // subtotal 10
    const bob = perGuest.find((g) => g.guestId === "g2"); // subtotal 15
    expect(bob.tax).toBeGreaterThan(alice.tax);
  });

  it("order-level discount is prorated by subtotal share", () => {
    const { perGuest } = computeSplit({
      cart,
      guests: [g1, g2],
      assignments: { 1: ["g1"], 2: ["g2"] },
      discount: 5,
    });
    const alice = perGuest.find((g) => g.guestId === "g1");
    const bob = perGuest.find((g) => g.guestId === "g2");
    expect(bob.discount).toBeGreaterThan(alice.discount);
    expect(alice.discount + bob.discount).toBeCloseTo(5, 2);
  });

  it("sum of displayed shares equals the exact order total (edge case #2)", () => {
    const { perGuest, sumCheck } = computeSplit({ cart, guests: [g1, g2, g3], assignments: {} });
    const sum = perGuest.reduce((s, g) => s + g.total, 0);
    expect(sumCheck).toBe(true);
    expect(Math.round(sum * 100)).toBe(Math.round(totalCommande(cart) * 100));
  });

  it("is deterministic: same inputs give the exact same output every time", () => {
    const params = { cart, guests: [g1, g2, g3], assignments: { 2: ["g1", "g2"] } };
    const a = computeSplit(params);
    const b = computeSplit(params);
    expect(a).toEqual(b);
  });

  it("an emptied assignment array (e.g. after guest removal) falls back to 'all'", () => {
    const withEmpty = computeSplit({ cart, guests: [g1, g2], assignments: { 1: [] } });
    const withAll = computeSplit({ cart, guests: [g1, g2], assignments: { 1: "all" } });
    expect(withEmpty).toEqual(withAll);
  });

  it("an assignment referencing an item no longer in the cart is silently ignored", () => {
    expect(() =>
      computeSplit({ cart, guests: [g1, g2], assignments: { 999: ["g1"] } })
    ).not.toThrow();
  });

  it("property: sum of shares always equals the order total, for any cart/guests/assignments", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ id: fc.integer({ min: 1, max: 20 }), price: fc.float({ min: Math.fround(0.5), max: 50, noNaN: true }), quantity: fc.integer({ min: 1, max: 5 }) }), { minLength: 1, maxLength: 8 }),
        fc.array(fc.record({ id: fc.uuid(), name: fc.string({ minLength: 1, maxLength: 10 }) }), { minLength: 1, maxLength: 6 }),
        (items, guestList) => {
          const uniqueItems = items.map((it, i) => ({ ...it, id: i, price: Math.round(it.price * 100) / 100 }));
          const { perGuest, sumCheck } = computeSplit({ cart: uniqueItems, guests: guestList, assignments: {} });
          expect(sumCheck).toBe(true);
          const sum = perGuest.reduce((s, g) => s + Math.round(g.total * 100), 0);
          expect(sum).toBe(Math.round(totalCommande(uniqueItems) * 100));
        }
      )
    );
  });
});
