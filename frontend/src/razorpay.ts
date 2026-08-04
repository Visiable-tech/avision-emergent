/**
 * Open Razorpay Checkout on WEB (Expo Web / preview).
 * Native: use `react-native-razorpay` (needs dev build) — pass the order to
 * that SDK instead. We keep this helper web-only for now.
 */
export type RzpOrder = {
  key_id: string;
  order_id: string;
  amount: number;
  currency: string;
  plan: { label: string; price: number };
  receipt: string;
};

export function openRazorpayWeb(
  order: RzpOrder,
  opts: {
    name: string;
    email: string;
    onSuccess: (resp: any) => void;
    onFail?: () => void;
  },
): Promise<void> {
  return new Promise((resolve) => {
    const load = () =>
      new Promise<void>((res) => {
        // @ts-ignore
        if (typeof window === 'undefined') {
          res();
          return;
        }
        // @ts-ignore
        if (window.Razorpay) {
          res();
          return;
        }
        const s = document.createElement('script');
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.async = true;
        s.onload = () => res();
        s.onerror = () => res();
        document.body.appendChild(s);
      });

    load().then(() => {
      // @ts-ignore
      const Razorpay = typeof window !== 'undefined' ? window.Razorpay : null;
      if (!Razorpay) {
        opts.onFail?.();
        resolve();
        return;
      }
      const rzp = new Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'Avision Institute',
        description: `Test Prime — ${order.plan.label}`,
        order_id: order.order_id,
        prefill: { name: opts.name, email: opts.email },
        theme: { color: '#0B4DB8' },
        handler: (resp: any) => {
          opts.onSuccess(resp);
        },
        modal: {
          ondismiss: () => {
            opts.onFail?.();
          },
        },
      });
      rzp.open();
      resolve();
    });
  });
}
