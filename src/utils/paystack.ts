/**
 * Paystack Payment Gateway Integration
 * Handles Paystack inline payments and fallback test mode for embedded preview environments.
 */

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string;
        email: string;
        amount: number; // in kobo (1 NGN = 100 kobo)
        currency?: string;
        ref?: string;
        metadata?: Record<string, any>;
        callback: (response: { reference: string; status: string; trans?: string; transaction?: string }) => void;
        onClose: () => void;
      }) => {
        openIframe: () => void;
      };
    };
  }
}

export interface PaystackConfig {
  email: string;
  amount: number; // in Naira (converted to kobo automatically)
  customerName: string;
  customerPhone: string;
  orderId: string;
  metadata?: Record<string, any>;
  onSuccess: (reference: string) => void;
  onClose: () => void;
}

// Configurable test key; can be overridden via VITE_PAYSTACK_PUBLIC_KEY
export const PAYSTACK_PUBLIC_KEY = 
  (import.meta as any).env?.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_d3a8fc485c290163351d3fcda69fbbd279cf733e';

export function payWithPaystack({
  email,
  amount,
  customerName,
  customerPhone,
  orderId,
  metadata = {},
  onSuccess,
  onClose
}: PaystackConfig) {
  const amountInKobo = Math.round(amount * 100);
  const ref = `pstk_${orderId}_${Date.now()}`;

  // Check if Paystack script is loaded in window
  if (typeof window !== 'undefined' && window.PaystackPop && typeof window.PaystackPop.setup === 'function') {
    try {
      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: email.trim(),
        amount: amountInKobo,
        currency: 'NGN',
        ref,
        metadata: {
          custom_fields: [
            { display_name: "Customer Name", variable_name: "customer_name", value: customerName },
            { display_name: "Phone Number", variable_name: "customer_phone", value: customerPhone },
            { display_name: "Order ID", variable_name: "order_id", value: orderId }
          ],
          ...metadata
        },
        callback: (response) => {
          const transactionRef = response.reference || response.trans || ref;
          onSuccess(transactionRef);
        },
        onClose: () => {
          onClose();
        }
      });

      handler.openIframe();
      return true;
    } catch (e) {
      console.warn("Paystack popup failed to open via iframe, using inline fallback:", e);
      return false;
    }
  }

  return false;
}
