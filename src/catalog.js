import { findNode, isActivePath, pathLabel, publicLeaves, walk } from './tree.js';

export const CATALOG_KEY = 'plaza-product-catalog-v1';
export const SELLER = 'PLAZA';
export const RETURN_POLICY = 'تا ۷ روز پس از تحویل، اگر کالا استفاده نشده و بسته‌بندی سالم باشد، امکان بازگشت وجود دارد.';
export const PAGE_SIZE = 4;

export const PRICE_BUCKETS = [
  { id: 'lt20', label: 'تا ۲۰ میلیون', min: 0, max: 20_000_000 },
  { id: '20-50', label: '۲۰ تا ۵۰ میلیون', min: 20_000_000, max: 50_000_000 },
  { id: '50-100', label: '۵۰ تا ۱۰۰ میلیون', min: 50_000_000, max: 100_000_000 },
  { id: 'gt100', label: 'بیش از ۱۰۰ میلیون', min: 100_000_000, max: Infinity },
];

export const SORTS = [
  { id: 'bestseller', label: 'پرفروش‌ترین' },
  { id: 'newest', label: 'جدیدترین' },
  { id: 'cheap', label: 'ارزان‌ترین' },
  { id: 'expensive', label: 'گران‌ترین' },
  { id: 'discount', label: 'بیشترین تخفیف' },
  { id: 'relevance', label: 'مرتبط‌ترین', searchOnly: true },
];

export const customers = [
  { id: 'sara', name: 'سارا م.', purchases: ['iphone', 'galaxy'] },
  { id: 'kian', name: 'کیان ر.', purchases: [] },
];

const library = {
  color: { key: 'color', label: 'رنگ', options: ['مشکی', 'سفید', 'آبی', 'نقره‌ای'] },
  storage: { key: 'storage', label: 'حافظه', options: ['۱۲۸ گیگابایت', '۲۵۶ گیگابایت', '۵۱۲ گیگابایت'] },
  ram: { key: 'ram', label: 'رم', options: ['۸ گیگابایت', '۱۶ گیگابایت'] },
  screen: { key: 'screen', label: 'اندازه صفحه‌نمایش', options: ['۱۱ اینچ', '۱۳ اینچ'] },
  connection: { key: 'connection', label: 'اتصال', options: ['بی‌سیم', 'سیمی'] },
};

function attr(key, extra) {
  return { ...library[key], filterable: true, variant: false, required: false, active: true, ...extra };
}

function sku(code, combo, price, stock, extra = {}) {
  return {
    code,
    combo,
    price,
    compareAt: extra.compareAt ?? null,
    stock,
    reserved: extra.reserved ?? 0,
    warranty: extra.warranty ?? '۱۸ ماه گارانتی شرکتی',
    shipping: '۲ تا ۴ روز کاری',
    pickup: true,
    installment: extra.installment ?? null,
    active: true,
    incompatible: false,
    barcode: extra.barcode ?? '',
  };
}

