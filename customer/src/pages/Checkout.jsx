import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import LocalAtmOutlinedIcon from '@mui/icons-material/LocalAtmOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Radio from '@mui/material/Radio';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import AppButton from '../mui/components/AppButton';
import AppSelect from '../mui/components/AppSelect';
import AppTextField from '../mui/components/AppTextField';
import {
  MAX_ADDRESSES,
  createAddress,
  defaultAddress,
  listAddresses,
} from '../supabase/addresses';
import { notifyOrder } from '../supabase/notifyOrder';
import { placeOrder } from '../supabase/orders';
import { formatPrice } from '../utils/money';
import { payRazorpayOrder } from '../utils/payOrder';
import { getOrderTotal, getShippingTotal } from '../utils/shipping';

const EMPTY = { name: '', phone: '', email: '', address: '' };

function GPayMark({ size = 28 }) {
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        bgcolor: '#fff',
        color: '#1a73e8',
        display: 'grid',
        placeItems: 'center',
        fontSize: size > 22 ? '0.72rem' : '0.6rem',
        fontWeight: 800,
        letterSpacing: '-0.04em',
      }}
    >
      G
    </Box>
  );
}

const PAYMENT_OPTIONS = [
  {
    value: 'cod',
    title: 'Cash on delivery',
    description: 'Pay in cash when the order arrives. Marked Unpaid until then.',
    icon: <LocalAtmOutlinedIcon />,
  },
  {
    value: 'upi',
    title: 'Google Pay / UPI',
    description: 'Pay with GPay, PhonePe, Paytm, or any UPI app.',
    icon: <GPayMark />,
  },
  {
    value: 'razorpay',
    title: 'Cards, net banking & wallets',
    description: 'Pay now with a card, net banking, or a wallet. UPI is also available.',
    icon: <PaymentsOutlinedIcon />,
  },
];

function isOnlinePayment(choice) {
  return choice === 'upi' || choice === 'razorpay';
}

function storePaymentMethod(choice) {
  return isOnlinePayment(choice) ? 'razorpay' : 'cod';
}

function PaymentCard({ option, selected, onSelect }) {
  return (
    <Paper
      variant="outlined"
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={() => onSelect(option.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(option.value);
        }
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 2,
        minHeight: 92,
        mb: 1.25,
        cursor: 'pointer',
        borderColor: selected ? 'primary.main' : 'divider',
        bgcolor: selected ? '#F3EEE6' : '#FFFFFF',
        boxShadow: selected ? 'inset 0 0 0 1px #1C1917' : 'none',
      }}
    >
      <Radio checked={selected} value={option.value} tabIndex={-1} />
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 2,
          bgcolor: selected ? '#EAE2D6' : '#FAF7F2',
          color: 'secondary.main',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        {option.icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700 }}>{option.title}</Typography>
        <Typography variant="body2">{option.description}</Typography>
      </Box>
    </Paper>
  );
}

