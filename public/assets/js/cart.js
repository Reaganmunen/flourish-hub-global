/* ============================================================
   FOLIO HOUSE — cart
   Cart items map directly to the shape orderController.resolveCartItem
   expects: { itemType: 'book'|'post'|'podcast', id, quantity }.
   Price/title shown here are cached for display only — the backend
   always re-resolves the real price at checkout, so a stale cache
   can never be used to under-pay.
   ============================================================ */

const CART_KEY = 'fh_cart';

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
  catch (_) { return []; }
}
function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  updateCartBadge();
}
function addToCart({ itemType, id, title, priceCents, image, quantity = 1, maxQty = null }) {
  const cart = getCart();
  const existing = cart.find((i) => i.itemType === itemType && String(i.id) === String(id));
  // Digital content (post/podcast) only ever needs quantity 1.
  if (itemType !== 'book') {
    if (!existing) cart.push({ itemType, id, title, priceCents, image, quantity: 1 });
  } else if (existing) {
    existing.quantity = maxQty ? Math.min(existing.quantity + quantity, maxQty) : existing.quantity + quantity;
  } else {
    cart.push({ itemType, id, title, priceCents, image, quantity });
  }
  saveCart(cart);
  toast(`Added "${title}" to your bag`);
}
function removeFromCart(itemType, id) {
  // Compared as strings deliberately: callers pass id through an HTML
  // onclick="" attribute (always a string), while cart items loaded from
  // localStorage keep whatever type the API originally gave them
  // (numbers). Strict === here would silently never match and the
  // remove button would do nothing.
  saveCart(getCart().filter((i) => !(i.itemType === itemType && String(i.id) === String(id))));
}
function setQuantity(itemType, id, qty) {
  const cart = getCart();
  const item = cart.find((i) => i.itemType === itemType && String(i.id) === String(id));
  if (item) item.quantity = Math.max(1, qty);
  saveCart(cart);
}
function clearCart() { saveCart([]); }
function cartCount() { return getCart().reduce((s, i) => s + i.quantity, 0); }
function cartSubtotalCents() { return getCart().reduce((s, i) => s + i.priceCents * i.quantity, 0); }
function updateCartBadge() {
  const count = cartCount();
  document.querySelectorAll('.cart-badge').forEach((b) => {
    b.textContent = count;
    b.style.display = count > 0 ? 'flex' : 'none';
  });
}
document.addEventListener('DOMContentLoaded', updateCartBadge);