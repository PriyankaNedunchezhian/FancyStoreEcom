import { Link } from 'react-router-dom';
import CategoryMark from '../components/CategoryMark';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/money';
import { FREE_SHIPPING_MIN, getOrderTotal, getShippingTotal } from '../utils/shipping';

export default function Cart() {
  const { items, subtotal, setQty, removeItem } = useCart();
  const shipping = getShippingTotal(subtotal);
  const total = getOrderTotal(subtotal);
  const toFree = Math.max(0, FREE_SHIPPING_MIN - subtotal);

  if (items.length === 0) {
    return (
      <div className="empty">
        <h1>Your bag is empty</h1>
        <p>Add a piece from the collection and it will wait here.</p>
        <Link className="btn btn-dark" to="/shop">Shop jewellery</Link>
      </div>
    );
  }

  return (
    <div className="bag">
      <header className="page-intro">
        <p className="kicker">Bag</p>
        <h1>Your bag</h1>
      </header>
      <div className="bag-layout">
        <ul className="bag-list">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                className={item.imageUrl ? 'bag-art has-photo' : 'bag-art'}
                to={`/product/${item.id}`}
                aria-hidden="true"
                tabIndex={-1}
              >
                {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <CategoryMark category={item.category} />}
              </Link>
              <div className="bag-info">
                <p className="product-category">{item.category}</p>
                <h2><Link to={`/product/${item.id}`}>{item.name}</Link></h2>
                <p className="price">{formatPrice(item.price)}</p>
                <div className="bag-actions">
                  <div className="qty">
                    <button type="button" onClick={() => setQty(item.id, item.qty - 1)} aria-label={`Decrease ${item.name}`}>−</button>
                    <span>{item.qty}</span>
                    <button type="button" onClick={() => setQty(item.id, item.qty + 1)} aria-label={`Increase ${item.name}`}>+</button>
                  </div>
                  <button type="button" className="text-btn" onClick={() => removeItem(item.id)}>
                    Remove
                  </button>
                </div>
              </div>
              <p className="line-total">{formatPrice(item.price * item.qty)}</p>
            </li>
          ))}
        </ul>
        <aside className="summary">
          <h2>Summary</h2>
          <p><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></p>
          <p>
            <span>Shipping</span>
            <strong>{shipping <= 0 ? 'Free' : formatPrice(shipping)}</strong>
          </p>
          <p><span>Total</span><strong>{formatPrice(total)}</strong></p>
          {toFree > 0 ? (
            <p className="summary-note">
              Add {formatPrice(toFree)} more for complimentary shipping.
            </p>
          ) : (
            <p className="summary-note">Complimentary shipping applied.</p>
          )}
          <Link className="btn btn-dark btn-block" to="/checkout">Checkout</Link>
          <Link className="text-link" to="/shop">Continue shopping</Link>
        </aside>
      </div>
    </div>
  );
}
