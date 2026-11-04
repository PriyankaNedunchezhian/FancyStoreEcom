import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import CategoryMark from '../components/CategoryMark';
import ProductCard from '../components/ProductCard';
import { useCart } from '../context/CartContext';
import { useCatalog } from '../context/CatalogContext';
import { useWishlist } from '../context/WishlistContext';
import { isInStock } from '../data/catalog';
import AppButton from '../mui/components/AppButton';
import AppQtyControl from '../mui/components/AppQtyControl';
import { getActiveProduct } from '../supabase/products';
import { discountPercent, formatPrice } from '../utils/money';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, getById, loading: catalogLoading } = useCatalog();
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();
  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState('loading');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const cached = getById(id);
    if (cached) {
      setProduct(cached);
      setPhotoIndex(0);
      setQty(1);
      setStatus('ready');
      return undefined;
    }
    if (catalogLoading) return undefined;

    setStatus('loading');
    getActiveProduct(id)
      .then((row) => {
        if (cancelled) return;
        setProduct(row);
        setPhotoIndex(0);
        setQty(1);
        setStatus(row ? 'ready' : 'missing');
      })
      .catch(() => {
        if (!cancelled) setStatus('missing');
      });

    return () => {
      cancelled = true;
    };
  }, [id, products, catalogLoading, getById]);

  if (status === 'loading') {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!product) {
    return (
      <div className="empty">
        <h1>This piece is not in the collection</h1>
        <p>It may be inactive, or it was removed from the catalog.</p>
        <AppButton component={Link} to="/shop">Back to shop</AppButton>
      </div>
    );
  }

  const inStock = isInStock(product);
  const off = discountPercent(product.mrp, product.sellingPrice);
  const wished = has(product.id);
  const photos = product.imageUrls?.length ? product.imageUrls : [];
  const photo = photos[photoIndex] || product.imageUrl;
  const related = products
    .filter((item) => item.category === product.category && item.id !== product.id)
    .slice(0, 3);

  function onAdd() {
    if (!inStock) return;
    addItem(product, qty);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  }

  async function onWish() {
    const result = await toggle(product);
    if (result?.needsAuth) navigate('/account');
  }

  return (
    <div className="detail">
      <Breadcrumbs className="crumb" sx={{ mb: 2 }}>
        <Link to="/shop">Shop</Link>
        <Link to={`/shop?category=${encodeURIComponent(product.category)}`}>{product.category}</Link>
      </Breadcrumbs>
      <div className="detail-grid">
        <div>
          <div className={photo ? 'detail-visual has-photo' : 'detail-visual'} data-category={product.category}>
            {photo ? <img src={photo} alt="" /> : <CategoryMark category={product.category} />}
          </div>
          {photos.length > 1 && (
            <div className="photo-thumbs">
              {photos.map((src, index) => (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  className={index === photoIndex ? 'on' : ''}
                  onClick={() => setPhotoIndex(index)}
                  aria-label={`Photo ${index + 1}`}
                >
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="detail-copy">
          <p className="kicker">{product.category}</p>
          <h1>{product.name}</h1>
          <p className="price detail-price">
            {off > 0 && <s>{formatPrice(product.mrp)}</s>}
            <span>{formatPrice(product.sellingPrice)}</span>
            {off > 0 && <span className="off">{off}% off</span>}
          </p>
          {product.description && <p className="lede">{product.description}</p>}
          <dl className="specs">
            <div><dt>Colour</dt><dd>{product.colour || '—'}</dd></div>
            <div><dt>Material</dt><dd>{product.material || '—'}</dd></div>
            <div><dt>Size</dt><dd>{product.size || '—'}</dd></div>
            <div><dt>Stock</dt><dd>{product.stockStatus}</dd></div>
            {product.brand && <div><dt>Brand</dt><dd>{product.brand}</dd></div>}
            {product.weight && <div><dt>Weight</dt><dd>{product.weight}</dd></div>}
            <div><dt>Returns</dt><dd>{product.returnEligibility}</dd></div>
            <div><dt>Available</dt><dd>{product.availableQuantity}</dd></div>
          </dl>
          <div className="buy-row">
            <AppQtyControl
              value={qty}
              onDecrease={() => setQty((value) => Math.max(1, value - 1))}
              onIncrease={() => setQty((value) => value + 1)}
            />
            <AppButton onClick={onAdd} disabled={!inStock}>
              {!inStock ? 'Out of stock' : added ? 'Added to bag' : 'Add to bag'}
            </AppButton>
            <IconButton
              className={wished ? 'wish-inline on' : 'wish-inline'}
              aria-pressed={wished}
              aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}
              onClick={onWish}
            >
              {wished ? <FavoriteIcon /> : <FavoriteBorderIcon />}
            </IconButton>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>More in {product.category}</h2>
          </div>
          <div className="product-grid">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
