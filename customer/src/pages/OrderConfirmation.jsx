import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { paymentMethodLabel } from '../supabase/orders';
import { formatPrice } from '../utils/money';

export default function OrderConfirmation() {
  const { id } = useParams();
  const { state } = useLocation();
  const { user } = useAuth();
  const order = state?.order;
  const orderId = order?.orderId || id;

  return (
    <div className="confirm-page">
      <header className="page-intro">
        <p className="kicker">Order placed</p>
        <h1>Thank you</h1>
        <p>
          Your order <strong>#{orderId}</strong> is Pending. Payment is cash on delivery
          ({paymentMethodLabel(order?.paymentMethod || 'cod')}).
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
          <p><span>Total</span><strong>{formatPrice(order.total ?? order.subtotal)}</strong></p>
          {order.address && (
            <p className="summary-note">
              Deliver to {order.name}, {order.address}
              {order.phone ? ` · ${order.phone}` : ''}
            </p>
          )}
        </aside>
      )}

      <div className="hero-actions">
        <Link className="btn btn-dark" to="/shop">Continue shopping</Link>
        {user ? (
          <Link className="btn btn-line" to={`/orders/${orderId}`}>View order</Link>
        ) : (
          <Link className="btn btn-line" to="/account">Sign in to track orders</Link>
        )}
      </div>
    </div>
  );
}