function seed() {
  return {
    brands: [
      { id: 'apple', name: 'اپل', nameEn: 'Apple', status: 'active', leafIds: ['phone', 'tablet'] },
      { id: 'samsung', name: 'سامسونگ', nameEn: 'Samsung', status: 'active', leafIds: [] },
      { id: 'xiaomi', name: 'شیائومی', nameEn: 'Xiaomi', status: 'active', leafIds: ['phone'] },
      { id: 'generic', name: 'متفرقه', nameEn: '', status: 'inactive', leafIds: [] },
    ],
    schemas: {
      phone: [
        attr('color', { variant: true, required: true }),
        attr('storage', { variant: true, required: true }),
      ],
      tablet: [
        attr('storage', { variant: true, required: true }),
        attr('screen', { variant: true, required: true }),
      ],
      laptop: [
        attr('ram', { variant: true, required: true }),
        attr('storage', { variant: true, required: true }),
      ],
      router: [attr('connection', { variant: false, required: false, filterable: true })],
    },
    products: [
      product('iphone', 'گوشی اپل آیفون ۱۶ پرو', 'Apple iPhone 16 Pro', 'A3293', 'phone', 'apple', 'published', '2026-08-02', 480, {
        skus: [
          sku('PLAZA-IPHONE-BLK-256', { color: 'مشکی', storage: '۲۵۶ گیگابایت' }, 98_900_000, 6, { compareAt: 109_000_000, reserved: 2, installment: { months: 12, monthly: 9_150_000 } }),
          sku('PLAZA-IPHONE-SLV-256', { color: 'نقره‌ای', storage: '۲۵۶ گیگابایت' }, 99_400_000, 1, { compareAt: 109_000_000, reserved: 1 }),
        ],
        links: [
          { productId: 'galaxy', type: 'related', order: 1 },
          { productId: 'redmi', type: 'cross', order: 1 },
        ],
      }),
      product('galaxy', 'گوشی سامسونگ گلکسی S25', 'Samsung Galaxy S25', 'SM-S931', 'phone', 'samsung', 'published', '2026-07-18', 360, {
        skus: [sku('PLAZA-GALAXY-BLK-256', { color: 'مشکی', storage: '۲۵۶ گیگابایت' }, 42_500_000, 8, { compareAt: 47_000_000 })],
      }),
      product('redmi', 'گوشی شیائومی ردمی نوت ۱۴', 'Xiaomi Redmi Note 14', 'Note14', 'phone', 'xiaomi', 'published', '2026-06-11', 220, {
        skus: [sku('PLAZA-REDMI-BLU-128', { color: 'آبی', storage: '۱۲۸ گیگابایت' }, 14_900_000, 12)],
      }),
      product('ipad', 'تبلت اپل آیپد ایر', 'Apple iPad Air', 'A2898', 'tablet', 'apple', 'published', '2026-05-20', 90, {
        skus: [sku('PLAZA-IPAD-256-11', { storage: '۲۵۶ گیگابایت', screen: '۱۱ اینچ' }, 39_000_000, 3)],
      }),
      product('vivobook', 'لپ‌تاپ ایسوس ویووبوک', 'ASUS Vivobook', 'X1504', 'laptop', null, 'published', '2026-04-02', 70, {
        skus: [sku('PLAZA-VIVO-16-512', { ram: '۱۶ گیگابایت', storage: '۵۱۲ گیگابایت' }, 46_000_000, 2, { compareAt: 49_000_000 })],
      }),
      product('router', 'مودم روتر بی‌سیم', 'Wireless Router', 'RX2', 'router', null, 'published', '2026-03-01', 40, {
        skus: [sku('PLAZA-ROUTER-BASE', {}, 3_200_000, 0, { reserved: 0 })],
        attributes: { connection: 'بی‌سیم' },
      }),
      product('draft-phone', 'گوشی پیش‌نویس', '', '', 'phone', null, 'draft', '', 0, { image: '', skus: [] }),
    ],
    reviews: [
      { id: 'rev-1', productId: 'iphone', customerId: 'sara', score: 5, text: 'صفحه روشن است و برای کار روزمره راحت است.', status: 'approved', reason: '', previous: null },
      { id: 'rev-2', productId: 'galaxy', customerId: 'sara', score: 4, text: 'باتری خوب است ولی قاب کمی لغزنده است.', status: 'pending', reason: '', previous: null },
    ],
    cart: [],
    audit: [],
    searches: [],
  };
}

function product(id, title, titleEn, model, leafId, brandId, status, publishedAt, sales, extra) {
  return {
    id,
    title,
    titleEn,
    model,
    description: extra.description ?? 'نمونه محتوای محصول برای پروتوتایپ.',
    image: extra.image ?? title,
    leafId,
    brandId,
    status,
    publishedAt,
    sales,
    attributes: extra.attributes ?? {},
    skus: extra.skus ?? [],
    links: extra.links ?? [],
    seo: {
      slug: id,
      title: '',
      description: '',
      index: true,
      redirects: [],
    },
  };
}

export let catalog = readCatalog();

function readCatalog() {
  try {
    const saved = localStorage.getItem(CATALOG_KEY);
    return saved ? JSON.parse(saved) : seed();
  } catch {
    return seed();
  }
}

export function persistCatalog() {
  localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
}

export function logChange(text) {
  catalog.audit.unshift({ at: new Date().toISOString(), actor: 'مهدی فرحزادی', text });
  catalog.audit = catalog.audit.slice(0, 12);
}

export function normalize(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[يی]/g, 'ی')
    .replace(/[كک]/g, 'ک')
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/\s+/g, ' ');
}

export function toman(value) {
  return `${new Intl.NumberFormat('fa-IR').format(value)} تومان`;
}

export function fa(value) {
  return new Intl.NumberFormat('fa-IR').format(value);
}

export function sellable(item) {
  return Math.max(0, Number(item.stock || 0) - Number(item.reserved || 0));
}

