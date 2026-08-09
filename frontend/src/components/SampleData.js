export const SAMPLE_CODEBASES = {
  'ecommerce-microservice': {
    repoName: 'ecommerce-microservice',
    description: 'Node.js/Express backend with auth, checkout, and inventory services',
    files: [
      {
        filePath: 'src/services/paymentService.js',
        content: `import Stripe from 'stripe';
import { Order } from '../models/Order.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const processPayment = async (orderId, amount, paymentMethodId) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error('Order not found');

  const intent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'usd',
    payment_method: paymentMethodId,
    confirm: true
  });

  order.status = intent.status === 'succeeded' ? 'PAID' : 'PAYMENT_FAILED';
  order.transactionId = intent.id;
  await order.save();

  return { success: intent.status === 'succeeded', order };
};`
      },
      {
        filePath: 'src/controllers/orderController.js',
        content: `import { processPayment } from '../services/paymentService.js';
import { checkInventory, reserveStock } from '../services/inventoryService.js';

export const checkout = async (req, res) => {
  try {
    const { orderId, paymentMethodId, items } = req.body;
    
    // 1. Validate stock
    const isAvailable = await checkInventory(items);
    if (!isAvailable) return res.status(400).json({ error: 'Items out of stock' });

    // 2. Reserve
    await reserveStock(items);

    // 3. Charge
    const result = await processPayment(orderId, req.body.totalAmount, paymentMethodId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};`
      },
      {
        filePath: 'src/services/inventoryService.js',
        content: `import { Product } from '../models/Product.js';

export const checkInventory = async (items) => {
  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product || product.stock < item.quantity) {
      return false;
    }
  }
  return true;
};

export const reserveStock = async (items) => {
  for (const item of items) {
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { stock: -item.quantity }
    });
  }
};`
      },
      {
        filePath: 'tests/order.test.js',
        content: `import { describe, it, expect, vi } from 'vitest';
import { checkout } from '../src/controllers/orderController.js';

describe('Order Checkout Controller', () => {
  it('should reject checkout if inventory is insufficient', async () => {
    // Inventory mock returns false
    const req = { body: { items: [{ productId: '1', quantity: 999 }] } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await checkout(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});`
      }
    ]
  },
  'user-auth-system': {
    repoName: 'user-auth-system',
    description: 'JWT Authentication and Multi-Factor Auth (MFA) API',
    files: [
      {
        filePath: 'src/auth/jwt.js',
        content: `import jwt from 'jsonwebtoken';

export const signAccessToken = (user) => {
  return jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};`
      },
      {
        filePath: 'src/controllers/authController.js',
        content: `import { User } from '../models/User.js';
import { signAccessToken } from '../auth/jwt.js';
import bcrypt from 'bcryptjs';

export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signAccessToken(user);
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
};`
      }
    ]
  }
};

export const SAMPLE_BRDS = [
  {
    title: 'PROD-402: Add 3D-Secure 2.0 & Apple Pay Support',
    text: `JIRA ISSUE: PROD-402
Title: Implement Apple Pay & 3D-Secure 2.0 in Checkout Pipeline
Description:
To reduce payment fraud and improve conversion on iOS/Safari:
1. The payment service must accept 'apple_pay' and 'google_pay' payment method types.
2. If the Stripe PaymentIntent requires action (status 'requires_action' or 3D-Secure auth), the service should return the client_secret and next_action URL to the client instead of marking the order failed immediately.
3. Order state should transition to 'AWAITING_3DS' instead of failing immediately.
4. Ensure existing unit tests in order.test.js cover this conditional branch.`
  },
  {
    title: 'SEC-109: Implement Refresh Token Rotation & Session Revocation',
    text: `SECURITY REQUIREMENT: SEC-109
Title: Refresh Token Rotation and Redis Blacklist
Description:
Currently, the JWT access token lasts 15m without a refresh token workflow.
Requirements:
1. Implement a refresh token endpoint (/api/auth/refresh) that issues a new short-lived access token and rotates the refresh token.
2. Invalidate old refresh tokens to prevent replay attacks.
3. Add a logout endpoint to revoke the active session.
4. Update authentication middleware and auth controller unit tests.`
  }
];
