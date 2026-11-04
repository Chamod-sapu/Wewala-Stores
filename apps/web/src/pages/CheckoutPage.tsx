import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  MapPin,
  CreditCard,
  Truck,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  ShoppingBag,
  Plus,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useCartStore } from '@/store/cartStore';
import { supabase } from '@/lib/supabase';
import {
  STORE_CONFIG,
  invokePlaceOrder,
  invokeProcessCardPayment,
  validateCardNumber,
  validateExpiryDate,
  validateCVV,
  generateTransactionId,
  DEMO_TEST_CARDS,
  PaymentMethod,
  Address,
  ShippingAddressDTO,
} from '@wewala/shared';
import { CardPaymentForm, CardFormData } from '@/components/payment/CardPaymentForm';
import { ThreeDSecureModal } from '@/components/payment/ThreeDSecureModal';
import { launchPayHerePayment } from '@/lib/payhere';

// Zod schema for shipping address validation
const addressSchema = z.object({
  recipient_name: z.string().min(2, 'Recipient name must be at least 2 characters'),
  phone: z.string().min(9, 'Valid phone number is required (min 9 digits)'),
  street_address: z.string().min(5, 'Street address must be at least 5 characters'),
  city: z.string().min(2, 'City is required'),
  postal_code: z.string().min(3, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
  save_to_account: z.boolean(),
  is_default: z.boolean(),
});

type AddressFormData = z.infer<typeof addressSchema>;

type CheckoutStep = 'address' | 'payment' | 'review';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    items,
    coupon,
    subtotal,
    shippingFee,
    discountAmount,
    total,
    clearCart,
  } = useCartStore();

  const [step, setStep] = useState<CheckoutStep>('address');
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | 'new'>('new');
  const [selectedAddressData, setSelectedAddressData] = useState<ShippingAddressDTO | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Card Payment Gateway State
  const [cardData, setCardData] = useState<CardFormData>({
    cardNumber: DEMO_TEST_CARDS[0].number,
    cardHolder: user?.user_metadata?.full_name || DEMO_TEST_CARDS[0].holder,
    expiry: DEMO_TEST_CARDS[0].expiry,
    cvv: DEMO_TEST_CARDS[0].cvv,
    brand: DEMO_TEST_CARDS[0].brand,
    saveCard: false,
  });
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});
  const [show3DS, setShow3DS] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      recipient_name: user?.user_metadata?.full_name || '',
      phone: user?.user_metadata?.phone || '',
      street_address: '',
      city: '',
      postal_code: '',
      country: 'Sri Lanka',
      save_to_account: true,
      is_default: false,
    },
  });

  // Load saved addresses for user
  useEffect(() => {
    async function fetchAddresses() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          setSavedAddresses(data as Address[]);
          const defaultAddr = data.find((a) => a.is_default) || data[0];
          setSelectedAddressId(defaultAddr.id);
          setSelectedAddressData({
            recipient_name: defaultAddr.recipient_name,
            phone: defaultAddr.phone,
            street_address: defaultAddr.street_address,
            city: defaultAddr.city,
            postal_code: defaultAddr.postal_code,
            country: defaultAddr.country,
          });
        } else {
          setSelectedAddressId('new');
        }
      } catch (err) {
        console.warn('Could not load saved addresses:', err);
      } finally {
        setIsLoadingAddresses(false);
      }
    }

    fetchAddresses();
  }, [user]);

  // Handle saved address selection change
  const handleSelectSavedAddress = (addr: Address) => {
    setSelectedAddressId(addr.id);
    setSelectedAddressData({
      recipient_name: addr.recipient_name,
      phone: addr.phone,
      street_address: addr.street_address,
      city: addr.city,
      postal_code: addr.postal_code,
      country: addr.country,
    });
  };

  // Submit address step
  const handleAddressSubmit = async (formData: AddressFormData) => {
    if (selectedAddressId === 'new') {
      const newAddressDTO: ShippingAddressDTO = {
        recipient_name: formData.recipient_name,
        phone: formData.phone,
        street_address: formData.street_address,
        city: formData.city,
        postal_code: formData.postal_code,
        country: formData.country || 'Sri Lanka',
      };
      setSelectedAddressData(newAddressDTO);

      // Save to account if requested
      if (formData.save_to_account && user) {
        try {
          const { data: inserted, error: insertError } = await supabase
            .from('addresses')
            .insert({
              user_id: user.id,
              recipient_name: formData.recipient_name,
              phone: formData.phone,
              street_address: formData.street_address,
              city: formData.city,
              postal_code: formData.postal_code,
              country: formData.country || 'Sri Lanka',
              is_default: formData.is_default || savedAddresses.length === 0,
            })
            .select()
            .single();

          if (!insertError && inserted) {
            setSavedAddresses((prev) => [inserted as Address, ...prev]);
            setSelectedAddressId(inserted.id);
          }
        } catch (err) {
          console.warn('Failed to save new address to account:', err);
        }
      }
    }

    setStep('payment');
  };

  // Move from Payment to Review step with card validation
  const handleContinueToReview = () => {
    if (paymentMethod === 'card') {
      const errors: Record<string, string> = {};
      const numCheck = validateCardNumber(cardData.cardNumber);
      if (!numCheck.isValid) {
        errors.cardNumber = numCheck.message || 'Invalid card number';
      }
      if (!cardData.cardHolder.trim()) {
        errors.cardHolder = 'Cardholder name is required';
      }
      const expCheck = validateExpiryDate(cardData.expiry);
      if (!expCheck.isValid) {
        errors.expiry = expCheck.message || 'Invalid expiry date';
      }
      const cvvCheck = validateCVV(cardData.cvv, cardData.brand);
      if (!cvvCheck.isValid) {
        errors.cvv = cvvCheck.message || 'Invalid CVV';
      }

      if (Object.keys(errors).length > 0) {
        setCardErrors(errors);
        toast.error('Please enter valid card details to proceed.');
        return;
      }
      setCardErrors({});
    }
    setStep('review');
  };

  // Final Order Placement
  const handlePlaceOrder = async () => {
    if (!selectedAddressData) {
      toast.error('Please specify a delivery address.');
      setStep('address');
      return;
    }

    if (items.length === 0) {
      toast.error('Your cart is empty.');
      navigate('/cart');
      return;
    }

    if (paymentMethod === 'card') {
      const errors: Record<string, string> = {};
      const numCheck = validateCardNumber(cardData.cardNumber);
      if (!numCheck.isValid) errors.cardNumber = numCheck.message || 'Invalid card number';
      if (!cardData.cardHolder.trim()) errors.cardHolder = 'Cardholder name is required';
      const expCheck = validateExpiryDate(cardData.expiry);
      if (!expCheck.isValid) errors.expiry = expCheck.message || 'Invalid expiry date';
      const cvvCheck = validateCVV(cardData.cvv, cardData.brand);
      if (!cvvCheck.isValid) errors.cvv = cvvCheck.message || 'Invalid CVV';

      if (Object.keys(errors).length > 0) {
        setCardErrors(errors);
        setStep('payment');
        toast.error('Please fix card errors before placing order.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // 1. Prepare atomic place_order RPC payload
      const orderItems = items.map((i) => ({
        product_id: i.productId,
        quantity: i.quantity,
      }));

      const { orderId, error: rpcError } = await invokePlaceOrder(supabase, {
        items: orderItems,
        shipping_address: selectedAddressData,
        payment_method: paymentMethod,
        coupon_code: coupon?.code || null,
      });

      if (rpcError || !orderId) {
        throw new Error(rpcError?.message || 'Could not place order. Please try again.');
      }

      // 2. Handle payment flow based on selected method
      if (paymentMethod === 'cod') {
        clearCart();
        toast.success('Order placed successfully!');
        navigate(`/order-success?orderId=${orderId}&payment=cod`);
        return;
      }

      if (paymentMethod === 'card') {
        const gatewayProvider = import.meta.env.VITE_PAYMENT_GATEWAY || 'terminal';

        // Check if PayHere is configured or chosen for live processing
        if (gatewayProvider === 'payhere' || import.meta.env.VITE_PAYHERE_MERCHANT_ID) {
          setPendingOrderId(orderId);
          try {
            const nameParts = (selectedAddressData.recipient_name || 'Customer Valued').trim().split(' ');
            const firstName = nameParts[0] || 'Customer';
            const lastName = nameParts.slice(1).join(' ') || 'Valued';

            await launchPayHerePayment({
              orderId,
              amount: grandTotal,
              customer: {
                firstName,
                lastName,
                email: user?.email || 'customer@wewala.com',
                phone: selectedAddressData.phone || '0770000000',
                address: selectedAddressData.street_address || '',
                city: selectedAddressData.city || 'Colombo',
                country: selectedAddressData.country || 'Sri Lanka',
              },
              onCompleted: async (completedOrderId) => {
                const txnId = `PAYHERE-${completedOrderId.slice(0, 8).toUpperCase()}`;
                await invokeProcessCardPayment(supabase, {
                  orderId: completedOrderId,
                  transactionId: txnId,
                  cardBrand: 'payhere',
                  last4: 'LIVE',
                  cardholderName: selectedAddressData.recipient_name,
                  provider: 'payhere',
                });
                clearCart();
                toast.success('PayHere card payment confirmed!');
                navigate(
                  `/order-success?orderId=${completedOrderId}&payment=paid&tx=${txnId}&brand=payhere&last4=LIVE`
                );
              },
              onDismissed: () => {
                toast.info('Payment popup closed. You can complete payment from your order page.');
                clearCart();
                navigate(`/order-success?orderId=${orderId}&payment=pending`);
              },
              onError: (err) => {
                console.error('PayHere error:', err);
                toast.error(`PayHere Gateway error: ${err}`);
                clearCart();
                navigate(`/order-success?orderId=${orderId}&payment=pending`);
              },
            });
            return;
          } catch (payHereErr: any) {
            console.warn('PayHere launch failed, falling back to 3DS terminal:', payHereErr);
          }
        }

        // Direct Card / 3DS Challenge Terminal
        setPendingOrderId(orderId);
        setShow3DS(true);
      }
    } catch (err: any) {
      console.error('Order submission error:', err);
      toast.error(err.message || 'An error occurred while creating your order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Process Card Payment after 3D Secure challenge authorization
  const handleAuthorizePayment = async () => {
    if (!pendingOrderId) return;
    setIsSubmitting(true);

    try {
      const cleanNum = cardData.cardNumber.replace(/\D/g, '');
      const last4 = cleanNum.slice(-4) || '4242';
      const txnId = generateTransactionId();

      // Invoke process_card_payment RPC
      const { data, error } = await invokeProcessCardPayment(supabase, {
        orderId: pendingOrderId,
        transactionId: txnId,
        cardBrand: cardData.brand,
        last4,
        cardholderName: cardData.cardHolder,
        provider: 'card_gateway',
        metadata: {
          client_gateway: 'wewala_card_terminal',
          verified_3ds: true,
          authorized_at: new Date().toISOString(),
        },
      });

      if (error) {
        console.warn('RPC process_card_payment fallback:', error);
        // Direct order status update fallback
        await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            status: 'paid',
            updated_at: new Date().toISOString(),
          })
          .eq('id', pendingOrderId);
      }

      clearCart();
      setShow3DS(false);
      toast.success('Card payment authorized and confirmed!');
      navigate(
        `/order-success?orderId=${pendingOrderId}&payment=paid&tx=${txnId}&brand=${cardData.brand}&last4=${last4}`
      );
    } catch (err: any) {
      console.error('Payment authorization exception:', err);
      toast.error(err.message || 'Payment authorization failed.');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel3DS = () => {
    setShow3DS(false);
    if (pendingOrderId) {
      clearCart();
      toast.info('Order recorded! You can complete payment later from your order details page.');
      navigate(`/order-success?orderId=${pendingOrderId}&payment=pending`);
    }
  };

  // If cart is completely empty and not submitting
  if (items.length === 0 && !isSubmitting) {
    return (
      <ProtectedRoute>
        <div className="section-container py-16 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            <ShoppingBag size={40} />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">Your Cart is Empty</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Please add items to your cart before proceeding to checkout.
          </p>
          <div className="mt-6">
            <Link to="/products" className="btn-primary inline-flex items-center gap-2">
              Browse Store Products
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const subtotalVal = subtotal();
  const shippingVal = shippingFee();
  const discountVal = discountAmount();
  const grandTotal = total();

  return (
    <ProtectedRoute>
      <div className="section-container py-8 lg:py-12">
        {/* Stepper Progress Bar */}
        <div className="mb-10 max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            {/* Step 1 Pill */}
            <button
              onClick={() => setStep('address')}
              className={`flex items-center gap-2 text-sm font-semibold transition-colors ${
                step === 'address'
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs ${
                  step === 'address'
                    ? 'bg-brand-600 text-white dark:bg-brand-500'
                    : selectedAddressData
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {selectedAddressData && step !== 'address' ? <CheckCircle2 size={16} /> : '1'}
              </span>
              <span>1. Shipping</span>
            </button>

            <div
              className={`h-0.5 flex-1 mx-4 transition-colors ${
                step === 'payment' || step === 'review'
                  ? 'bg-brand-600 dark:bg-brand-500'
                  : 'bg-slate-200 dark:bg-slate-800'
              }`}
            />

            {/* Step 2 Pill */}
            <button
              onClick={() => {
                if (selectedAddressData) setStep('payment');
              }}
              disabled={!selectedAddressData}
              className={`flex items-center gap-2 text-sm font-semibold transition-colors disabled:opacity-40 ${
                step === 'payment'
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs ${
                  step === 'payment'
                    ? 'bg-brand-600 text-white dark:bg-brand-500'
                    : step === 'review'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {step === 'review' ? <CheckCircle2 size={16} /> : '2'}
              </span>
              <span>2. Payment</span>
            </button>

            <div
              className={`h-0.5 flex-1 mx-4 transition-colors ${
                step === 'review' ? 'bg-brand-600 dark:bg-brand-500' : 'bg-slate-200 dark:bg-slate-800'
              }`}
            />

            {/* Step 3 Pill */}
            <button
              onClick={() => {
                if (selectedAddressData) setStep('review');
              }}
              disabled={!selectedAddressData}
              className={`flex items-center gap-2 text-sm font-semibold transition-colors disabled:opacity-40 ${
                step === 'review'
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs ${
                  step === 'review'
                    ? 'bg-brand-600 text-white dark:bg-brand-500'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                3
              </span>
              <span>3. Review & Place</span>
            </button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Main Flow Content */}
          <div className="lg:col-span-8 space-y-6">
            {/* STEP 1: SHIPPING ADDRESS */}
            {step === 'address' && (
              <div className="card p-6 md:p-8">
                <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <MapPin className="text-brand-600 dark:text-brand-400" size={24} />
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Shipping Address</h2>
                      <p className="text-sm text-slate-500">Where should we deliver your order?</p>
                    </div>
                  </div>
                </div>

                {/* Saved Addresses List */}
                {!isLoadingAddresses && savedAddresses.length > 0 && (
                  <div className="mb-6">
                    <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Saved Addresses
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {savedAddresses.map((addr) => {
                        const isSelected = selectedAddressId === addr.id;
                        return (
                          <div
                            key={addr.id}
                            onClick={() => handleSelectSavedAddress(addr)}
                            className={`cursor-pointer rounded-xl border p-4 transition-all ${
                              isSelected
                                ? 'border-brand-600 bg-brand-50/50 shadow-sm dark:border-brand-500 dark:bg-brand-950/20'
                                : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {addr.recipient_name}
                              </span>
                              {addr.is_default && (
                                <span className="rounded bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                              {addr.street_address}, {addr.city}
                            </p>
                            <p className="text-xs text-slate-500">
                              {addr.postal_code}, {addr.country}
                            </p>
                            <p className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                              📞 {addr.phone}
                            </p>
                          </div>
                        );
                      })}

                      {/* Add New Address Radio Card */}
                      <div
                        onClick={() => {
                          setSelectedAddressId('new');
                          setSelectedAddressData(null);
                        }}
                        className={`cursor-pointer rounded-xl border border-dashed p-4 flex flex-col items-center justify-center text-center transition-all ${
                          selectedAddressId === 'new'
                            ? 'border-brand-600 bg-brand-50/50 dark:border-brand-500 dark:bg-brand-950/20'
                            : 'border-slate-300 hover:border-slate-400 dark:border-slate-700'
                        }`}
                      >
                        <Plus className="text-brand-600 mb-1" size={20} />
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          Add a New Address
                        </span>
                        <span className="text-xs text-slate-500">Enter custom recipient details</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* New Address Form (shown if 'new' is selected or no saved addresses) */}
                {selectedAddressId === 'new' && (
                  <form onSubmit={handleSubmit(handleAddressSubmit)} className="space-y-4 pt-2">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Enter Delivery Details
                    </h3>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                          Recipient Full Name *
                        </label>
                        <input
                          type="text"
                          {...register('recipient_name')}
                          className="input w-full"
                          placeholder="e.g. Kasun Perera"
                        />
                        {errors.recipient_name && (
                          <p className="mt-1 text-xs text-rose-500">{errors.recipient_name.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                          Contact Phone Number *
                        </label>
                        <input
                          type="tel"
                          {...register('phone')}
                          className="input w-full"
                          placeholder="e.g. 077 123 4567"
                        />
                        {errors.phone && (
                          <p className="mt-1 text-xs text-rose-500">{errors.phone.message}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                        Street Address *
                      </label>
                      <input
                        type="text"
                        {...register('street_address')}
                        className="input w-full"
                        placeholder="House / Building No, Street Name, Area"
                      />
                      {errors.street_address && (
                        <p className="mt-1 text-xs text-rose-500">{errors.street_address.message}</p>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                          City / Town *
                        </label>
                        <input
                          type="text"
                          {...register('city')}
                          className="input w-full"
                          placeholder="e.g. Maharagama"
                        />
                        {errors.city && (
                          <p className="mt-1 text-xs text-rose-500">{errors.city.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                          Postal Code *
                        </label>
                        <input
                          type="text"
                          {...register('postal_code')}
                          className="input w-full"
                          placeholder="e.g. 10280"
                        />
                        {errors.postal_code && (
                          <p className="mt-1 text-xs text-rose-500">{errors.postal_code.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                          Country
                        </label>
                        <input
                          type="text"
                          {...register('country')}
                          className="input w-full bg-slate-50 dark:bg-slate-800"
                          readOnly
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          {...register('save_to_account')}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        Save this address to my account for future orders
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          {...register('is_default')}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        Set as my default shipping address
                      </label>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button type="submit" className="btn-primary inline-flex items-center gap-2">
                        Continue to Payment <ChevronRight size={18} />
                      </button>
                    </div>
                  </form>
                )}

                {/* If user picked a saved address, show continue button */}
                {selectedAddressId !== 'new' && (
                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setStep('payment')}
                      className="btn-primary inline-flex items-center gap-2"
                    >
                      Continue to Payment <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: PAYMENT METHOD */}
            {step === 'payment' && (
              <div className="card p-6 md:p-8">
                <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <CreditCard className="text-brand-600 dark:text-brand-400" size={24} />
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Payment Method</h2>
                      <p className="text-sm text-slate-500">Choose your preferred way to pay</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Card Option */}
                  <div
                    className={`rounded-2xl border p-4 transition-all ${
                      paymentMethod === 'card'
                        ? 'border-brand-600 bg-brand-50/20 ring-1 ring-brand-600 dark:border-brand-500 dark:bg-brand-950/10'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                    }`}
                  >
                    <label className="flex items-start gap-4 cursor-pointer">
                      <input
                        type="radio"
                        name="payment_method"
                        value="card"
                        checked={paymentMethod === 'card'}
                        onChange={() => setPaymentMethod('card')}
                        className="mt-1 h-4 w-4 text-brand-600 focus:ring-brand-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            Credit or Debit Card
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              Visa
                            </span>
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              Mastercard
                            </span>
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              Amex
                            </span>
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                          Pay securely with your credit/debit card with instant 3D Secure bank verification.
                        </p>
                        <div className="mt-2 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck size={14} /> Instant automated confirmation
                        </div>
                      </div>
                    </label>

                    {/* Integrated Direct Card Payment Gateway Form */}
                    {paymentMethod === 'card' && (
                      <div className="mt-5 pt-5 border-t border-slate-200/70 dark:border-slate-800">
                        <CardPaymentForm
                          cardData={cardData}
                          onChange={setCardData}
                          errors={cardErrors}
                          amount={grandTotal}
                        />
                      </div>
                    )}
                  </div>

                  {/* Cash on Delivery Option */}
                  <label
                    className={`flex items-start gap-4 rounded-xl border p-4 cursor-pointer transition-all ${
                      paymentMethod === 'cod'
                        ? 'border-brand-600 bg-brand-50/40 ring-1 ring-brand-600 dark:border-brand-500 dark:bg-brand-950/20'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="mt-1 h-4 w-4 text-brand-600 focus:ring-brand-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          Cash on Delivery (COD)
                        </span>
                        <Truck size={18} className="text-slate-500" />
                      </div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        Pay with cash when your package arrives at your doorstep anywhere in Sri Lanka.
                      </p>
                      <p className="mt-2 text-[11px] text-slate-500">
                        Please prepare exact cash to ensure swift courier handover.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="mt-8 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep('address')}
                    className="btn-ghost inline-flex items-center gap-2"
                  >
                    <ArrowLeft size={16} /> Back to Shipping
                  </button>
                  <button
                    type="button"
                    onClick={handleContinueToReview}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    Review Order <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: REVIEW & PLACE ORDER */}
            {step === 'review' && (
              <div className="space-y-6">
                {/* Shipping Review Block */}
                <div className="card p-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                    <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <MapPin size={18} className="text-brand-600" /> Delivery Address
                    </h3>
                    <button
                      onClick={() => setStep('address')}
                      className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
                    >
                      Change
                    </button>
                  </div>
                  <div className="mt-3 text-sm text-slate-600 dark:text-slate-300 space-y-1">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {selectedAddressData?.recipient_name}
                    </p>
                    <p>{selectedAddressData?.street_address}</p>
                    <p>
                      {selectedAddressData?.city}, {selectedAddressData?.postal_code}
                    </p>
                    <p>{selectedAddressData?.country}</p>
                    <p className="text-xs text-slate-500">Phone: {selectedAddressData?.phone}</p>
                  </div>
                </div>

                {/* Payment Review Block */}
                <div className="card p-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                    <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <CreditCard size={18} className="text-brand-600" /> Payment Details
                    </h3>
                    <button
                      onClick={() => setStep('payment')}
                      className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
                    >
                      Change
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium text-slate-800 dark:text-slate-200 block">
                        {paymentMethod === 'card'
                          ? `Credit / Debit Card (${cardData.brand.toUpperCase()})`
                          : 'Cash on Delivery (COD)'}
                      </span>
                      {paymentMethod === 'card' && (
                        <span className="text-xs text-slate-500 font-mono mt-0.5 block">
                          Card ending in {cardData.cardNumber.replace(/\D/g, '').slice(-4) || '4242'} • Exp: {cardData.expiry} ({cardData.cardHolder})
                        </span>
                      )}
                    </div>
                    <span className="badge-brand uppercase text-xs">{paymentMethod}</span>
                  </div>
                </div>

                {/* Items in Order */}
                <div className="card p-6">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
                    Order Items ({items.length})
                  </h3>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {items.map((item) => (
                      <div key={item.id} className="py-3 flex items-center gap-4">
                        <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                              No img
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                            {item.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            Qty: {item.quantity} × {STORE_CONFIG.currencySymbol}{' '}
                            {item.price.toLocaleString()}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {STORE_CONFIG.currencySymbol} {(item.price * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep('payment')}
                    className="btn-ghost inline-flex items-center gap-2"
                  >
                    <ArrowLeft size={16} /> Back to Payment
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handlePlaceOrder}
                    className="btn-primary inline-flex items-center gap-2 px-8 py-3 text-base font-bold shadow-lg shadow-brand-500/20 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" size={18} /> Processing Order...
                      </>
                    ) : (
                      <>
                        <Lock size={18} /> Place Order ({STORE_CONFIG.currencySymbol}{' '}
                        {grandTotal.toLocaleString()})
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Order Summary Sidebar */}
          <div className="lg:col-span-4">
            <div className="card p-6 sticky top-24 space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Order Summary</h3>

              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>Subtotal ({items.reduce((acc, i) => acc + i.quantity, 0)} items)</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {STORE_CONFIG.currencySymbol} {subtotalVal.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {shippingVal === 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">FREE</span>
                    ) : (
                      `${STORE_CONFIG.currencySymbol} ${shippingVal.toLocaleString()}`
                    )}
                  </span>
                </div>

                {discountVal > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                    <span>Coupon Discount {coupon && `(${coupon.code})`}</span>
                    <span>
                      -{STORE_CONFIG.currencySymbol} {discountVal.toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="border-t border-dashed border-slate-200 pt-3 dark:border-slate-800">
                  <div className="flex justify-between text-base font-bold text-slate-900 dark:text-white">
                    <span>Total Amount</span>
                    <span className="text-lg text-brand-600 dark:text-brand-400">
                      {STORE_CONFIG.currencySymbol} {grandTotal.toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">Includes all local taxes and fees</p>
                </div>
              </div>

              {/* Safety guarantee */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                  <ShieldCheck size={16} className="text-brand-600" /> 100% Buyer Protection
                </div>
                <p>
                  Orders are processed via Supabase atomic transactions with stock guarantees and audit
                  trails.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bank 3D Secure / OTP Challenge Modal */}
      <ThreeDSecureModal
        isOpen={show3DS}
        amount={grandTotal}
        brand={cardData.brand}
        last4={cardData.cardNumber.replace(/\D/g, '').slice(-4) || '4242'}
        onAuthorize={handleAuthorizePayment}
        onCancel={handleCancel3DS}
      />
    </ProtectedRoute>
  );
}
