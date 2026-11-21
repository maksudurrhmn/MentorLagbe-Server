import Stripe from 'stripe';

let stripeInstance;

export const getStripe = () => {
  if (stripeInstance) {
    return stripeInstance;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is missing.');
  }

  stripeInstance = new Stripe(secretKey);

  return stripeInstance;
};
