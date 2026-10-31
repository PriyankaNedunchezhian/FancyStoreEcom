export const CATEGORIES = [
  { name: 'Earrings', line: 'Studs, hoops, and drops' },
  { name: 'Necklace', line: 'Everyday and statement' },
  { name: 'Bangles', line: 'Pairs made to stack' },
  { name: 'Ring', line: 'Bands and cocktail rings' },
  { name: 'Bracelet', line: 'Links and tennis styles' },
  { name: 'Chain', line: 'Rope, box, and trace' },
  { name: 'Other', line: 'More from the catalog' },
];

export function isInStock(product) {
  return product?.stockStatus === 'In stock';
}

export function categoriesFor(products) {
  const known = new Set(CATEGORIES.map((category) => category.name));
  const extra = [];
  for (const product of products) {
    const name = product.category?.trim();
    if (!name || known.has(name) || extra.some((item) => item.name === name)) continue;
    extra.push({ name, line: 'From the catalog' });
  }
  return [...CATEGORIES, ...extra];
}
