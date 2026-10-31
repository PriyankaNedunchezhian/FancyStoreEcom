import { Link } from 'react-router-dom';
import { RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';
import CategoryMark from '../components/CategoryMark';
import ProductCard from '../components/ProductCard';
import { useCatalog } from '../context/CatalogContext';
import { categoriesFor } from '../data/catalog';

const NOTES = [
  { icon: Sparkles, title: 'Daily pieces', text: 'Studs, chains, and bangles from the store catalog.' },
  { icon: RotateCcw, title: 'Easy returns', text: 'Returnable pieces use the same flag as in admin.' },
  { icon: ShieldCheck, title: 'A clear bag', text: 'Prices, sizes, and stock come from the product record.' },
];

export default function Home() {
  const { products, loading, error } = useCatalog();
  const featured = products.slice(0, 4);
  const categories = categoriesFor(products);

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-copy">
          <p className="kicker">New in the studio</p>
          <h1>Jewellery that belongs in the everyday.</h1>
          <p className="lede">
            Earrings, necklaces, bangles, rings, and chains — the same active pieces you keep in admin.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-dark" to="/shop">Shop the collection</Link>
            <Link className="btn btn-line" to="/shop?category=Earrings">Earrings</Link>
          </div>
        </div>
        <div className="hero-stage" aria-hidden="true">
          <div className="hero-card hero-card-a">
            <CategoryMark category="Necklace" />
            <span>Necklaces</span>
          </div>
          <div className="hero-card hero-card-b">
            <CategoryMark category="Earrings" />
            <span>Earrings</span>
          </div>
          <div className="hero-card hero-card-c">
            <CategoryMark category="Bangles" />
            <span>Bangles</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Shop by category</h2>
          <Link to="/shop">View all</Link>
        </div>
        <div className="category-grid">
          {categories.map((category) => (
            <Link
              key={category.name}
              className="category-tile"
              to={`/shop?category=${encodeURIComponent(category.name)}`}
            >
              <CategoryMark category={category.name} />
              <span>
                <strong>{category.name}</strong>
                <small>{category.line}</small>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Featured</h2>
          <Link to="/shop">See the full edit</Link>
        </div>
        {loading ? (
          <p className="status-line">Loading the collection…</p>
        ) : error ? (
          <div className="empty">
            <h2>The collection could not load</h2>
            <p>{error}</p>
          </div>
        ) : featured.length === 0 ? (
          <div className="empty">
            <h2>Sign in to load the catalog</h2>
            <p>Use the same email and password as the admin page. The products appear after that sign-in.</p>
            <Link className="btn btn-dark" to="/account">Sign in</Link>
          </div>
        ) : (
          <div className="product-grid">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <section className="notes">
        {NOTES.map((note) => (
          <article key={note.title}>
            <note.icon size={18} aria-hidden="true" />
            <h3>{note.title}</h3>
            <p>{note.text}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