export function schemaOf(leafId) {
  return catalog.schemas[leafId] || [];
}

export function variantAxes(leafId) {
  return schemaOf(leafId).filter((item) => item.active && item.variant);
}

export function brandById(id) {
  return catalog.brands.find((item) => item.id === id) || null;
}

export function productById(id) {
  return catalog.products.find((item) => item.id === id) || null;
}

export function brandAllowed(brand, leafId) {
  return !!brand && brand.status === 'active' && (brand.leafIds.length === 0 || brand.leafIds.includes(leafId));
}

export function brandsForLeaf(leafId) {
  return catalog.brands.filter((brand) => brandAllowed(brand, leafId));
}

export function leafIsPublic(leafId) {
  const found = findNode(leafId);
  return !!found && found.node.type === 'LeafCat' && isActivePath(found.node, found.parents);
}

export function activeLeaves() {
  return walk().filter(({ node, parents }) => node.type === 'LeafCat' && isActivePath(node, parents));
}

export function skuIdentity(item) {
  const parts = Object.entries(item.combo || {}).map(([key, value]) => `${key}:${value}`);
  return parts.sort().join('|');
}

export function purchasable(item) {
  return !!item && item.active && !item.incompatible && Number(item.price) > 0 && sellable(item) > 0;
}

export function discountOf(price, compareAt) {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export function matchingSkus(item, attrFilters = {}) {
  const axes = new Set(variantAxes(item.leafId).map((axis) => axis.key));
  return item.skus.filter((entry) => Object.entries(attrFilters).every(([key, values]) => {
    if (!values?.length || !axes.has(key)) return true;
    return values.includes(entry.combo?.[key]);
  }));
}

export function displaySku(item, attrFilters = {}) {
  const pool = matchingSkus(item, attrFilters);
  return pool.find(purchasable) || pool.find((entry) => entry.price) || pool[0] || item.skus.find(purchasable) || item.skus[0] || null;
}

export function isPublicProduct(item) {
  return item.status === 'published' && leafIsPublic(item.leafId);
}

export function contextLeaves(nodeId) {
  if (!nodeId) return publicLeaves();
  return publicLeaves(nodeId);
}

export function productMatchesContext(item, nodeId) {
  if (!isPublicProduct(item)) return false;
  if (!nodeId) return true;
  const leaves = new Set(contextLeaves(nodeId).map(({ node }) => node.id));
  return leaves.has(item.leafId);
}

export function attributeValue(item, key) {
  const axis = variantAxes(item.leafId).some((entry) => entry.key === key);
  if (axis) return item.skus.map((entry) => entry.combo?.[key]).filter(Boolean);
  const value = item.attributes?.[key];
  return value ? [value] : [];
}

export function passesFilters(item, filters) {
  if (filters.brands?.length) {
    if (!item.brandId || !filters.brands.includes(item.brandId)) return false;
  }
  const axes = variantAxes(item.leafId);
  for (const [key, values] of Object.entries(filters.attrs || {})) {
    if (!values?.length) continue;
    const axis = axes.find((entry) => entry.key === key);
    if (axis) {
      const matched = item.skus.some((entry) => values.includes(entry.combo?.[key]) && (!filters.availableOnly || purchasable(entry)));
      if (!matched) return false;
    } else if (!values.includes(item.attributes?.[key])) return false;
  }
  const shown = displaySku(item, filters.attrs);
  if (filters.availableOnly && !item.skus.some((entry) => purchasable(entry) && matchingSkus(item, filters.attrs).includes(entry))) return false;
  if (filters.price) {
    const bucket = PRICE_BUCKETS.find((entry) => entry.id === filters.price);
    const price = shown?.price;
    if (!bucket || !price || price < bucket.min || price >= bucket.max) return false;
  }
  return true;
}

export function searchScore(item, query) {
  const tokens = normalize(query).split(' ').filter(Boolean);
  if (!tokens.length) return 0;
  const brand = brandById(item.brandId);
  const title = normalize(item.title);
  const model = normalize(item.model);
  const brandName = normalize(`${brand?.name || ''} ${brand?.nameEn || ''}`);
  const haystack = `${title} ${model} ${brandName}`;
  if (!tokens.every((token) => haystack.includes(token))) return 0;
  return tokens.reduce((score, token) => score + (title.includes(token) ? 3 : 0) + (model.includes(token) ? 2 : 0) + (brandName.includes(token) ? 2 : 0), 0);
}

export function sortProducts(items, sort, scores = new Map()) {
  const priceOf = (item) => displaySku(item)?.price || Number.POSITIVE_INFINITY;
  const ranked = [...items];
  const tie = (left, right) => left.id.localeCompare(right.id);
  ranked.sort((left, right) => {
    if (sort === 'newest') return (right.publishedAt || '').localeCompare(left.publishedAt || '') || tie(left, right);
    if (sort === 'cheap') return (priceOf(left) - priceOf(right)) || tie(left, right);
    if (sort === 'expensive') {
      const a = displaySku(left)?.price || -1;
      const b = displaySku(right)?.price || -1;
      return b - a || tie(left, right);
    }
    if (sort === 'discount') {
      const a = discountOf(displaySku(left)?.price, displaySku(left)?.compareAt);
      const b = discountOf(displaySku(right)?.price, displaySku(right)?.compareAt);
      if (a === 0 && b === 0) return tie(left, right);
      if (a === 0) return 1;
      if (b === 0) return -1;
      return b - a || tie(left, right);
    }
    if (sort === 'relevance') return (scores.get(right.id) || 0) - (scores.get(left.id) || 0) || tie(left, right);
    return right.sales - left.sales || tie(left, right);
  });
  return ranked;
}

export function sharedFilters(leafIds) {
  if (!leafIds.length) return [];
  const [first, ...rest] = leafIds.map((id) => schemaOf(id).filter((item) => item.active && item.filterable));
  return first.filter((item) => rest.every((list) => list.some((other) => other.key === item.key && other.label === item.label)));
}

export function canPublish(item) {
  const errors = [];
  if (!item.title.trim()) errors.push('عنوان لازم است.');
  if (!leafIsPublic(item.leafId)) errors.push('فقط LeafCat فعال قابل انتشار است.');
  if (!item.image.trim()) errors.push('تصویر اصلی لازم است.');
  if (!item.skus.length) errors.push('حداقل یک SKU لازم است.');
  if (item.brandId && !brandAllowed(brandById(item.brandId), item.leafId)) errors.push('Brand انتخاب‌شده برای این LeafCat مجاز یا فعال نیست.');
  for (const field of schemaOf(item.leafId)) {
    if (!field.required || field.variant) continue;
    if (!item.attributes?.[field.key]) errors.push(`مقدار «${field.label}» لازم است.`);
  }
  if (item.skus.some((entry) => entry.incompatible)) errors.push('SKU ناسازگار باید اصلاح شود.');
  const codes = catalog.products.flatMap((entry) => entry.skus.map((row) => row.code));
  if (new Set(codes).size !== codes.length) errors.push('کد SKU تکراری است.');
  return errors;
}

export function seoTitle(item) {
  return item.seo.title.trim() || item.title;
}

export function seoDescription(item) {
  return item.seo.description.trim() || item.description;
}

export function canonicalPath(item) {
  return `/p/${item.seo.slug || item.id}`;
}

export function libraryAttributes() {
  return Object.values(library);
}

export function duplicateBrand(name, exceptId) {
  const key = normalize(name);
  return catalog.brands.some((brand) => brand.id !== exceptId && normalize(brand.name) === key);
}

export function publishedUsingBrand(brandId) {
  return catalog.products.filter((item) => item.brandId === brandId && item.status === 'published');
}

export function productsUsingBrand(brandId) {
  return catalog.products.filter((item) => item.brandId === brandId);
}

export function customerById(id) {
  return customers.find((item) => item.id === id);
}

export function approvedReviews(productId) {
  return catalog.reviews.filter((item) => item.productId === productId && (item.status === 'approved' || item.previous));
}

export function publicReview(review) {
  if (review.status === 'approved') return review;
  if (review.previous) return { ...review, score: review.previous.score, text: review.previous.text };
  return null;
}

export function ratingOf(productId) {
  const visible = catalog.reviews.map(publicReview).filter((item) => item && item.productId === productId && item.status !== 'rejected');
  const approved = catalog.reviews.filter((item) => item.productId === productId && (item.status === 'approved' || (item.status === 'pending' && item.previous)));
  const source = approved.map((item) => (item.status === 'approved' ? item : item.previous));
  if (!source.length) return null;
  return { count: source.length, average: source.reduce((sum, item) => sum + item.score, 0) / source.length };
}

export function sitemap() {
  return catalog.products.filter((item) => isPublicProduct(item) && item.seo.index);
}

export { pathLabel };
