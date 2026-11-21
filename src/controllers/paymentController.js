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
