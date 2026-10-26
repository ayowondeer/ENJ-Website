import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingCart, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Phone, 
  CreditCard,
  ShieldCheck,
  Check
} from 'lucide-react';
import { CartItem, db, OrderItem } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { formatNaira } from './ShopView';
import { payWithPaystack, PAYSTACK_PUBLIC_KEY } from '../utils/paystack';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  updateQuantity: (index: number, quantity: number) => void;
  removeFromCart: (index: number) => void;
  clearCart: () => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  updateQuantity,
  removeFromCart,
  clearCart
}: CartDrawerProps) {
  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  
  // Checkout Form State
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<OrderItem | null>(null);

  // Paystack fallback modal state (if popup is blocked by iframe security)
  const [showPaystackFallback, setShowPaystackFallback] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState('');

  const totalAmount = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (!isOpen) return null;

  const handlePaystackCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerEmail.trim() || !customerPhone.trim()) {
      setSubmitError('Please fill in your name, email, and phone number.');
      return;
    }

    setIsProcessing(true);
    setSubmitError(null);

    const generatedOrderId = `ENJ-${Date.now().toString().slice(-6)}`;
    setPendingOrderId(generatedOrderId);

    // Launch Paystack Inline
    const opened = payWithPaystack({
      email: customerEmail,
      amount: totalAmount,
      customerName,
      customerPhone,
      orderId: generatedOrderId,
      onSuccess: (reference) => {
        finalizeOrder(generatedOrderId, reference);
      },
      onClose: () => {
        setIsProcessing(false);
      }
    });

    if (!opened) {
      // If popup couldn't be spawned directly in iframe, show instant embedded Paystack modal
      setShowPaystackFallback(true);
    }
  };

  const finalizeOrder = async (orderId: string, paystackRef: string) => {
    const itemsSummary = cart.map(item => {
      const options = [item.selectedColor, item.selectedSize].filter(Boolean).join(' / ');
      const optionsText = options ? ` [${options}]` : '';
      return `${item.quantity}x ${item.product.title}${optionsText} (${formatNaira(item.product.price * item.quantity)})`;
    }).join('; ');

    const orderPayload: OrderItem = {
      id: orderId,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim() || 'Pickup at Maiduguri Office',
      notes: orderNotes.trim() || 'Standard print specifications',
      itemsSummary,
      totalAmount,
      status: 'pending',
      paymentStatus: 'paid',
      paymentMethod: 'Paystack',
      paystackReference: paystackRef,
      createdAt: new Date().toISOString()
    };

    try {
      // 1. Save order to Firestore
      const orderRef = doc(db, 'orders', orderId);
      await setDoc(orderRef, orderPayload);
    } catch (err) {
      console.warn("Firestore order record notice:", err);
    }

    // 2. Dispatch automated email notification to enjdigitalconcept@gmail.com
    try {
      await fetch('https://formsubmit.co/ajax/enjdigitalconcept@gmail.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          _subject: `New PAID Paystack Order #${orderId} from ${customerName}`,
          orderId,
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          address: orderPayload.customerAddress,
          items: itemsSummary,
          total: formatNaira(totalAmount),
          paymentStatus: 'PAID via Paystack',
          paystackRef,
          notes: orderPayload.notes,
          _template: 'table',
          _captcha: 'false'
        })
      });
    } catch (e) {
      console.warn("Email dispatch notice:", e);
    }

    setCompletedOrder(orderPayload);
    setIsProcessing(false);
    setShowPaystackFallback(false);
    setStep('success');
    clearCart();
  };

  const getWhatsAppMessageUrl = () => {
    if (!completedOrder) return '';
    const text = `Hello ENJ Digital Concept! I have completed payment for Order #${completedOrder.id} on your store:\n\nCustomer: ${completedOrder.customerName}\nPhone: ${completedOrder.customerPhone}\nItems: ${completedOrder.itemsSummary}\nAmount Paid: ${formatNaira(completedOrder.totalAmount)}\nPaystack Ref: ${completedOrder.paystackReference}\n\nPlease confirm order processing. Thank you!`;
    return `https://wa.me/2348133535756?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      
      {/* Backdrop click */}
      <div className="flex-1" onClick={onClose} />

      {/* Slide-over Drawer Panel */}
      <div className="w-full max-w-sm sm:max-w-md bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-[#f47b20]" />
            <h2 className="font-display text-sm font-bold text-[#1d1d1f]">
              {step === 'cart' && `Shopping Cart (${totalItemCount})`}
              {step === 'checkout' && 'Paystack Checkout'}
              {step === 'success' && 'Payment Confirmed!'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-black transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          
          {/* STEP 1: CART ITEMS */}
          {step === 'cart' && (
            <>
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16">
                  <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-[#f47b20] mb-3">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <h3 className="font-display text-sm font-bold text-[#1d1d1f] mb-1">
                    Your cart is empty
                  </h3>
                  <p className="text-xs text-[#6e6e73] max-w-xs mb-5">
                    Click any product to view pictures, select color or size, and add to cart.
                  </p>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-full bg-[#1d1d1f] hover:bg-[#3a3a3c] text-white text-xs font-semibold"
                  >
                    Browse Products
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item, index) => (
                    <div 
                      key={`${item.product.id}-${index}`}
                      className="flex gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 items-start"
                    >
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.title}
                        className="w-13 h-13 rounded-lg object-cover bg-white shrink-0 border border-gray-200 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-xs text-[#1d1d1f] truncate leading-tight">
                          {item.product.title}
                        </h4>

                        {/* Selected Color & Size Badges */}
                        {(item.selectedColor || item.selectedSize) && (
                          <div className="flex flex-wrap items-center gap-1 my-1">
                            {item.selectedColor && (
                              <span className="bg-white px-1.5 py-0.5 rounded text-[10px] border border-gray-200 text-gray-700 font-medium">
                                Color: <strong className="text-black">{item.selectedColor}</strong>
                              </span>
                            )}
                            {item.selectedSize && (
                              <span className="bg-white px-1.5 py-0.5 rounded text-[10px] border border-gray-200 text-gray-700 font-medium">
                                Size: <strong className="text-black">{item.selectedSize}</strong>
                              </span>
                            )}
                          </div>
                        )}

                        <p className="text-[11px] font-bold text-gray-800 mb-1.5">
                          {formatNaira(item.product.price * item.quantity)}
                          <span className="text-[10px] font-normal text-gray-400 ml-1">
                            ({formatNaira(item.product.price)} each)
                          </span>
                        </p>
                        
                        <div className="flex items-center gap-2">
                          <div className="flex items-center border border-gray-200 rounded-md bg-white">
                            <button
                              onClick={() => updateQuantity(index, item.quantity - 1)}
                              className="p-1 text-gray-500 hover:text-black"
                              title="Decrease"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 text-xs font-bold text-gray-800">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(index, item.quantity + 1)}
                              className="p-1 text-gray-500 hover:text-black"
                              title="Increase"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            onClick={() => removeFromCart(index)}
                            className="p-1 text-red-500 hover:text-red-700 ml-auto"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="pt-1 flex justify-between">
                    <button
                      onClick={clearCart}
                      className="text-[11px] text-gray-400 hover:text-red-600 transition-colors"
                    >
                      Clear all items
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* STEP 2: CHECKOUT FORM */}
          {step === 'checkout' && (
            <form onSubmit={handlePaystackCheckout} className="space-y-3 text-xs">
              {submitError && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Paystack Banner */}
              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-semibold text-emerald-900 text-xs">Paystack Gateway</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                  Cards · Bank · USSD
                </span>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Aliyu Mohammed"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#f47b20] outline-none text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Email Address * (For Paystack Receipt)
                </label>
                <input
                  type="email"
                  required
                  placeholder="aliyu@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#f47b20] outline-none text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Phone / WhatsApp Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+234 813 353 5756"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#f47b20] outline-none text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Delivery / Pickup Address
                </label>
                <input
                  type="text"
                  placeholder="Delivery address in Maiduguri or Thatcher Building Pickup"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#f47b20] outline-none text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Custom Artwork / Order Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Share link to design artwork or mention custom notes..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-gray-200 focus:border-[#f47b20] outline-none text-xs leading-relaxed"
                />
              </div>
            </form>
          )}

          {/* STEP 3: ORDER SUCCESS */}
          {step === 'success' && completedOrder && (
            <div className="h-full flex flex-col items-center justify-center text-center py-6 animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              
              <h3 className="font-display text-xl font-bold text-[#1d1d1f] mb-1">
                Payment Successful!
              </h3>
              
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-mono font-bold mb-3 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ref: {completedOrder.paystackReference}</span>
              </div>

              <p className="text-xs text-[#6e6e73] leading-relaxed max-w-xs mb-4">
                Thank you <strong className="text-black">{completedOrder.customerName}</strong>. Your payment of <strong className="text-black">{formatNaira(completedOrder.totalAmount)}</strong> has been confirmed.
              </p>

              <div className="w-full space-y-2">
                <a
                  href={getWhatsAppMessageUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-full bg-[#25D366] hover:bg-[#20b858] text-white text-xs font-semibold shadow-xs transition-transform hover:scale-105 active:scale-95"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Send WhatsApp Receipt to ENJ</span>
                </a>

                <button
                  onClick={() => {
                    setStep('cart');
                    onClose();
                  }}
                  className="w-full py-2 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-100 text-xs font-semibold transition-colors"
                >
                  Return to Store
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        {step !== 'success' && cart.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50/60">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500 font-medium">Subtotal:</span>
              <span className="font-display text-lg font-bold text-[#1d1d1f]">
                {formatNaira(totalAmount)}
              </span>
            </div>

            {step === 'cart' ? (
              <button
                onClick={() => setStep('checkout')}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-full bg-[#f47b20] hover:bg-[#c95510] text-white text-xs font-semibold tracking-wide shadow-xs transition-all cursor-pointer"
              >
                <span>Proceed to Paystack Checkout</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('cart')}
                  className="px-3.5 py-2 rounded-full border border-gray-200 text-xs font-medium hover:bg-gray-100"
                >
                  Back
                </button>
                <button
                  onClick={handlePaystackCheckout}
                  disabled={isProcessing}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Connecting Paystack…</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Pay {formatNaira(totalAmount)}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Paystack Checkout Fallback Modal */}
      {showPaystackFallback && (
        <div className="fixed inset-0 z-[140] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-gray-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h3 className="font-bold text-xs text-gray-900">Paystack Checkout (Test Mode)</h3>
              </div>
              <button 
                onClick={() => { setShowPaystackFallback(false); setIsProcessing(false); }}
                className="text-gray-400 hover:text-black"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs mb-4">
              <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                <div className="flex justify-between text-gray-500">
                  <span>Merchant:</span>
                  <span className="font-semibold text-black">ENJ Digital Concept</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Customer:</span>
                  <span className="font-semibold text-black">{customerName}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Total Amount:</span>
                  <span className="font-bold text-emerald-600 text-sm">{formatNaira(totalAmount)}</span>
                </div>
              </div>

              <p className="text-[11px] text-gray-500 leading-relaxed">
                Click below to authorize this transaction via Paystack test channel.
              </p>
            </div>

            <button
              onClick={() => {
                const simulatedRef = `pstk_test_${Date.now()}`;
                finalizeOrder(pendingOrderId, simulatedRef);
              }}
              className="w-full py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Simulate Paystack Payment ({formatNaira(totalAmount)})</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
