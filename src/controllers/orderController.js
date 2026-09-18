// src/controllers/orderController.js
// The single most important security rule in this whole checkout flow:
// NEVER trust a price or title sent by the client. The cart in the
// request body only supplies { itemType, id, quantity } — we look up
// the current price/title/digital-flag from the DB ourselves before
// building the order. Otherwise anyone could POST { priceCents: 1 }.
const orderModel = require('../models/orderModel');
const bookModel = require('../models/bookModel');
const postModel = require('../models/postModel');
const podcastModel = require('../models/podcastModel');
const customerModel = require('../models/customerModel');
const { createCheckoutSession } = require('../utils/stripe');

async function resolveCartItem(cartItem) {
  const { itemType, id, quantity = 1 } = cartItem;

  if (itemType === 'book') {
    const book = await bookModel.findById(id);
    if (!book || book.status !== 'published') throw badItem(id);
    if (book.is_physical && book.physical_stock_qty !== null && book.physical_stock_qty < quantity) {
      const err = new Error(`"${book.title}" does not have enough stock`);
      err.status = 409;
      throw err;
    }
    return {
      itemType: 'book', bookId: book.id, titleSnapshot: book.title,
      unitPriceCents: book.price_cents, quantity, isDigital: book.is_digital && !book.is_physical,
    };
  }

  if (itemType === 'post') {
    const post = await postModel.findById(id);
    if (!post || post.status !== 'published' || !post.is_premium) throw badItem(id);
    return {
      itemType: 'post', postId: post.id, titleSnapshot: post.title,
      unitPriceCents: post.price_cents, quantity: 1, isDigital: true,
    };
  }

  if (itemType === 'podcast') {
    const podcast = await podcastModel.findById(id);
    if (!podcast || podcast.status !== 'published' || !podcast.is_premium) throw badItem(id);
    return {
      itemType: 'podcast', podcastId: podcast.id, titleSnapshot: podcast.title,
      unitPriceCents: podcast.price_cents, quantity: 1, isDigital: true,
    };
  }

  throw badItem(id);
}

function badItem(id) {
  const err = new Error(`Cart item ${id} is invalid or unavailable`);
  err.status = 400;
  return err;
}

async function checkout(req, res) {
  const { items, guestEmail, guestFullName, shippingAddress, billingAddress, shippingCents } = req.body;
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'items array is required' });
  }

  let customerId = req.customer?.id || null;
  let emailForOrder = req.customer?.email || guestEmail;

  if (!customerId && !guestEmail) {
    return res.status(400).json({ error: 'guestEmail is required for guest checkout' });
  }
  if (!customerId && guestEmail) {
    // Attach a lightweight customer record even for guests, so
    // content_access / order history has somewhere to live if they
    // register later with the same email.
    const guest = await customerModel.findOrCreateGuest(guestEmail, guestFullName);
    // Intentionally NOT setting customerId here — guest checkouts stay
    // guest_email-based until the person actually creates a password.
  }

  const resolvedItems = await Promise.all(items.map(resolveCartItem));
  const anyPhysical = resolvedItems.some((it) => it.itemType === 'book' && !it.isDigital);

  const { order, items: orderItems } = await orderModel.createWithItems({
    customerId,
    guestEmail: customerId ? null : emailForOrder,
    guestFullName: customerId ? null : guestFullName,
    items: resolvedItems,
    shippingAddress: anyPhysical ? shippingAddress : null,
    billingAddress,
    shippingCents: anyPhysical ? Number(shippingCents) || 0 : 0,
  });

  const session = await createCheckoutSession(order, orderItems);
  await orderModel.attachStripeSession(order.id, { sessionId: session.id });

  res.status(201).json({ orderId: order.id, orderNumber: order.order_number, checkoutUrl: session.url });
}

async function getByOrderNumber(req, res) {
  const order = await orderModel.findByOrderNumber(req.params.orderNumber);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  // Guests can look up their own order by number + email, to avoid
  // exposing arbitrary orders to anyone who guesses a number.
  if (!req.customer && req.query.email !== order.guest_email) {
    return res.status(403).json({ error: 'Email confirmation required to view this order' });
  }
  if (req.customer && order.customer_id && order.customer_id !== req.customer.id) {
    return res.status(403).json({ error: 'Not your order' });
  }

  const items = await orderModel.getItems(order.id);
  res.json({ order, items });
}

async function listMine(req, res) {
  const orders = await orderModel.listForCustomer(req.customer.id);
  res.json({ orders });
}

async function listAll(req, res) {
  const { status, page, pageSize } = req.query;
  const orders = await orderModel.listAll({ status, page: Number(page) || 1, pageSize: Number(pageSize) || 30 });
  res.json({ orders });
}

async function getById(req, res) {
  const order = await orderModel.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const items = await orderModel.getItems(order.id);
  res.json({ order, items });
}

async function updateStatus(req, res) {
  const { status } = req.body;
  const order = await orderModel.updateStatus(req.params.id, status);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json({ order });
}

module.exports = { checkout, getByOrderNumber, listMine, listAll, getById, updateStatus };
