import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import ProductCard from '../components/ProductCard';
import { useCatalog } from '../context/CatalogContext';
import { categoriesFor } from '../data/catalog';
import { searchProducts } from '../utils/search';
import AppButton from '../mui/components/AppButton';
import AppSelect from '../mui/components/AppSelect';

const SORTS = [
  { value: 'featured', label: 'Newest', searchLabel: 'Best match' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name' },
];

export default function Shop() {
  const { products: catalog, loading, error } = useCatalog();
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || '';
  const query = (params.get('q') || '').trim();
  const sort = params.get('sort') || 'featured';
  const categories = categoriesFor(catalog);

  const products = useMemo(() => {
    const inCategory = category
      ? catalog.filter((product) => product.category === category)
      : catalog;
    const next = [...searchProducts(inCategory, query)];
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

      <Stack
        className="shop-toolbar"
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{
          mb: 3,
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
        }}
      >
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <Chip
            component={Link}
            to={query ? `/shop?q=${encodeURIComponent(query)}` : '/shop'}
            clickable
            color={category ? 'default' : 'primary'}
            variant={category ? 'outlined' : 'filled'}
            label="All"
          />
          {categories.map((item) => {
            const next = new URLSearchParams();
            next.set('category', item.name);
            if (query) next.set('q', query);
            if (sort !== 'featured') next.set('sort', sort);
            const selected = category === item.name;
            return (
              <Chip
                key={item.name}
                component={Link}
                to={`/shop?${next.toString()}`}
                clickable
                color={selected ? 'primary' : 'default'}
                variant={selected ? 'filled' : 'outlined'}
                label={item.name}
              />
            );
          })}
        </Stack>
        <AppSelect
          label="Sort"
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          sx={{ minWidth: 220, width: { xs: '100%', sm: 240 } }}
        >
          {SORTS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {query && option.searchLabel ? option.searchLabel : option.label}
            </MenuItem>
          ))}
        </AppSelect>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
          <CircularProgress size={28} />
        </Box>
      ) : error ? (
        <div className="empty">
          <h2>The collection could not load</h2>
          <Alert severity="error">{error}</Alert>
        </div>
      ) : products.length === 0 ? (
        <div className="empty">
          <h2>{catalog.length === 0 ? 'Sign in to load the catalog' : 'Nothing matches that yet'}</h2>
          <p>
            {catalog.length === 0
              ? 'Sign in with the same email and password as the admin page. The products load with that account.'
              : 'Try another word, or browse the full collection.'}
          </p>
          <AppButton component={Link} to={catalog.length === 0 ? '/account' : '/shop'}>
            {catalog.length === 0 ? 'Sign in' : 'Clear filters'}
          </AppButton>
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
