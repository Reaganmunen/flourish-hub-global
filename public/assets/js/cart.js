/* ============================================================
   FlourishHub: cart
   Cart items map directly to the shape orderController.resolveCartItem
   expects: { itemType: 'book'|'post'|'podcast', id, quantity }.
   Price and title shown here are cached for display only. The backend
   always re-resolves the real price at checkout, so a stale cache
   can never be used to under-pay.
   ============================================================ */

const CART_KEY = 'fh_cart';
const MAX_QTY = 99;

function getCart() {
  try {
    const items = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(items) ? items : [];
  } catch (_) { return []; }
}
function saveCart(items) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (_) { /* storage full or blocked */ }
  updateCartBadge();
}
function addToCart({ itemType, id, title, priceCents, image, quantity = 1, maxQty = null, needsShipping = false }) {
  const cart = getCart();
  const existing = cart.find((i) => i.itemType === itemType && String(i.id) === String(id));
  const cap = maxQty ? Math.min(maxQty, MAX_QTY) : MAX_QTY;
  // Digital content (post/podcast) only ever needs quantity 1.
  if (itemType !== 'book') {
    if (!existing) cart.push({ itemType, id, title, priceCents, image, quantity: 1 });
  } else if (existing) {
    existing.quantity = Math.min(existing.quantity + quantity, cap);
    existing.needsShipping = !!needsShipping;
  } else {
    cart.push({ itemType, id, title, priceCents, image, quantity: Math.min(quantity, cap), needsShipping: !!needsShipping });
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
  const n = Number.isFinite(qty) ? Math.floor(qty) : 1;
  if (item) item.quantity = Math.min(Math.max(1, n), MAX_QTY);
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
