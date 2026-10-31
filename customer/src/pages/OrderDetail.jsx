import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyOrder, paymentMethodLabel } from '../supabase/orders';
import { formatPrice } from '../utils/money';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OrderDetail() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return undefined;
    if (!user) {
      setOrder(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    getMyOrder(id)
      .then((row) => {
        if (!cancelled) {
          setOrder(row);
          setError(row ? '' : 'This order was not found on your account.');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setOrder(null);
          setError(err.message || 'Could not load this order.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, user, authLoading]);

  if (authLoading || loading) {
    return <p className="status-line">Loading order…</p>;
  }

  if (!user) {
    return (
      <div className="empty">
        <h1>Sign in to see this order</h1>
        <Link className="btn btn-dark" to="/account">Sign in</Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="empty">
        <h1>Order not found</h1>
        <p>{error || 'This order is not linked to your account.'}</p>
        <Link className="btn btn-dark" to="/orders">Back to orders</Link>
      </div>
    );
  }

  return (
    <div className="order-detail">
      <p className="crumb">
        <Link to="/orders">My orders</Link>
        <span>/</span>
        <span>#{order.orderId}</span>
      </p>
      <header className="page-intro">
        <p className="kicker">Order #{order.orderId}</p>
        <h1>{order.status}</h1>
        <p>
          Placed {formatDate(order.createdAt)} · {order.paymentStatus} ·{' '}
          {paymentMethodLabel(order.paymentMethod)}
        </p>
      </header>

      <div className="checkout-grid">
        <div>
          <h2 className="section-title">Items</h2>
          <ul className="bag-list">
            {order.items.map((item) => (
              <li key={item.id}>
                <div className={item.imageUrl ? 'bag-art has-photo' : 'bag-art'}>
                  {item.imageUrl ? <img src={item.imageUrl} alt="" /> : null}
                </div>
                <div className="bag-info">
                  <h2>
                    <Link to={`/product/${item.productId}`}>{item.productName}</Link>
                  </h2>
                  <p className="price">
                    {formatPrice(item.unitPrice)} × {item.quantity}
                  </p>
                </div>
                <p className="line-total">{formatPrice(item.lineTotal)}</p>
              </li>
            ))}
          </ul>
        </div>
        <aside className="summary">
          <h2>Delivery</h2>
          <p className="summary-block">
            {order.customerName}
            <br />
            {order.customerPhone}
            {order.customerEmail ? (
              <>
                <br />
                {order.customerEmail}
              </>
            ) : null}
            <br />
            {order.shippingAddress}
          </p>
          <p><span>Subtotal</span><strong>{formatPrice(order.subtotal)}</strong></p>
          {order.discountTotal > 0 && (
            <p><span>Discount</span><strong>−{formatPrice(order.discountTotal)}</strong></p>
          )}
          <p><span>Total</span><strong>{formatPrice(order.total)}</strong></p>
          <Link className="btn btn-line btn-block" to="/shop">Continue shopping</Link>
        </aside>
      </div>
    </div>
  );
}
