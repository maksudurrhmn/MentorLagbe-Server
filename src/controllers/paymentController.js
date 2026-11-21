import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';
import { getStripe } from '../config/stripe.js';

export const createCheckoutSession = async (req, res) => {
  try {
    const db = getDB();

    // Get the authenticated user from the database
    if (!ObjectId.isValid(req.auth.userId)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid user account.',
      });
    }

    const user = await db.collection('users').findOne({
      _id: new ObjectId(req.auth.userId),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    // Only students and tutors can purchase Pro
    if (!['student', 'tutor'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Your account is not eligible for a Pro plan.',
      });
    }

    // Prevent purchasing Pro again
    if (user.plan === 'pro') {
      return res.status(409).json({
        success: false,
        message: 'You already have a Pro plan.',
      });
    }

    // Determine the plan and price on the server
    const plan = {
      student: {
        name: 'Student Pro',
        amount: 1000,
      },
      tutor: {
        name: 'Tutor Pro',
        amount: 1500,
      },
    }[user.role];

    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',

      customer_email: user.email,

      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: plan.name,
              description: 'MentorLagbe Pro membership',
            },
            unit_amount: plan.amount,
          },
          quantity: 1,
        },
      ],

      success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,

      client_reference_id: user._id.toString(),

      metadata: {
        userId: user._id.toString(),
        userEmail: user.email,
        userRole: user.role,
        planName: plan.name,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Checkout session created successfully.',
      data: {
        sessionId: session.id,
        checkoutUrl: session.url,
      },
    });
  } catch (error) {
    console.error('Checkout session creation failed:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to create checkout session.',
    });
  }
};

// Stripe webhook
export const handleStripeWebhook = async (req, res) => {
  const stripe = getStripe();
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(500).json({
      success: false,
      message: 'Stripe webhook secret is not configured.',
    });
  }

  let event;

  // Verify that this request genuinely came from Stripe
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (error) {
    console.error('Stripe signature verification failed:', error.message);

    return res.status(400).json({
      success: false,
      message: 'Invalid Stripe webhook signature.',
    });
  }

  // Ignore events that this application does not need
  if (event.type !== 'checkout.session.completed') {
    return res.status(200).json({
      received: true,
      message: 'Event ignored.',
    });
  }

  try {
    const session = event.data.object;

    // Confirm payment status and checkout mode
    if (session.payment_status !== 'paid' || session.mode !== 'payment') {
      return res.status(400).json({
        success: false,
        message: 'Payment is not completed.',
      });
    }

    const metadata = session.metadata || {};
    const { userId, userEmail, userRole, planName } = metadata;

    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user information in payment metadata.',
      });
    }

    // Verify the expected plan and amount
    const plans = {
      student: { name: 'Student Pro', amount: 1000 },
      tutor: { name: 'Tutor Pro', amount: 1500 },
    };

    const selectedPlan = plans[userRole];

    if (
      !selectedPlan ||
      selectedPlan.name !== planName ||
      session.amount_total !== selectedPlan.amount ||
      session.currency !== 'usd'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Payment details do not match the selected plan.',
      });
    }

    const db = getDB();

    const user = await db.collection('users').findOne({
      _id: new ObjectId(userId),
      email: userEmail,
      role: userRole,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account could not be verified.',
      });
    }

    // Check whether this session has already been processed
    const existingPayment = await db.collection('payments').findOne({
      stripeSessionId: session.id,
    });

    if (existingPayment) {
      return res.status(200).json({
        received: true,
        message: 'Payment has already been processed.',
      });
    }

    const paymentIntent = session.payment_intent;

    // Update the user's plan
    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          plan: 'pro',
          updatedAt: new Date(),
        },
      }
    );

    // Save the payment record
    await db.collection('payments').insertOne({
      userEmail: user.email,
      userName: user.name,
      userRole: user.role,
      planName,
      amount: session.amount_total / 100,
      currency: session.currency,
      transactionId:
        typeof paymentIntent === 'string' ? paymentIntent : paymentIntent?.id || session.id,
      stripeSessionId: session.id,
      paymentStatus: 'paid',
      paidAt: new Date(session.created * 1000),
    });

    return res.status(200).json({
      received: true,
      message: 'Payment verified and user upgraded to Pro.',
    });
  } catch (error) {
    console.error('Stripe webhook processing failed:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to process payment webhook.',
    });
  }
};
