import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import LinkIcon from '@mui/icons-material/Link';
import SearchIcon from '@mui/icons-material/Search';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CategoryMark from './CategoryMark';
import { useCatalog } from '../context/CatalogContext';
import { categoriesFor } from '../data/catalog';
import { formatPrice } from '../utils/money';
import { searchCategories, searchPages, searchProducts } from '../utils/search';

const MAX_PRODUCTS = 6;
const MAX_CATEGORIES = 3;

const GROUP_LABELS = {
  product: 'Products',
  category: 'Categories',
  page: 'Your store',
  all: '',
};

function shopSearchPath(query) {
  return query ? `/shop?q=${encodeURIComponent(query)}` : '/shop';
}

function OptionThumb({ option }) {
  const frame = {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: 1.5,
    border: 1,
    borderColor: 'divider',
    bgcolor: 'var(--tint)',
    color: 'secondary.main',
    display: 'grid',
    placeItems: 'center',
    overflow: 'hidden',
  };

  if (option.type === 'product') {
    return (
      <Box sx={frame}>
        {option.imageUrl ? (
          <Box component="img" src={option.imageUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Box sx={{ width: 34, height: 34, '& svg': { width: '100%', height: '100%' } }}>
            <CategoryMark category={option.category} />
          </Box>
        )}
      </Box>
    );
  }

  const Icon = option.type === 'category' ? CategoryOutlinedIcon : option.type === 'page' ? LinkIcon : ArrowForwardIcon;
  return (
    <Box sx={frame}>
      <Icon fontSize="small" />
    </Box>
  );
}

export default function SiteSearch({ autoFocus = false, inline = false, onNavigate }) {
  const { products, loading } = useCatalog();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const inputRef = useRef(null);
  const urlQuery = location.pathname === '/shop' ? params.get('q') || '' : '';
  const [input, setInput] = useState(urlQuery);

  useEffect(() => {
    setInput(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    if (inline) return undefined;
    function onKey(event) {
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if (event.key === '/' && !typing) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inline]);

  const query = input.trim();

  const options = useMemo(() => {
    if (!query) return [];

    const productMatches = searchProducts(products, query);
    const productOptions = productMatches.slice(0, MAX_PRODUCTS).map((product) => ({
      type: 'product',
      key: `product-${product.id}`,
      label: product.name,
      sub: [product.category, product.colour, product.material].filter(Boolean).join(' · '),
      price: product.sellingPrice,
      imageUrl: product.imageUrl,
      category: product.category,
      path: `/product/${product.id}`,
    }));

    const categoryOptions = searchCategories(categoriesFor(products), query)
      .slice(0, MAX_CATEGORIES)
      .map((item) => ({
        type: 'category',
        key: `category-${item.name}`,
        label: item.name,
        sub: item.line,
        path: `/shop?category=${encodeURIComponent(item.name)}`,
      }));

    const pageOptions = searchPages(query).map((page) => ({
      type: 'page',
      key: `page-${page.path}`,
      label: page.label,
      sub: page.hint,
      path: page.path,
    }));

    const total = productMatches.length;
    const allOption = {
      type: 'all',
      key: 'all',
      label: total > 0 ? `See all results for “${query}”` : `No pieces match “${query}”`,
      sub: loading
        ? 'Loading the collection…'
        : total > 0
          ? `${total} ${total === 1 ? 'piece' : 'pieces'}`
          : 'Open the shop to browse everything',
      path: shopSearchPath(query),
    };

    return [...productOptions, ...categoryOptions, ...pageOptions, allOption];
  }, [products, query, loading]);

  function go(path, { keepInput = false } = {}) {
    navigate(path);
    if (!keepInput) setInput('');
    inputRef.current?.blur();
    onNavigate?.();
  }

  return (
    <Autocomplete
      freeSolo
      fullWidth
      disablePortal={inline}
      open={inline ? Boolean(query) : undefined}
      options={options}
      filterOptions={(list) => list}
      groupBy={(option) => GROUP_LABELS[option.type]}
      getOptionLabel={(option) => (typeof option === 'string' ? option : option.label)}
      getOptionKey={(option) => (typeof option === 'string' ? option : option.key)}
      inputValue={input}
      value={null}
      onInputChange={(_event, next, reason) => {
        if (reason === 'input' || reason === 'clear') setInput(next);
      }}
      onChange={(_event, option) => {
        if (option === null) return;
        if (typeof option === 'string') {
          go(shopSearchPath(option.trim()), { keepInput: true });
          return;
        }
        go(option.path, { keepInput: option.type === 'all' });
      }}
      blurOnSelect
      clearOnBlur={false}
      handleHomeEndKeys={false}
      slotProps={{
        listbox: { sx: { maxHeight: inline ? 'calc(100dvh - 140px)' : 440, py: 0.5 } },
        paper: { sx: { mt: 0.75 } },
        popper: { sx: { minWidth: inline ? undefined : 360 } },
      }}
      renderGroup={(group) => (
        <li key={group.key}>
          {group.group ? (
            <Typography
              component="div"
              sx={{
                px: 2,
                pt: 1.25,
                pb: 0.5,
                fontSize: '0.7rem',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'text.secondary',
              }}
            >
              {group.group}
            </Typography>
          ) : (
            <Box sx={{ borderTop: 1, borderColor: 'divider', mt: 0.5 }} />
          )}
          <Box component="ul" sx={{ p: 0, m: 0 }}>
            {group.children}
          </Box>
        </li>
      )}
      renderOption={(props, option) => {
        const { key, ...rest } = props;
        return (
          <Box
            component="li"
            key={key}
            {...rest}
            sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1, minHeight: 56 }}
          >
            <OptionThumb option={option} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                noWrap
                sx={{ fontSize: '0.9rem', fontWeight: option.type === 'all' ? 600 : 500 }}
              >
                {option.label}
              </Typography>
              {option.sub ? (
                <Typography noWrap variant="caption" color="text.secondary" component="p">
                  {option.sub}
                </Typography>
              ) : null}
            </Box>
            {option.type === 'product' ? (
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, flexShrink: 0 }}>
                {formatPrice(option.price)}
              </Typography>
            ) : null}
          </Box>
        );
      }}
      renderInput={(inputParams) => (
        <TextField
          {...inputParams}
          inputRef={inputRef}
          autoFocus={autoFocus}
          placeholder="Search earrings, chains, rings…"
          slotProps={{
            ...inputParams.slotProps,
            input: {
              ...inputParams.slotProps.input,
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
            htmlInput: {
              ...inputParams.slotProps.htmlInput,
              type: 'search',
              'aria-label': 'Search the store',
              enterKeyHint: 'search',
            },
          }}
        />
      )}
    />
  );
}
