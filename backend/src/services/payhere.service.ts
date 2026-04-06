import crypto from 'crypto';

const MERCHANT_ID = process.env.PAYHERE_MERCHANT_ID!;
const SECRET      = process.env.PAYHERE_SECRET!;
const SANDBOX     = process.env.PAYHERE_SANDBOX === 'true';

export const PAYHERE_CHECKOUT_URL = SANDBOX
  ? 'https://sandbox.payhere.lk/pay/checkout'
  : 'https://www.payhere.lk/pay/checkout';

/** Generate MD5 hash for PayHere payment initiation */
export function generatePayhereHash(
  orderId: string,
  amount: string,
  currency: string
): string {
  const secretHash = crypto.createHash('md5').update(SECRET).digest('hex').toUpperCase();
  const raw = `${MERCHANT_ID}${orderId}${parseFloat(amount).toFixed(2)}${currency}${secretHash}`;
  return crypto.createHash('md5').update(raw).digest('hex').toUpperCase();
}

/** Verify PayHere webhook MD5 signature */
export function verifyPayhereWebhook(params: {
  merchant_id: string;
  order_id: string;
  payhere_amount: string;
  payhere_currency: string;
  status_code: string;
  md5sig: string;
}): boolean {
  const { merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig } = params;
  const secretHash = crypto.createHash('md5').update(SECRET).digest('hex').toUpperCase();
  const raw = `${merchant_id}${order_id}${payhere_amount}${payhere_currency}${status_code}${secretHash}`;
  const expected = crypto.createHash('md5').update(raw).digest('hex').toUpperCase();
  return md5sig.toUpperCase() === expected;
}

/** Build a signed PayHere checkout payload for the frontend */
export function buildCheckoutPayload(params: {
  orderId: string;
  amount: string;
  currency: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notifyUrl: string;
  returnUrl: string;
  cancelUrl: string;
  itemName: string;
}) {
  const hash = generatePayhereHash(params.orderId, params.amount, params.currency);
  return {
    merchant_id:  MERCHANT_ID,
    return_url:   params.returnUrl,
    cancel_url:   params.cancelUrl,
    notify_url:   params.notifyUrl,
    order_id:     params.orderId,
    items:        params.itemName,
    currency:     params.currency,
    amount:       parseFloat(params.amount).toFixed(2),
    first_name:   params.firstName,
    last_name:    params.lastName,
    email:        params.email,
    phone:        params.phone,
    hash,
    checkoutUrl:  PAYHERE_CHECKOUT_URL,
  };
}
