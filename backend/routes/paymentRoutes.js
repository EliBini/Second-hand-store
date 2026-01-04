/*
 * Payment Routes - נתיבי תשלום
 * ניהול תהליך התשלום באמצעות PayPal Sandbox
 */
const express = require('express');
const router = express.Router();
const connectToDatabase = require('../models/db');
const logger = require('../logger');
const { authenticate } = require('../middleware/auth');
const { ObjectId } = require('mongodb');
// No external PayPal calls: use simulated sandbox flow

// Note: Pay-with-balance endpoint removed in favor of PayPal Sandbox integration.

// יצירת הזמנת תשלום
router.post('/create-order', authenticate, async (req, res, next) => {
    try {
        const { itemId, amount } = req.body;
        
        if (!itemId || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const db = await connectToDatabase();
        const itemsCollection = db.collection('secondChanceItems');
        const paymentsCollection = db.collection('payments');
        
        // בדיקה שהפריט קיים
        const item = await itemsCollection.findOne({ id: itemId });
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // בדיקה שהפריט לא נמכר
        if (item.status === 'sold') {
            return res.status(400).json({ error: 'Item already sold' });
        }

        // בדיקה שהמחיר תואם
        if (item.price !== amount) {
            return res.status(400).json({ error: 'Price mismatch' });
        }

        // בדיקה שהקונה לא הבעלים של הפריט
        if (item.ownerId === req.user.id) {
            return res.status(400).json({ error: 'Cannot buy your own item' });
        }

        // Always use a simulated PayPal sandbox order (no external API calls)
        const payment = {
            orderId: `SANDBOX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            provider: 'paypal-sandbox',
            itemId,
            buyerId: req.user.id,
            sellerId: item.ownerId,
            amount,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await paymentsCollection.insertOne(payment);

        logger.info(`Sandbox payment order created: ${payment.orderId} for item ${itemId}`);

        res.json({ orderId: payment.orderId, amount: payment.amount, provider: payment.provider });
    } catch (error) {
        logger.error('Error creating payment order:', error);
        next(error);
    }
});

// אישור תשלום (סימולציה של PayPal)
router.post('/capture-order', authenticate, async (req, res, next) => {
    try {
        // accept either `orderId` or `orderID` (PayPal uses `orderID` in the SDK)
        const { orderId: orderIdBody, orderID: orderIDBody } = req.body || {};
        const orderId = orderIdBody || orderIDBody;

        if (!orderId) {
            return res.status(400).json({ error: 'Missing orderId' });
        }

        const db = await connectToDatabase();
        const paymentsCollection = db.collection('payments');
        const itemsCollection = db.collection('secondChanceItems');

        // מציאת ההזמנה
        const payment = await paymentsCollection.findOne({ orderId });
        if (!payment) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // בדיקה שהתשלום שייך למשתמש המחובר
        if (payment.buyerId !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Simulated capture flow for sandbox payments
        // Update payment status to completed and mark item as paid/sold

        // Fallback: local simulated capture
        if (payment.status !== 'pending') {
            return res.status(400).json({ error: `Order already ${payment.status}` });
        }


        await paymentsCollection.updateOne(
            { orderId },
            {
                $set: {
                    status: 'completed',
                    completedAt: new Date(),
                    updatedAt: new Date(),
                    providerResponse: { simulated: true },
                },
            }
        );

        await itemsCollection.updateOne(
            { id: payment.itemId },
            {
                $set: {
                    status: 'sold',
                    soldTo: payment.buyerId,
                    soldAt: new Date(),
                    isPaid: true,
                },
            }
        );

        logger.info(`Payment captured (sim): ${orderId} for item ${payment.itemId}`);

        res.json({ success: true, orderId, status: 'completed' });
    } catch (error) {
        logger.error('Error capturing payment:', error);
        next(error);
    }
});

// ביטול תשלום
router.post('/cancel-order', authenticate, async (req, res, next) => {
    try {
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({ error: 'Missing orderId' });
        }

        const db = await connectToDatabase();
        const paymentsCollection = db.collection('payments');

        const payment = await paymentsCollection.findOne({ orderId });
        if (!payment) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (payment.buyerId !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (payment.status !== 'pending') {
            return res.status(400).json({ error: `Cannot cancel ${payment.status} order` });
        }

        await paymentsCollection.updateOne(
            { orderId },
            {
                $set: {
                    status: 'cancelled',
                    cancelledAt: new Date(),
                    updatedAt: new Date(),
                },
            }
        );

        logger.info(`Payment cancelled: ${orderId}`);

        res.json({
            success: true,
            orderId,
            status: 'cancelled',
        });
    } catch (error) {
        logger.error('Error cancelling payment:', error);
        next(error);
    }
});

// קבלת היסטוריית רכישות של משתמש
router.get('/my-purchases', authenticate, async (req, res, next) => {
    try {
        const db = await connectToDatabase();
        const paymentsCollection = db.collection('payments');

        const purchases = await paymentsCollection
            .find({ buyerId: req.user.id })
            .sort({ createdAt: -1 })
            .toArray();

        res.json(purchases);
    } catch (error) {
        logger.error('Error fetching purchases:', error);
        next(error);
    }
});

// קבלת היסטוריית מכירות של משתמש
router.get('/my-sales', authenticate, async (req, res, next) => {
    try {
        const db = await connectToDatabase();
        const paymentsCollection = db.collection('payments');

        const sales = await paymentsCollection
            .find({ sellerId: req.user.id, status: 'completed' })
            .sort({ createdAt: -1 })
            .toArray();

        res.json(sales);
    } catch (error) {
        logger.error('Error fetching sales:', error);
        next(error);
    }
});


module.exports = router;

// Endpoint to expose PayPal client id to frontend (safe for sandbox usage)
router.get('/paypal-config', (req, res) => {
    const clientId = process.env.PAYPAL_CLIENT_ID || null;
    res.json({ clientId });
});
