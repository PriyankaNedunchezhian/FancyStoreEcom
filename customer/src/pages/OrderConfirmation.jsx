import { Link, useLocation, useParams } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import { useAuth } from '../context/AuthContext';
import AppButton from '../mui/components/AppButton';
import { paymentMethodLabel } from '../supabase/orders';
import { formatPrice } from '../utils/money';
import { getOrderTotal, getShippingTotal } from '../utils/shipping';

export default function OrderConfirmation() {
  const { id } = useParams();
  const { state } = useLocation();
  const { user } = useAuth();
  const order = state?.order;
  const orderId = order?.orderId || id;
  const method = order?.paymentMethod || 'cod';
  const paymentStatus = order?.paymentStatus || (method === 'razorpay' ? 'Paid' : 'Unpaid');
  const isOnlinePaid = method === 'razorpay' && paymentStatus === 'Paid';
  const subtotal = Number(order?.subtotal ?? 0);
  const shippingTotal =
    order?.shippingTotal != null ? Number(order.shippingTotal) : getShippingTotal(subtotal);
  const total =
    order?.total != null ? Number(order.total) : getOrderTotal(subtotal);

  return (
    <div className="confirm-page">
      <header className="page-intro">
        <p className="kicker">Order placed</p>
        <h1>Thank you</h1>
        <p>
          {isOnlinePaid ? (
            <>
              Your order <strong>#{orderId}</strong> is Pending and payment is{' '}
              <strong>Paid</strong> via {paymentMethodLabel(method)}.
            </>
          ) : (
            <>
              Your order <strong>#{orderId}</strong> is Pending. Payment is{' '}
              {paymentMethodLabel(method)}.
            </>
          )}
        </p>
      </header>

      {order?.items?.length > 0 && (
        <aside className="summary confirm-summary">
          <h2>Summary</h2>
          <ul>
            {order.items.map((item) => (
              <li key={item.id}>
                <span>{item.name} × {item.qty}</span>
                <strong>{formatPrice(item.price * item.qty)}</strong>
              </li>
            ))}
          </ul>
          <p><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></p>
          <p>
            <span>Shipping</span>
            <strong>{shippingTotal <= 0 ? 'Free' : formatPrice(shippingTotal)}</strong>
          </p>
          <p><span>Total</span><strong>{formatPrice(total)}</strong></p>
          <p>
            <span>Payment</span>
            <strong>
              {paymentMethodLabel(method)}
              {paymentStatus ? ` · ${paymentStatus}` : ''}
            </strong>
          </p>
          {order.address && (
            <p className="summary-note">
              Deliver to {order.name}, {order.address}
              {order.phone ? ` · ${order.phone}` : ''}
            </p>
          )}
        </aside>
      )}

      <Stack className="hero-actions" direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <AppButton component={Link} to="/shop">Continue shopping</AppButton>
        {user ? (
          <AppButton variant="outlined" component={Link} to={`/orders/${orderId}`}>View order</AppButton>
        ) : (
          <AppButton variant="outlined" component={Link} to="/account">Sign in to track orders</AppButton>
        )}
      </Stack>
    </div>
  );
}
