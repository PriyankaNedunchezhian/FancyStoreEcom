export const STORE_PAGES = [
  {
    label: 'My orders',
    hint: 'Track, pay for, or cancel your orders',
    path: '/orders',
    keywords: 'orders order track tracking status history delivery cancel',
  },
  {
    label: 'Wishlist',
    hint: 'Pieces you have saved',
    path: '/wishlist',
    keywords: 'wishlist saved favourites favorites heart like',
  },
  { label: 'Bag', hint: 'Review items before checkout', path: '/cart', keywords: 'bag cart basket items' },
  {
    label: 'Checkout',
    hint: 'Delivery details and payment',
    path: '/checkout',
    keywords: 'checkout pay payment buy cod razorpay upi',
  },
  {
    label: 'Account',
    hint: 'Sign in, addresses, and password',
    path: '/account',
    keywords: 'account profile sign in login logout address addresses password',
  },
];

export function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.]+/g, ' ')
    .trim();
}

function stem(token) {
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) {
    return token.slice(0, -1);
  }
  return token;
}

export function tokenize(query) {
  return normalizeText(query).split(' ').filter(Boolean).map(stem);
}

function productFields(product) {
  return {
    name: normalizeText(product.name),
    category: normalizeText(product.category),
    details: normalizeText(
      [product.brand, product.colour, product.material, product.size, product.weight].join(' '),
    ),
    description: normalizeText(product.description),
    id: String(product.id ?? ''),
  };
}

function scoreToken(fields, token) {
  if (fields.id === token) return 12;
  let best = 0;
  if (fields.name.startsWith(token)) best = Math.max(best, 8);
  else if (` ${fields.name}`.includes(` ${token}`)) best = Math.max(best, 6);
  else if (fields.name.includes(token)) best = Math.max(best, 4);
  if (fields.category.includes(token)) best = Math.max(best, 5);
  if (fields.details.includes(token)) best = Math.max(best, 3);
  if (fields.description.includes(token)) best = Math.max(best, 1);
  return best;
}

export function scoreProduct(product, tokens) {
  if (tokens.length === 0) return 1;
  const fields = productFields(product);
  let total = 0;
  for (const token of tokens) {
    const score = scoreToken(fields, token);
    if (score === 0) return 0;
    total += score;
  }
  if (fields.name === tokens.join(' ')) total += 10;
  return total;
}

export function searchProducts(products, query) {
  const tokens = tokenize(query);
  if (tokens.length === 0) return products;
  return products
    .map((product, index) => ({ product, index, score: scoreProduct(product, tokens) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((row) => row.product);
}

function matchesAll(text, tokens) {
  const haystack = normalizeText(text);
  return tokens.every((token) => haystack.includes(token));
}

export function searchCategories(categories, query) {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  return categories.filter((item) => matchesAll(`${item.name} ${item.line}`, tokens));
}

export function searchPages(query) {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  return STORE_PAGES.filter((page) => matchesAll(`${page.label} ${page.keywords}`, tokens));
}