function applySavedAddress(row, email = '') {
  if (!row) return null;
  return {
    name: row.recipientName || '',
    phone: row.phone || '',
    email,
    address: row.address || '',
  };
}

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, subtotal, clear } = useCart();
  const [form, setForm] = useState(EMPTY);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [saveAddress, setSaveAddress] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const shipping = getShippingTotal(subtotal);
  const total = getOrderTotal(subtotal);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) {
        setAddresses([]);
        setSelectedAddressId('');
        return;
      }

      setForm((current) => ({
        ...current,
        name: current.name || user.user_metadata?.full_name || '',
        phone: current.phone || user.user_metadata?.phone || '',
        email: current.email || user.email || '',
      }));

      try {
        const rows = await listAddresses();
        if (cancelled) return;
        setAddresses(rows);
        const preferred = defaultAddress(rows);
        if (preferred) {
          setSelectedAddressId(preferred.id);
          setForm((current) => ({
            ...current,
            ...applySavedAddress(preferred, user.email || current.email),
            email: user.email || current.email || '',
          }));
        }
      } catch {
        if (!cancelled) setAddresses([]);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const matchesSelected = useMemo(() => {
    if (!selectedAddressId) return false;
    const row = addresses.find((item) => item.id === selectedAddressId);
    if (!row) return false;
    return (
      form.name.trim() === row.recipientName.trim() &&
      form.phone.trim() === row.phone.trim() &&
      form.address.trim() === row.address.trim()
    );
  }, [addresses, form.address, form.name, form.phone, selectedAddressId]);

  const canSaveNewAddress =
    Boolean(user) &&
    addresses.length < MAX_ADDRESSES &&
    !matchesSelected &&
    form.name.trim() &&
    form.phone.trim() &&
    form.address.trim();

  if (items.length === 0) {
    return (
      <div className="empty">
        <h1>Nothing to check out</h1>
        <p>Add a piece to your bag first.</p>
        <AppButton component={Link} to="/shop">Shop jewellery</AppButton>
      </div>
    );
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    if (field === 'name' || field === 'phone' || field === 'address') {
      setSelectedAddressId('');
    }
  }

  function onPickAddress(event) {
    const id = event.target.value;
    setSelectedAddressId(id);
    setSaveAddress(false);
    if (!id) return;
    const row = addresses.find((item) => item.id === id);
    if (!row) return;
    setForm((current) => ({
      ...current,
      ...applySavedAddress(row, user?.email || current.email),
      email: user?.email || current.email || '',
    }));
  }

  function buildSnapshot(orderId, method, paymentStatus) {
    return {
      orderId,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      paymentMethod: method,
      paymentStatus,
      subtotal,
      shippingTotal: shipping,
      total,
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        qty: item.qty,
        price: item.price,
      })),
    };
  }

  async function maybeSaveAddress() {
    if (!saveAddress || !canSaveNewAddress) return;
    try {
      await createAddress({
        label: 'Checkout',
        recipientName: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        isDefault: addresses.length === 0,
      });
    } catch {
      // Order already placed; do not block confirmation on address save failure.
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      setError('Name, phone, and address are required.');
      return;
    }
    const online = isOnlinePayment(paymentMethod);
    if (online && !user) {
      setError('Sign in to pay online with Google Pay, UPI, or a card.');
      return;
    }
    if (online && !form.email.trim()) {
      setError('Email is required for online payment.');
      return;
    }

    setBusy(true);
    let placedOrderId = null;
    try {
      const orderId = await placeOrder({
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        paymentMethod: storePaymentMethod(paymentMethod),
        items: items.map((item) => ({
          productId: item.id,
          quantity: item.qty,
        })),
      });
      placedOrderId = orderId;
      await maybeSaveAddress();

      if (!online) {
        await notifyOrder(orderId, 'placed');
        clear();
        navigate(`/order/${orderId}/confirmation`, {
          replace: true,
          state: { order: buildSnapshot(orderId, 'cod', 'Unpaid') },
        });
        return;
      }

      await payRazorpayOrder(orderId, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        preferredMethod: paymentMethod === 'upi' ? 'upi' : 'all',
      });

      clear();
      navigate(`/order/${orderId}/confirmation`, {
        replace: true,
        state: { order: buildSnapshot(orderId, 'razorpay', 'Paid') },
      });
    } catch (err) {
      if (err?.code === 'payment_cancelled' && placedOrderId) {
        setError(
          user
            ? `Order #${placedOrderId} is saved as Unpaid. Open My Orders and tap Pay when you are ready.`
            : `Order #${placedOrderId} was created but payment was not completed. Sign in before checkout next time so you can pay from My Orders, or contact the store.`,
        );
      } else {
        setError(err.message || 'Could not place the order.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="checkout">
      <header className="page-intro">
        <p className="kicker">Checkout</p>
        <h1>Delivery details</h1>
        <p>
          {user ? (
            <>
              Use a saved address or enter a new one.{' '}
              <Link to="/account">Manage addresses</Link>
            </>
          ) : (
            <>Guests can place an order. Sign in to use saved addresses and track My Orders.</>
          )}
        </p>
      </header>
      <div className="checkout-grid">
        <Box component="form" onSubmit={onSubmit} sx={{ display: 'grid', gap: 2 }}>
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Delivery</Typography>
            <Box sx={{ display: 'grid', gap: 1.5 }}>
              {addresses.length > 0 && (
                <AppSelect
                  label="Deliver to"
                  value={selectedAddressId}
                  onChange={onPickAddress}
                  placeholder="Enter a new address"
                  options={addresses.map((row) => ({
                    value: row.id,
                    label: `${row.label}${row.isDefault ? ' (default)' : ''} — ${row.recipientName}`,
                  }))}
                />
              )}

              <AppTextField
                label="Full name"
                value={form.name}
                onChange={(event) => update('name', event.target.value)}
                autoComplete="name"
              />
              <AppTextField
                label="Phone"
                value={form.phone}
                onChange={(event) => update('phone', event.target.value)}
                autoComplete="tel"
              />
              <AppTextField
                type="email"
                label="Email"
                value={form.email}
                onChange={(event) => update('email', event.target.value)}
                autoComplete="email"
              />
              <AppTextField
                label="Address"
                multiline
                minRows={4}
                value={form.address}
                onChange={(event) => update('address', event.target.value)}
              />

              {canSaveNewAddress && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={saveAddress}
                      onChange={(event) => setSaveAddress(event.target.checked)}
                    />
                  }
                  label="Save this address to my account"
                />
              )}
            </Box>
          </Paper>

          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 700 }}>Payment</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Choose one method. Google Pay and other UPI apps open in the Razorpay window.
            </Typography>
            <Box role="radiogroup" aria-label="Payment method">
              {PAYMENT_OPTIONS.map((option) => (
                <PaymentCard
                  key={option.value}
                  option={option}
                  selected={paymentMethod === option.value}
                  onSelect={setPaymentMethod}
                />
              ))}
            </Box>
            {isOnlinePayment(paymentMethod) ? (
              <Box sx={{ mt: 0.5, p: 2, borderRadius: 2, bgcolor: '#FAF7F2', border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" sx={{ mb: 1.25 }}>
                  {paymentMethod === 'upi'
                    ? 'After you tap Pay now, Razorpay opens on UPI. On a phone, Google Pay appears as an app. On a computer, scan the QR with Google Pay.'
                    : 'After you tap Pay now, Razorpay lets you complete payment with:'}
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                  <Chip size="small" icon={<GPayMark size={18} />} label="Google Pay" variant="outlined" />
                  <Chip size="small" icon={<QrCode2OutlinedIcon />} label="UPI QR" variant="outlined" />
                  {paymentMethod !== 'upi' ? (
                    <>
                      <Chip size="small" icon={<CreditCardOutlinedIcon />} label="Credit / Debit card" variant="outlined" />
                      <Chip size="small" icon={<AccountBalanceWalletOutlinedIcon />} label="Wallet" variant="outlined" />
                      <Chip size="small" icon={<PaymentsOutlinedIcon />} label="Net banking" variant="outlined" />
                    </>
                  ) : (
                    <>
                      <Chip size="small" label="PhonePe" variant="outlined" />
                      <Chip size="small" label="Paytm" variant="outlined" />
                    </>
                  )}
                </Stack>
              </Box>
            ) : (
              <Alert severity="info" sx={{ mt: 0.5 }}>
                No payment is collected now. Pay the courier when your order is delivered.
              </Alert>
            )}
          </Paper>

          {error ? <Alert severity="error">{error}</Alert> : null}
          <AppButton type="submit" loading={busy} disabled={busy}>
            {busy
              ? isOnlinePayment(paymentMethod)
                ? 'Opening payment…'
                : 'Placing order…'
              : isOnlinePayment(paymentMethod)
                ? 'Pay now'
                : 'Place order'}
          </AppButton>
        </Box>
        <aside className="summary">
          <h2>Your bag</h2>
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <span>{item.name} × {item.qty}</span>
                <strong>{formatPrice(item.price * item.qty)}</strong>
              </li>
            ))}
          </ul>
          <p><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></p>
          <p>
            <span>Shipping</span>
            <strong>{shipping <= 0 ? 'Free' : formatPrice(shipping)}</strong>
          </p>
          <p><span>Total</span><strong>{formatPrice(total)}</strong></p>
          <p>
            <span>Payment</span>
            <strong>
              {paymentMethod === 'upi' ? 'Google Pay / UPI' : paymentMethod === 'razorpay' ? 'Online' : 'COD'}
            </strong>
          </p>
        </aside>
      </div>
    </div>
  );
}
