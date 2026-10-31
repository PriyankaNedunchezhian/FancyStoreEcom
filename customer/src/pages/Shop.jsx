import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { useCatalog } from '../context/CatalogContext';
import { categoriesFor } from '../data/catalog';

const SORTS = [
  { id: 'featured', label: 'Newest' },
  { id: 'price-asc', label: 'Price: low to high' },
  { id: 'price-desc', label: 'Price: high to low' },
  { id: 'name', label: 'Name' },
];

export default function Shop() {
  const { products: catalog, loading, error } = useCatalog();
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || '';
  const query = (params.get('q') || '').trim();
  const sort = params.get('sort') || 'featured';
  const categories = categoriesFor(catalog);

  const products = useMemo(() => {
    const needle = query.toLowerCase();
    const filtered = catalog.filter((product) => {
      if (category && product.category !== category) return false;
      if (!needle) return true;
      const haystack = [product.name, product.category, product.colour, product.material, product.brand]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });

    const next = [...filtered];
    if (sort === 'price-asc') next.sort((a, b) => a.sellingPrice - b.sellingPrice);
    if (sort === 'price-desc') next.sort((a, b) => b.sellingPrice - a.sellingPrice);
    if (sort === 'name') next.sort((a, b) => a.name.localeCompare(b.name));
    return next;
  }, [catalog, category, query, sort]);

  function setSort(value) {
    const next = new URLSearchParams(params);
    if (value === 'featured') next.delete('sort');
    else next.set('sort', value);
    setParams(next);
  }

  const title = category || (query ? 'Search' : 'All jewellery');

  return (
    <div className="shop">
      <header className="page-intro">
        <p className="kicker">Collection</p>
        <h1>{title}</h1>
        <p>
          {loading
            ? 'Loading pieces…'
            : `${products.length} ${products.length === 1 ? 'piece' : 'pieces'}${query ? ` for “${query}”` : ''}`}
        </p>
      </header>

      <div className="shop-toolbar">
        <div className="pills" role="list">
          <Link className={category ? 'pill' : 'pill on'} to={query ? `/shop?q=${encodeURIComponent(query)}` : '/shop'}>
            All
          </Link>
          {categories.map((item) => {
            const next = new URLSearchParams();
            next.set('category', item.name);
            if (query) next.set('q', query);
            if (sort !== 'featured') next.set('sort', sort);
            return (
              <Link
                key={item.name}
                className={category === item.name ? 'pill on' : 'pill'}
                to={`/shop?${next.toString()}`}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
        <label className="sort">
          <span>Sort</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            {SORTS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p className="status-line">Loading the collection…</p>
      ) : error ? (
        <div className="empty">
          <h2>The collection could not load</h2>
          <p>{error}</p>
        </div>
      ) : products.length === 0 ? (
        <div className="empty">
          <h2>{catalog.length === 0 ? 'Sign in to load the catalog' : 'Nothing matches that yet'}</h2>
          <p>
            {catalog.length === 0
              ? 'Sign in with the same email and password as the admin page. The products load with that account.'
              : 'Try another word, or browse the full collection.'}
          </p>
          <Link className="btn btn-dark" to={catalog.length === 0 ? '/account' : '/shop'}>
            {catalog.length === 0 ? 'Sign in' : 'Clear filters'}
          </Link>
        </div>
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
