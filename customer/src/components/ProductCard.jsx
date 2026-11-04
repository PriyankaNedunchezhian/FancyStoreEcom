import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import CategoryMark from './CategoryMark';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { isInStock } from '../data/catalog';
import AppButton from '../mui/components/AppButton';
import { discountPercent, formatPrice } from '../utils/money';

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();
  const [added, setAdded] = useState(false);
  const [savingWish, setSavingWish] = useState(false);
  const wished = has(product.id);
  const inStock = isInStock(product);
  const off = discountPercent(product.mrp, product.sellingPrice);
  const photo = product.imageUrl;

  function onAdd() {
    if (!inStock) return;
    addItem(product, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  }

  async function onWish() {
    setSavingWish(true);
    try {
      const result = await toggle(product);
      if (result?.needsAuth) navigate('/account');
    } finally {
      setSavingWish(false);
    }
  }

  return (
    <article className="product-card">
      <div className="product-visual-wrap">
        <Link
          className={photo ? 'product-visual has-photo' : 'product-visual'}
          data-category={product.category}
          to={`/product/${product.id}`}
        >
          {photo ? <img src={photo} alt="" /> : <CategoryMark category={product.category} />}
          {!inStock && <Chip size="small" color="error" label="Out of stock" className="stock-pill" />}
        </Link>
        <IconButton
          className={wished ? 'wish on' : 'wish'}
          aria-label={wished ? `Remove ${product.name} from wishlist` : `Save ${product.name}`}
          aria-pressed={wished}
          disabled={savingWish}
          onClick={onWish}
          size="small"
        >
          {wished ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
        </IconButton>
      </div>
      <div className="product-body">
        <p className="product-category">{product.category}</p>
        <h3>
          <Link to={`/product/${product.id}`}>{product.name}</Link>
        </h3>
        <p className="price">
          {off > 0 && <s>{formatPrice(product.mrp)}</s>}
          <span>{formatPrice(product.sellingPrice)}</span>
          {off > 0 && <span className="off">{off}% off</span>}
        </p>
        <AppButton variant="outlined" className="card-add" onClick={onAdd} disabled={!inStock} fullWidth>
          {!inStock ? 'Out of stock' : added ? 'Added' : 'Add to bag'}
        </AppButton>
      </div>
    </article>
  );
}
