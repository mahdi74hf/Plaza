import {
  PRICE_BUCKETS,
  RETURN_POLICY,
  SORTS,
  activeLeaves,
  approvedReviews,
  brandAllowed,
  brandById,
  brandsForLeaf,
  canPublish,
  canonicalPath,
  catalog,
  contextLeaves,
  customerById,
  customers,
  discountOf,
  displaySku,
  duplicateBrand,
  fa,
  isPublicProduct,
  libraryAttributes,
  logChange,
  normalize,
  passesFilters,
  persistCatalog,
  productById,
  productMatchesContext,
  productsUsingBrand,
  publicReview,
  purchasable,
  publishedUsingBrand,
  ratingOf,
  schemaOf,
  searchScore,
  sellable,
  seoDescription,
  seoTitle,
  sharedFilters,
  sitemap,
  skuIdentity,
  sortProducts,
  toman,
  variantAxes,
  PAGE_SIZE,
} from './catalog.js';
import { findNode, pathLabel, walk } from './tree.js';

const ui = {
  tab: 'products',
  brandId: 'apple',
  leafId: 'phone',
  productId: 'iphone',
  modal: null,
  toast: '',
  shop: {
    nodeId: 'phone',
    q: '',
    query: '',
    brands: [],
    price: '',
    availableOnly: false,
    attrs: {},
    sort: 'bestseller',
    page: 1,
    view: 'list',
    productId: null,
    skuId: null,
    offer: 'cash',
    compare: [],
    diffOnly: false,
    notice: '',
    error: false,
    listKey: '',
  },
  customerId: 'sara',
};

const tabs = [
  ['brands', 'برند', 'PRD-046'],
  ['variants', 'واریانت', 'PRD-047'],
  ['products', 'محصول', 'PRD-032'],
  ['reviews', 'نظرها', 'PRD-051'],
  ['shop', 'فروشگاه', 'PRD-054'],
];

const decisions = [
  ['مرتب‌سازی پیش‌فرض PLP', 'تا تعیین تیم محصول، این نمونه «پرفروش‌ترین» را پیش‌فرض فهرست دسته قرار داده است.'],
  ['تعریف پرفروش‌ترین', 'بازه و اثر سفارش لغوشده یا مرجوع هنوز باز است؛ اینجا از عدد فروش نمونه استفاده می‌شود.'],
  ['گارانتی', 'در PDP نمایش داده می‌شود، ولی تعریف و مدیریت گارانتی در وضعیت Hold است.'],
];

export function productMeta() {
  const current = tabs.find(([id]) => id === ui.tab);
  return {
    code: current?.[2] || 'PRD-032',
    name: current?.[0] === 'shop' ? 'کشف و نمایش محصول' : current?.[1] || 'محصول',
    crumb: 'Product',
    gaps: decisions.length,
  };
}

export function productContent(icon) {
  return `<div data-product-root>
    <div class="page-head">
      <div><span class="eyebrow">PRODUCT · ${productMeta().code}</span><h1>${heading()}</h1><p>${subhead()}</p></div>
      ${headAction(icon)}
    </div>
    <div class="prd-tabs">${tabs.map(([id, label, code]) => `<button type="button" data-tab="${id}" class="${ui.tab === id ? 'active' : ''}">${label}<small>${code}</small></button>`).join('')}</div>
    ${ui.tab === 'brands' ? brandsView() : ui.tab === 'variants' ? variantsView() : ui.tab === 'products' ? productsView() : ui.tab === 'reviews' ? reviewsView() : shopView()}
    <section class="scope"><div><span><b>ذخیره‌سازی Prototype</b><small>برند، واریانت، محصول، نظر و فروشگاه در localStorage همین مرورگر می‌مانند و از CAT Tree فعال خوانده می‌شوند.</small></span></div></section>
    ${modalHtml()}
    ${ui.toast ? `<div class="toast">${icon('check')} ${escape(ui.toast)}</div>` : ''}
  </div>`;
}

function heading() {
  return { brands: 'برند محصول', variants: 'واریانت و SKU', products: 'محصولات کاتالوگ', reviews: 'امتیاز و نظر', shop: 'فروشگاه' }[ui.tab];
}

function subhead() {
  return {
    brands: 'ایجاد برند، محدودکردن آن به LeafCat و جلوگیری از غیرفعال‌سازی برند در حال استفاده',
    variants: 'حداکثر دو محور Variant از Schema همان LeafCat و ساخت SKU فقط برای ترکیب‌های تأییدشده',
    products: 'اتصال به یک LeafCat فعال، ذخیره Draft و انتشار پس از تأیید',
    reviews: 'ثبت نظر فقط با خرید معتبر و نمایش عمومی پس از تأیید مدیر محتوا',
    shop: 'جست‌وجو، فیلتر، مرتب‌سازی، فهرست، صفحه محصول و مقایسه',
  }[ui.tab];
}

function headAction(icon) {
  if (ui.tab === 'brands') return `<button class="primary" data-action="new-brand">${icon('plus')} برند جدید</button>`;
  if (ui.tab === 'products') return `<button class="primary" data-action="new-product">${icon('plus')} محصول جدید</button>`;
  if (ui.tab === 'shop' && ui.shop.compare.length) return `<button class="primary" data-action="open-compare">مقایسه (${fa(ui.shop.compare.length)})</button>`;
  return '';
}

function brandsView() {
  const brand = brandById(ui.brandId) || catalog.brands[0];
  ui.brandId = brand?.id;
  const used = brand ? productsUsingBrand(brand.id) : [];
  return `<div class="stats">
      <div><span>برندها</span><b>${fa(catalog.brands.length)}</b></div>
      <div><span>فعال</span><b>${fa(catalog.brands.filter((item) => item.status === 'active').length)}</b></div>
      <div><span>محصول وابسته</span><b>${fa(used.length)}</b></div>
      <div class="gap-stat"><span>تصمیم باز</span><b>${fa(decisions.length)}</b></div>
    </div>
    <div class="workspace">
      <section class="card tree-card">
        <div class="card-head"><div><h2>فهرست برند</h2><p>هر محصول حداکثر یک برند دارد.</p></div></div>
        <div class="entity-list">${catalog.brands.map((item) => `<button class="entity-row ${item.id === ui.brandId ? 'selected' : ''}" data-brand="${item.id}"><b>${escape(item.name)}</b><small>${item.nameEn ? escape(item.nameEn) : 'بدون نام انگلیسی'} · ${item.leafIds.length ? `${fa(item.leafIds.length)} LeafCat` : 'همه LeafCatها'}</small><em class="${item.status === 'inactive' ? 'inactive' : ''}">${item.status === 'active' ? 'فعال' : 'غیرفعال'}</em></button>`).join('')}</div>
      </section>
      ${brand ? `<section class="card detail-card">
        <div class="detail-head"><div><span class="type-pill">Brand</span><span class="active-pill ${brand.status === 'inactive' ? 'inactive' : ''}"><i></i>${brand.status === 'active' ? 'فعال' : 'غیرفعال'}</span><h2>${escape(brand.name)}</h2><p>شناسه: ${escape(brand.id)}</p></div>
        <div class="detail-actions"><button class="action-button" data-action="edit-brand">ویرایش</button><button class="action-button danger" data-action="toggle-brand">${brand.status === 'active' ? 'غیرفعال‌سازی' : 'فعال‌سازی'}</button></div></div>
        <div class="detail-grid"><div><span>نام انگلیسی</span><b>${escape(brand.nameEn || '—')}</b></div><div><span>دامنه</span><b>${brand.leafIds.length ? 'محدود' : 'عمومی'}</b></div></div>
        <div class="rule-list"><h3>LeafCatهای مجاز</h3>${brand.leafIds.length ? brand.leafIds.map((id) => `<div><span>${escape(pathLabel(id) || id)}</span></div>`).join('') : '<div><span>بدون محدودیت؛ برای همه LeafCatهای فعال قابل انتخاب است.</span></div>'}</div>
        <div class="rule-list"><h3>محصول‌های وابسته</h3>${used.length ? used.map((item) => `<div><span>${escape(item.title)} · ${statusLabel(item.status)}</span></div>`).join('') : '<div><span>محصولی به این برند وصل نیست و حذف دائمی در MVP انجام نمی‌شود.</span></div>'}</div>
        ${auditBox()}
      </section>` : ''}
    </div>`;
}

function variantsView() {
  const leaves = activeLeaves();
  const leaf = leaves.find((item) => item.node.id === ui.leafId) || leaves[0];
  ui.leafId = leaf?.node.id;
  const schema = ui.leafId ? schemaOf(ui.leafId) : [];
  const axes = schema.filter((item) => item.variant);
  return `<div class="workspace">
    <section class="card tree-card">
      <div class="card-head"><div><h2>LeafCat فعال</h2><p>محور Variant فقط از Attribute همین LeafCat انتخاب می‌شود.</p></div><span>${fa(axes.length)} / ۲ محور</span></div>
      <div class="entity-list">${leaves.map(({ node }) => `<button class="entity-row ${node.id === ui.leafId ? 'selected' : ''}" data-leaf="${node.id}"><b>${escape(node.name)}</b><small>${escape(pathLabel(node.id))}</small></button>`).join('') || '<p class="empty-copy">LeafCat فعالی در CAT Tree نیست.</p>'}</div>
    </section>
    ${leaf ? `<section class="card detail-card">
      <div class="detail-head"><div><span class="type-pill leafcat">LeafCat</span><h2>${escape(leaf.node.name)}</h2><p>${escape(pathLabel(leaf.node.id))}</p></div></div>
      <div class="schema-list">${schema.map((field) => `<article>
        <div><b>${escape(field.label)}</b><small>${field.variant ? 'محور Variant' : 'ویژگی'} · ${field.filterable ? 'قابل فیلتر' : 'غیرقابل فیلتر'}</small></div>
        <button class="action-button" data-action="toggle-axis" data-key="${field.key}">${field.variant ? 'برداشتن از SKU' : 'محور SKU'}</button>
      </article>`).join('') || '<p class="empty-copy">هنوز Attributeای به این LeafCat وصل نشده است.</p>'}
      </div>
      <div class="option-box"><span>افزودن از Schema آماده</span><div>${libraryAttributes().filter((item) => !schema.some((field) => field.key === item.key)).map((item) => `<button class="chip-button" data-action="add-attr" data-key="${item.key}">${escape(item.label)}</button>`).join('') || '<small>همه ویژگی‌های آماده وصل شده‌اند.</small>'}</div></div>
      ${schema.filter((item) => item.variant).map((field) => `<div class="option-box"><span>مقادیر ${escape(field.label)}</span><div>${field.options.map((option) => `<b class="value-pill">${escape(option)}</b>`).join('')}</div></div>`).join('')}
      <p class="form-note">بیش از دو محور پذیرفته نمی‌شود. حذف مقدار یا محوری که در SKU استفاده شده، SKU را پاک نمی‌کند و آن را ناسازگار علامت می‌زند.</p>
    </section>` : ''}
  </div>`;
}

function productsView() {
  const item = productById(ui.productId);
  return `<div class="stats">
      <div><span>کل محصولات</span><b>${fa(catalog.products.length)}</b></div>
      <div><span>منتشرشده</span><b>${fa(catalog.products.filter((entry) => entry.status === 'published').length)}</b></div>
      <div><span>پیش‌نویس</span><b>${fa(catalog.products.filter((entry) => entry.status === 'draft').length)}</b></div>
      <div><span>Sitemap</span><b>${fa(sitemap().length)}</b></div>
    </div>
    <div class="workspace">
      <section class="card tree-card">
        <div class="card-head"><div><h2>محصولات</h2><p>حذف دائمی در MVP نیست.</p></div></div>
        <div class="entity-list">${catalog.products.map((entry) => `<button class="entity-row ${entry.id === ui.productId ? 'selected' : ''}" data-product="${entry.id}"><b>${escape(entry.title || 'بدون عنوان')}</b><small>${escape(pathLabel(entry.leafId) || 'بدون دسته')} · ${escape(brandById(entry.brandId)?.name || 'بدون برند')}</small><em class="${entry.status === 'published' ? '' : 'inactive'}">${statusLabel(entry.status)}</em></button>`).join('')}</div>
      </section>
      ${item ? productDetail(item) : ''}
    </div>`;
}

function productDetail(item) {
  const errors = canPublish(item);
  const brand = brandById(item.brandId);
  return `<section class="card detail-card">
    <div class="detail-head"><div><span class="type-pill">${statusLabel(item.status)}</span><h2>${escape(item.title || 'بدون عنوان')}</h2><p>${escape(item.titleEn || 'بدون نام انگلیسی')} · ${escape(item.model || 'بدون مدل')}</p></div>
      <div class="detail-actions"><button class="action-button" data-action="edit-product">ویرایش</button><button class="action-button" data-action="seo-product">SEO</button></div>
    </div>
    <div class="path-box"><span>LeafCat</span><div><b class="current">${escape(pathLabel(item.leafId) || 'انتخاب نشده')}</b></div></div>
    <div class="detail-grid">
      <div><span>برند</span><b>${escape(brand?.name || 'ندارد')}</b></div>
      <div><span>تصویر اصلی</span><b>${item.image ? 'دارد' : 'ندارد'}</b></div>
      <div><span>SKU</span><b>${fa(item.skus.length)}</b></div>
      <div><span>Canonical</span><b>${escape(canonicalPath(item))}</b></div>
    </div>
    ${errors.length && item.status !== 'published' ? `<div class="delete-warning blocked"><b>قبل از انتشار</b><p>${errors.map(escape).join(' ')}</p></div>` : ''}
    <div class="sku-table">${item.skus.map((entry) => `<article class="${entry.incompatible ? 'bad' : ''}"><div><b>${escape(entry.code)}</b><small>${Object.values(entry.combo).join(' · ') || 'SKU پایه'} · قابل فروش ${fa(sellable(entry))}</small></div><em>${entry.price ? toman(entry.price) : 'بدون قیمت'}${entry.incompatible ? ' · ناسازگار' : ''}</em></article>`).join('') || '<p class="empty-copy">هنوز SKUای ساخته نشده است.</p>'}</div>
    <div class="detail-actions spread"><button class="secondary" data-action="make-skus">ساخت SKU</button><button class="secondary" data-action="links-product">مرتبط و Cross-sell</button></div>
    <div class="link-list">${['related', 'cross'].map((type) => `<div><b>${type === 'related' ? 'مرتبط' : 'Cross-sell'}</b>${linksOf(item, type).map((link) => `<span>${escape(productById(link.productId)?.title || link.productId)}</span>`).join('') || '<span>ندارد</span>'}</div>`).join('')}</div>
    <div class="detail-actions spread">
      ${item.status === 'published' ? '<button class="action-button danger" data-action="unpublish">غیرفعال‌سازی</button>' : '<button class="primary" data-action="ask-publish">انتشار</button>'}
    </div>
    ${auditBox()}
  </section>`;
}

function reviewsView() {
  const customer = customerById(ui.customerId);
  return `<div class="workspace">
    <section class="card tree-card">
      <div class="card-head"><div><h2>ثبت نظر مشتری</h2><p>هر مشتری برای هر محصول فقط یک نظر فعال دارد.</p></div></div>
      <label class="field"><span>مشتری نمونه</span><select data-field="customer">${customers.map((item) => `<option value="${item.id}" ${item.id === ui.customerId ? 'selected' : ''}>${escape(item.name)}${item.purchases.length ? '' : ' · بدون خرید'}</option>`).join('')}</select></label>
      <label class="field"><span>محصول خریداری‌شده</span><select data-field="review-product">${catalog.products.filter((item) => customer.purchases.includes(item.id)).map((item) => `<option value="${item.id}">${escape(item.title)}</option>`).join('') || '<option value="">خرید معتبری نیست</option>'}</select></label>
      <label class="field"><span>امتیاز</span><select data-field="review-score">${[5, 4, 3, 2, 1].map((score) => `<option value="${score}">${fa(score)}</option>`).join('')}</select></label>
      <label class="field"><span>متن نظر</span><textarea data-field="review-text" placeholder="تجربه استفاده را بنویس"></textarea></label>
      <button class="primary" data-action="submit-review">ثبت برای بررسی</button>
      <p class="form-note">نظر جدید عمومی نمی‌شود. ویرایش نظر تأییدشده، نسخه فعلی را تا تعیین تکلیف نگه می‌دارد.</p>
    </section>
    <section class="card detail-card">
      <div class="card-head"><div><h2>صف بررسی</h2><p>مدیر محتوا فقط تأیید یا رد می‌کند.</p></div></div>
      <div class="entity-list">${catalog.reviews.map((review) => {
        const item = productById(review.productId);
        const author = customerById(review.customerId);
        return `<article class="review-row"><div><b>${escape(item?.title || '')} · ${escape(author?.name || '')}</b><small>${fa(review.score)} ستاره · ${escape(review.text)}</small><em>${reviewStatus(review)}</em></div>${review.status === 'pending' ? `<div class="detail-actions"><button class="action-button" data-action="approve-review" data-id="${review.id}">تأیید</button><button class="action-button danger" data-action="reject-review" data-id="${review.id}">رد</button></div>` : ''}</article>`;
      }).join('')}</div>
    </section>
  </div>`;
}

function shopView() {
  if (ui.shop.view === 'pdp') return pdpView();
  if (ui.shop.view === 'compare') return compareView();
  return plpView();
}

function plpView() {
  const listing = runShop();
  const filters = listing.leafIds.length === 1 ? schemaOf(listing.leafIds[0]).filter((item) => item.active && item.filterable) : sharedFilters(listing.leafIds);
  const brandOptions = catalog.brands.filter((brand) => listing.unfiltered.some((item) => item.brandId === brand.id));
  return `<section class="shop-frame">
    <div class="shop-bar"><label class="search">${shopIcon()}<input id="shop-search" value="${escape(ui.shop.q)}" placeholder="نام محصول، برند یا مدل" /></label><button class="primary" data-action="run-search">جست‌وجو</button></div>
    <div class="shop-context">${shopNodes().map((node) => `<button class="chip-button ${ui.shop.nodeId === node.id && !ui.shop.query ? 'active' : ''}" data-shop-node="${node.id}">${escape(node.name)}</button>`).join('')}</div>
    ${ui.shop.error ? `<div class="delete-warning"><b>فهرست بارگذاری نشد</b><p>زمینه همین صفحه حفظ شده است.</p><button class="primary" data-action="retry-shop">تلاش دوباره</button></div>` : listing.kind === 'prompt' ? `<div class="empty-panel"><b>عبارت جست‌وجو را بنویس</b><p>جست‌وجوی خالی اجرا نمی‌شود.</p></div>` : `
      <div class="plp-head"><div><h2>${escape(listing.title)}</h2><p>${escape(listing.note)}</p></div><b>${fa(listing.items.length)} کالا</b></div>
      ${chips().length ? `<div class="chip-row">${chips().map((chip) => `<button data-clear="${chip.id}">${escape(chip.label)} ×</button>`).join('')}<button data-action="clear-filters">پاک کردن فیلترها</button></div>` : ''}
      <div class="plp-layout">
        <aside>
          <div class="filter-block"><b>برند</b>${brandOptions.map((brand) => `<label><input type="checkbox" data-filter-brand="${brand.id}" ${ui.shop.brands.includes(brand.id) ? 'checked' : ''}/>${escape(brand.name)}</label>`).join('') || '<small>برندی در این نتیجه نیست.</small>'}</div>
          <div class="filter-block"><b>قیمت</b>${PRICE_BUCKETS.map((bucket) => `<label><input type="radio" name="price" data-filter-price="${bucket.id}" ${ui.shop.price === bucket.id ? 'checked' : ''}/>${bucket.label}</label>`).join('')}</div>
          <div class="filter-block"><label><input type="checkbox" data-filter-avail ${ui.shop.availableOnly ? 'checked' : ''}/>فقط موجودها</label></div>
          ${filters.map((field) => `<div class="filter-block"><b>${escape(field.label)}</b>${field.options.map((option) => `<label><input type="checkbox" data-filter-attr="${field.key}" value="${escape(option)}" ${(ui.shop.attrs[field.key] || []).includes(option) ? 'checked' : ''}/>${escape(option)}</label>`).join('')}</div>`).join('')}
        </aside>
        <div>
          <label class="sort-line"><span>مرتب‌سازی</span><select data-sort>${sortOptions().map((item) => `<option value="${item.id}" ${ui.shop.sort === item.id ? 'selected' : ''}>${item.label}</option>`).join('')}</select></label>
          ${listing.items.length ? `<div class="card-grid">${listing.pageItems.map((item) => cardHtml(item)).join('')}</div>` : `<div class="empty-panel"><b>محصولی با این شرایط نیست</b><p>${ui.shop.query ? 'عبارت را عوض کن یا به فروشگاه برگرد.' : 'فیلترها را کم کن.'}</p></div>`}
          ${listing.pages > 1 ? `<div class="pager">${Array.from({ length: listing.pages }, (_, index) => `<button data-page="${index + 1}" class="${listing.page === index + 1 ? 'active' : ''}">${fa(index + 1)}</button>`).join('')}</div>` : ''}
        </div>
      </div>`}
    <button class="text-button" data-action="toggle-error">${ui.shop.error ? 'بستن حالت خطا' : 'شبیه‌سازی خطای بارگذاری'}</button>
  </section>`;
}

function pdpView() {
  const item = productById(ui.shop.productId);
  if (!item || !isPublicProduct(item)) return `<div class="empty-panel"><b>این محصول در سایت در دسترس نیست</b><button data-action="back-list">بازگشت به فهرست</button></div>`;
  const sku = item.skus.find((entry) => entry.code === ui.shop.skuId) || displaySku(item) || item.skus[0];
  ui.shop.skuId = sku?.code || null;
  const axes = variantAxes(item.leafId);
  const rating = ratingOf(item.id);
  const reviews = catalog.reviews.filter((review) => review.productId === item.id).map(publicReview).filter(Boolean);
  return `<section class="shop-frame">
    <button class="text-button" data-action="back-list">بازگشت به فهرست</button>
    <p class="crumb">${escape(pathLabel(item.leafId))}</p>
    <div class="pdp-grid">
      <div class="art">${escape(item.image || item.title)}</div>
      <div>
        <h2>${escape(item.title)}</h2>
        <p>${escape(item.titleEn)} ${brandById(item.brandId) ? `· ${escape(brandById(item.brandId).name)}` : ''}</p>
        ${rating ? `<p class="rating">${fa(rating.average.toFixed(1))} از ${fa(rating.count)} نظر تأییدشده</p>` : '<p class="rating">هنوز نظر تأییدشده‌ای نیست</p>'}
        ${axes.map((axis) => `<div class="option-box"><span>${escape(axis.label)}</span><div>${axis.options.filter((option) => item.skus.some((entry) => entry.combo?.[axis.key] === option)).map((option) => `<button class="chip-button ${sku?.combo?.[axis.key] === option ? 'active' : ''}" data-axis="${axis.key}" data-value="${escape(option)}">${escape(option)}</button>`).join('')}</div></div>`).join('')}
        ${sku ? offerBox(item, sku) : '<p>SKU معتبری نیست.</p>'}
        <div class="detail-actions spread"><button class="secondary" data-action="wish">علاقه‌مندی</button><button class="secondary" data-action="add-compare" data-id="${item.id}">افزودن به مقایسه</button></div>
        ${ui.shop.notice ? `<p class="form-error">${escape(ui.shop.notice)}</p>` : ''}
      </div>
    </div>
    <div class="info-grid"><div><b>شرایط بازگشت</b><p>${RETURN_POLICY}</p></div><div><b>SEO</b><p>${escape(seoTitle(item))}</p><small>${escape(canonicalPath(item))} · ${item.seo.index ? 'Index' : 'Noindex'}</small></div></div>
    ${rail('محصولات مرتبط', linksOf(item, 'related'))}
    ${rail('Cross-sell', linksOf(item, 'cross'), true)}
    <div class="review-public"><h3>نظرهای تأییدشده</h3>${reviews.length ? reviews.map((review) => `<article><b>${escape(customerById(review.customerId)?.name || '')} · ${fa(review.score)}</b><p>${escape(review.text)}</p></article>`).join('') : '<p>نظری برای نمایش نیست.</p>'}</div>
  </section>`;
}

function compareView() {
  const items = ui.shop.compare.map(productById).filter((item) => item && isPublicProduct(item));
  ui.shop.compare = items.map((item) => item.id);
  const leafId = items[0]?.leafId;
  const rows = leafId ? schemaOf(leafId) : [];
  const visibleRows = ui.shop.diffOnly ? rows.filter((row) => new Set(items.map((item) => (item.attributes?.[row.key] || item.skus.map((entry) => entry.combo?.[row.key]).filter(Boolean).join('، ') || 'نامشخص'))).size > 1) : rows;
  return `<section class="shop-frame">
    <button class="text-button" data-action="back-list">بازگشت</button>
    <div class="plp-head"><div><h2>مقایسه</h2><p>حداکثر چهار محصول از یک LeafCat</p></div><label><input type="checkbox" data-diff ${ui.shop.diffOnly ? 'checked' : ''}/>فقط تفاوت‌ها</label></div>
    ${items.length < 2 ? '<div class="empty-panel"><b>حداقل دو محصول لازم است</b></div>' : `<div class="compare-table"><table><tr><th>ویژگی</th>${items.map((item) => `<th>${escape(item.title)}<button data-action="remove-compare" data-id="${item.id}">حذف</button><button data-open="${item.id}">مشاهده</button></th>`).join('')}</tr>
      <tr><td>برند</td>${items.map((item) => `<td>${escape(brandById(item.brandId)?.name || '—')}</td>`).join('')}</tr>
      <tr><td>قیمت</td>${items.map((item) => `<td>${displaySku(item)?.price ? toman(displaySku(item).price) : 'نامشخص'}</td>`).join('')}</tr>
      <tr><td>موجودی</td>${items.map((item) => `<td>${item.skus.some(purchasable) ? 'موجود' : 'ناموجود'}</td>`).join('')}</tr>
      ${visibleRows.map((row) => `<tr><td>${escape(row.label)}</td>${items.map((item) => `<td>${escape(shownAttr(item, row.key))}</td>`).join('')}</tr>`).join('')}
    </table></div>`}
  </section>`;
}

function offerBox(item, sku) {
  const off = discountOf(sku.price, sku.compareAt);
  const canBuy = purchasable(sku);
  return `<div class="offer">
    <b>${sku.price ? toman(sku.price) : 'بدون قیمت فعال'}</b>
    ${sku.compareAt ? `<s>${toman(sku.compareAt)}</s>` : ''} ${off ? `<em>${fa(off)}٪</em>` : ''}
    <p>${canBuy ? `موجود · ${fa(sellable(sku))} عدد قابل فروش` : 'ناموجود'}</p>
    <small>${escape(sku.warranty)} · ارسال تقریبی ${escape(sku.shipping)}${sku.pickup ? ' · تحویل حضوری' : ''}</small>
    ${sku.installment ? `<label class="offer-switch"><input type="checkbox" data-installment ${ui.shop.offer === 'installment' ? 'checked' : ''}/>خرید اقساطی ${fa(sku.installment.months)} ماه · ${toman(sku.installment.monthly)}</label>` : ''}
    <button class="primary" data-action="add-cart" ${canBuy ? '' : 'disabled'}>افزودن به سبد</button>
    <small>افزودن به سبد موجودی را رزرو نمی‌کند. کد فروشنده ${escape(sku.code.split('-')[0] || 'PLAZA')}</small>
  </div>`;
}

function cardHtml(item) {
  const sku = displaySku(item, ui.shop.attrs);
  const off = discountOf(sku?.price, sku?.compareAt);
  const brand = brandById(item.brandId);
  return `<article class="product-card"><button data-open="${item.id}"><div class="thumb">${escape(item.image || 'بدون تصویر')}</div><h3>${escape(item.title)}</h3>${brand ? `<small>${escape(brand.name)}</small>` : ''}<strong>${sku?.price ? toman(sku.price) : 'بدون قیمت'}</strong>${off ? `<em>${fa(off)}٪</em>` : ''}<span>${item.skus.some(purchasable) ? 'موجود' : 'ناموجود'}</span></button><button class="text-button" data-action="add-compare" data-id="${item.id}">مقایسه</button></article>`;
}

function rail(title, links, cross = false) {
  const cards = links.map((link) => productById(link.productId)).filter((item) => item && isPublicProduct(item) && (!cross || item.skus.some(purchasable)));
  if (!cards.length) return '';
  return `<div class="rail"><h3>${title}</h3><div class="card-grid">${cards.map(cardHtml).join('')}</div></div>`;
}

function linksOf(item, type) {
  return item.links.filter((link) => link.type === type).sort((a, b) => a.order - b.order);
}

function shownAttr(item, key) {
  const fromSku = [...new Set(item.skus.map((entry) => entry.combo?.[key]).filter(Boolean))];
  if (fromSku.length) return fromSku.join('، ');
  return item.attributes?.[key] || 'نامشخص';
}

function runShop() {
  if (ui.shop.query === '' && ui.shop.q === '' && ui.shop.view === 'list' && ui.shop.nodeId === '' ) {
    return { kind: 'prompt', items: [], pageItems: [], pages: 0, page: 1, title: '', note: '', leafIds: [], unfiltered: [] };
  }
  const searching = ui.shop.query.trim().length > 0;
  let source = catalog.products.filter((item) => (searching ? isPublicProduct(item) : productMatchesContext(item, ui.shop.nodeId)));
  const scores = new Map();
  if (searching) {
    source = source.filter((item) => {
      const score = searchScore(item, ui.shop.query);
      if (score) scores.set(item.id, score);
      return score > 0;
    });
  }
  const unfiltered = source;
  const filtered = source.filter((item) => passesFilters(item, ui.shop));
  const sort = sortOptions().some((item) => item.id === ui.shop.sort) ? ui.shop.sort : (searching ? 'relevance' : 'bestseller');
  const items = sortProducts(filtered, sort, scores);
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const page = Math.min(ui.shop.page, pages);
  const node = findNode(ui.shop.nodeId)?.node;
  return {
    kind: 'list',
    items,
    pageItems: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    pages,
    page,
    title: searching ? `نتایج «${ui.shop.query}»` : (node?.name || 'فروشگاه'),
    note: searching ? 'مرتب‌سازی پیش‌فرض: مرتبط‌ترین' : pathLabel(ui.shop.nodeId),
    leafIds: [...new Set(filtered.map((item) => item.leafId))],
    unfiltered,
  };
}

function sortOptions() {
  const searching = ui.shop.query.trim().length > 0;
  return SORTS.filter((item) => searching || !item.searchOnly);
}

function shopNodes() {
  return walk().filter(({ node, parents }) => node.status !== 'inactive' && parents.every((item) => item.status !== 'inactive') && node.type !== 'Vertical').map(({ node }) => node);
}

function chips() {
  const list = [];
  ui.shop.brands.forEach((id) => list.push({ id: `brand:${id}`, label: brandById(id)?.name || id }));
  if (ui.shop.price) list.push({ id: 'price', label: PRICE_BUCKETS.find((item) => item.id === ui.shop.price)?.label || '' });
  if (ui.shop.availableOnly) list.push({ id: 'avail', label: 'فقط موجودها' });
  Object.entries(ui.shop.attrs).forEach(([key, values]) => values.forEach((value) => list.push({ id: `attr:${key}:${value}`, label: value })));
  return list;
}

function modalHtml() {
  if (ui.modal === 'brand') return brandModal();
  if (ui.modal === 'product') return productModal();
  if (ui.modal === 'sku') return skuModal();
  if (ui.modal === 'publish') return confirmModal('انتشار محصول', 'محصول پس از تأیید در فروشگاه، جست‌وجو و Sitemap دیده می‌شود.', 'confirm-publish', 'انتشار');
  if (ui.modal === 'unpublish') return confirmModal('غیرفعال‌سازی محصول', 'فروش جدید متوقف می‌شود. سفارش قبلی و نظرهای ثبت‌شده پاک نمی‌شوند.', 'confirm-unpublish', 'غیرفعال شود');
  if (ui.modal === 'seo') return seoModal();
  if (ui.modal === 'links') return linksModal();
  if (ui.modal === 'reject') return rejectModal();
  if (ui.modal === 'decisions') return `<div class="backdrop" data-action="close"><section class="modal decisions" onclick="event.stopPropagation()"><header><div><span>GAPS</span><h2>تصمیم‌های باز Product</h2></div><button class="icon-button" data-action="close">×</button></header><div class="decision-list">${decisions.map(([title, text], index) => `<article><em>۰${index + 1}</em><div><b>${title}</b><p>${text}</p></div><span>باز</span></article>`).join('')}</div><footer><button class="primary" data-action="close">متوجه شدم</button></footer></section></div>`;
  return '';
}

function brandModal() {
  const brand = ui.editingId ? brandById(ui.editingId) : null;
  const leaves = activeLeaves();
  return `<div class="backdrop" data-action="close"><section class="modal wide" onclick="event.stopPropagation()">
    <header><div><span>PRD-046</span><h2>${brand ? 'ویرایش برند' : 'برند جدید'}</h2></div><button class="icon-button" data-action="close">×</button></header>
    <div class="modal-body">
      <label><span>نام فارسی</span><input id="brand-name" value="${escape(brand?.name || '')}" /></label>
      <label><span>نام انگلیسی</span><input id="brand-en" value="${escape(brand?.nameEn || '')}" /></label>
      <div class="check-grid">${leaves.map(({ node }) => `<label><input type="checkbox" value="${node.id}" data-brand-leaf ${brand?.leafIds.includes(node.id) ? 'checked' : ''}/>${escape(pathLabel(node.id))}</label>`).join('')}</div>
      <p class="form-error" id="form-error"></p>
      <p class="form-note">اگر LeafCatی انتخاب نشود، برند برای همه دسته‌ها قابل استفاده است. محدودکردن دامنه، محصول منتشرشده ناسازگار را متوقف می‌کند.</p>
    </div>
    <footer><button class="ghost" data-action="close">انصراف</button><button class="primary" data-action="save-brand">تأیید و ذخیره</button></footer>
  </section></div>`;
}

function productModal() {
  const item = ui.editingId ? productById(ui.editingId) : null;
  const leafId = item?.leafId || activeLeaves()[0]?.node.id || '';
  const fields = schemaOf(leafId).filter((field) => !field.variant);
  return `<div class="backdrop" data-action="close"><section class="modal wide" onclick="event.stopPropagation()">
    <header><div><span>PRD-032</span><h2>${item ? 'ویرایش محصول' : 'محصول جدید'}</h2></div><button class="icon-button" data-action="close">×</button></header>
    <div class="modal-body">
      <label><span>عنوان فارسی</span><input id="product-title" value="${escape(item?.title || '')}" /></label>
      <label><span>عنوان انگلیسی</span><input id="product-en" value="${escape(item?.titleEn || '')}" /></label>
      <label><span>مدل</span><input id="product-model" value="${escape(item?.model || '')}" /></label>
      <label><span>LeafCat فعال</span><select id="product-leaf">${activeLeaves().map(({ node }) => `<option value="${node.id}" ${node.id === leafId ? 'selected' : ''}>${escape(pathLabel(node.id))}</option>`).join('')}</select></label>
      <label><span>برند</span><select id="product-brand"><option value="">بدون برند</option>${brandsForLeaf(leafId).map((brand) => `<option value="${brand.id}" ${item?.brandId === brand.id ? 'selected' : ''}>${escape(brand.name)}</option>`).join('')}</select></label>
      <label><span>تصویر اصلی</span><input id="product-image" value="${escape(item?.image || '')}" placeholder="شرح یا نام تصویر" /></label>
      <label><span>توضیح</span><textarea id="product-description">${escape(item?.description || '')}</textarea></label>
      ${fields.map((field) => `<label><span>${escape(field.label)}${field.required ? ' *' : ''}</span>${field.options.length ? `<select data-attr="${field.key}">${field.options.map((option) => `<option ${item?.attributes?.[field.key] === option ? 'selected' : ''}>${escape(option)}</option>`).join('')}</select>` : `<input data-attr="${field.key}" value="${escape(item?.attributes?.[field.key] || '')}" />`}</label>`).join('')}
      <p class="form-error" id="form-error"></p>
    </div>
    <footer><button class="ghost" data-action="close">انصراف</button><button class="primary" data-action="save-product">ذخیره Draft</button></footer>
  </section></div>`;
}

function skuModal() {
  const item = productById(ui.productId);
  const axes = variantAxes(item.leafId);
  if (!axes.length) {
    return confirmModal('SKU پایه', 'این LeafCat محور Variant ندارد. یک SKU پایه ساخته می‌شود.', 'confirm-base-sku', 'ایجاد SKU');
  }
  const selected = ui.skuPick || Object.fromEntries(axes.map((axis) => [axis.key, axis.options.slice(0, 1)]));
  ui.skuPick = selected;
  const combos = combinations(axes, selected);
  return `<div class="backdrop" data-action="close"><section class="modal wide" onclick="event.stopPropagation()">
    <header><div><span>PRD-047</span><h2>انتخاب ترکیب‌های قابل فروش</h2></div><button class="icon-button" data-action="close">×</button></header>
    <div class="modal-body">
      ${axes.map((axis) => `<div class="option-box"><span>${escape(axis.label)}</span><div>${axis.options.map((option) => `<label class="chip-button"><input type="checkbox" data-sku-value="${axis.key}" value="${escape(option)}" ${selected[axis.key]?.includes(option) ? 'checked' : ''}/>${escape(option)}</label>`).join('')}</div></div>`).join('')}
      <div class="schema-list">${combos.map((combo) => `<label class="combo-row"><input type="checkbox" data-combo="${escape(JSON.stringify(combo))}" checked/><span>${Object.values(combo).join(' · ')}</span></label>`).join('') || '<p>حداقل یک مقدار برای هر محور انتخاب کن.</p>'}</div>
      <p class="form-error" id="form-error"></p>
    </div>
    <footer><button class="ghost" data-action="close">انصراف</button><button class="primary" data-action="confirm-skus">تأیید و ایجاد</button></footer>
  </section></div>`;
}

function seoModal() {
  const item = productById(ui.productId);
  return `<div class="backdrop" data-action="close"><section class="modal" onclick="event.stopPropagation()">
    <header><div><span>PRD-050</span><h2>SEO محصول</h2></div><button class="icon-button" data-action="close">×</button></header>
    <div class="modal-body">
      <label><span>Slug</span><input id="seo-slug" value="${escape(item.seo.slug)}" /></label>
      <label><span>عنوان SEO</span><input id="seo-title" value="${escape(item.seo.title)}" placeholder="${escape(item.title)}" /></label>
      <label><span>Meta Description</span><textarea id="seo-description" placeholder="${escape(item.description)}">${escape(item.seo.description)}</textarea></label>
      <label class="check-line"><input id="seo-index" type="checkbox" ${item.seo.index ? 'checked' : ''}/>قابل ایندکس</label>
      <div class="preview"><small>پیش‌نمایش</small><p id="seo-preview">${escape(canonicalPath(item))}</p><b>${escape(seoTitle(item))}</b><p>${escape(seoDescription(item))}</p></div>
      ${item.seo.redirects.length ? `<p class="form-note">Redirectهای قبلی: ${item.seo.redirects.map(escape).join(' ، ')}</p>` : ''}
      <p class="form-error" id="form-error"></p>
    </div>
    <footer><button class="ghost" data-action="close">انصراف</button><button class="primary" data-action="save-seo">تأیید SEO</button></footer>
  </section></div>`;
}

function linksModal() {
  const item = productById(ui.productId);
  const others = catalog.products.filter((entry) => entry.id !== item.id);
  return `<div class="backdrop" data-action="close"><section class="modal wide" onclick="event.stopPropagation()">
    <header><div><span>PRD-049</span><h2>محصولات مرتبط</h2></div><button class="icon-button" data-action="close">×</button></header>
    <div class="modal-body">
      <label><span>محصول مقصد</span><select id="link-target">${others.map((entry) => `<option value="${entry.id}">${escape(entry.title)}</option>`).join('')}</select></label>
      <label><span>نوع</span><select id="link-type"><option value="related">مرتبط</option><option value="cross">Cross-sell</option></select></label>
      <div class="schema-list">${item.links.map((link, index) => `<article><div><b>${escape(productById(link.productId)?.title || '')}</b><small>${link.type === 'related' ? 'مرتبط' : 'Cross-sell'}</small></div><button data-action="drop-link" data-index="${index}">حذف</button></article>`).join('')}</div>
      <p class="form-error" id="form-error"></p>
    </div>
    <footer><button class="ghost" data-action="close">بستن</button><button class="primary" data-action="add-link">افزودن اتصال</button></footer>
  </section></div>`;
}

function rejectModal() {
  return `<div class="backdrop" data-action="close"><section class="modal" onclick="event.stopPropagation()">
    <header><div><span>PRD-051</span><h2>رد نظر</h2></div><button class="icon-button" data-action="close">×</button></header>
    <div class="modal-body"><label><span>دلیل رد</span><textarea id="reject-reason"></textarea></label><p class="form-error" id="form-error"></p></div>
    <footer><button class="ghost" data-action="close">انصراف</button><button class="delete-button" data-action="confirm-reject">ثبت رد</button></footer>
  </section></div>`;
}

function confirmModal(title, text, action, label) {
  return `<div class="backdrop" data-action="close"><section class="modal confirm-modal" onclick="event.stopPropagation()"><header><div><span>CONFIRM</span><h2>${title}</h2></div><button class="icon-button" data-action="close">×</button></header><div class="modal-body"><div class="delete-warning"><b>${title}</b><p>${text}</p></div></div><footer><button class="ghost" data-action="close">انصراف</button><button class="primary" data-action="${action}">${label}</button></footer></section></div>`;
}

function auditBox() {
  if (!catalog.audit.length) return '';
  return `<div class="rule-list"><h3>گزارش تغییرات</h3>${catalog.audit.slice(0, 4).map((item) => `<div><span>${escape(item.text)}</span></div>`).join('')}</div>`;
}

function statusLabel(status) {
  return { draft: 'پیش‌نویس', published: 'منتشرشده', inactive: 'غیرفعال' }[status] || status;
}

function reviewStatus(review) {
  if (review.status === 'approved') return 'تأییدشده';
  if (review.status === 'rejected') return `رد شده${review.reason ? ` · ${review.reason}` : ''}`;
  return review.previous ? 'ویرایش در انتظار بررسی' : 'در انتظار بررسی';
}

function combinations(axes, selected) {
  return axes.reduce((rows, axis) => {
    const values = selected[axis.key] || [];
    if (!values.length) return [];
    if (!rows.length) return values.map((value) => ({ [axis.key]: value }));
    return rows.flatMap((row) => values.map((value) => ({ ...row, [axis.key]: value })));
  }, []);
}

function escape(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function shopIcon() {
  return '<svg viewBox="0 0 24 24"><path d="m20 18.6-4.4-4.4a7 7 0 1 0-1.4 1.4l4.4 4.4 1.4-1.4ZM5 10a5 5 0 1 1 10 0 5 5 0 0 1-10 0Z"/></svg>';
}

function toast(text, rerender) {
  ui.toast = text;
  rerender();
  setTimeout(() => { ui.toast = ''; rerender(); }, 2200);
}

function fail(message) {
  const node = document.querySelector('#form-error');
  if (node) node.textContent = message;
}

export function bindProduct(rerender) {
  const root = document.querySelector('[data-product-root]');
  if (!root) return;
  root.addEventListener('click', (event) => onClick(event, rerender));
  root.addEventListener('change', (event) => onChange(event, rerender));
  const search = root.querySelector('#shop-search');
  if (search) {
    search.addEventListener('input', (event) => { ui.shop.q = event.target.value; });
    search.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        runSearch(rerender);
      }
    });
  }
}

function onClick(event, rerender) {
  const tab = event.target.closest('[data-tab]');
  if (tab) { ui.tab = tab.dataset.tab; ui.modal = null; rerender(); return; }
  const brand = event.target.closest('[data-brand]');
  if (brand) { ui.brandId = brand.dataset.brand; rerender(); return; }
  const leaf = event.target.closest('[data-leaf]');
  if (leaf) { ui.leafId = leaf.dataset.leaf; rerender(); return; }
  const product = event.target.closest('[data-product]');
  if (product) { ui.productId = product.dataset.product; rerender(); return; }
  const open = event.target.closest('[data-open]');
  if (open) { openPdp(open.dataset.open); rerender(); return; }
  const page = event.target.closest('[data-page]');
  if (page) { ui.shop.page = Number(page.dataset.page); rerender(); return; }
  const shopNode = event.target.closest('[data-shop-node]');
  if (shopNode) {
    ui.shop.nodeId = shopNode.dataset.shopNode;
    ui.shop.query = '';
    ui.shop.q = '';
    ui.shop.page = 1;
    ui.shop.view = 'list';
    ui.shop.attrs = {};
    rerender();
    return;
  }
  const clear = event.target.closest('[data-clear]');
  if (clear) { clearChip(clear.dataset.clear); rerender(); return; }
  const axis = event.target.closest('[data-axis]');
  if (axis) { pickAxis(axis.dataset.axis, axis.dataset.value, rerender); return; }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  if (action === 'close') { ui.modal = null; rerender(); return; }
  if (action === 'new-brand') { ui.editingId = null; ui.modal = 'brand'; rerender(); return; }
  if (action === 'edit-brand') { ui.editingId = ui.brandId; ui.modal = 'brand'; rerender(); return; }
  if (action === 'save-brand') { saveBrand(rerender); return; }
  if (action === 'toggle-brand') { toggleBrand(rerender); return; }
  if (action === 'toggle-axis') { toggleAxis(event.target.closest('[data-key]').dataset.key, rerender); return; }
  if (action === 'add-attr') { addAttr(event.target.closest('[data-key]').dataset.key, rerender); return; }
  if (action === 'new-product') { ui.editingId = null; ui.modal = 'product'; rerender(); return; }
  if (action === 'edit-product') { ui.editingId = ui.productId; ui.modal = 'product'; rerender(); return; }
  if (action === 'save-product') { saveProduct(rerender); return; }
  if (action === 'make-skus') { ui.skuPick = null; ui.modal = 'sku'; rerender(); return; }
  if (action === 'confirm-skus') { confirmSkus(rerender); return; }
  if (action === 'confirm-base-sku') { confirmBaseSku(rerender); return; }
  if (action === 'ask-publish') { ui.modal = 'publish'; rerender(); return; }
  if (action === 'confirm-publish') { publishProduct(rerender); return; }
  if (action === 'unpublish') { ui.modal = 'unpublish'; rerender(); return; }
  if (action === 'confirm-unpublish') { setStatus('inactive', 'غیرفعال شد', rerender); return; }
  if (action === 'seo-product') { ui.modal = 'seo'; rerender(); return; }
  if (action === 'save-seo') { saveSeo(rerender); return; }
  if (action === 'links-product') { ui.modal = 'links'; rerender(); return; }
  if (action === 'add-link') { addLink(rerender); return; }
  if (action === 'drop-link') { dropLink(Number(event.target.closest('[data-index]').dataset.index), rerender); return; }
  if (action === 'submit-review') { submitReview(rerender); return; }
  if (action === 'approve-review') { approveReview(event.target.closest('[data-id]').dataset.id, rerender); return; }
  if (action === 'reject-review') { ui.rejectId = event.target.closest('[data-id]').dataset.id; ui.modal = 'reject'; rerender(); return; }
  if (action === 'confirm-reject') { rejectReview(rerender); return; }
  if (action === 'run-search') { runSearch(rerender); return; }
  if (action === 'clear-filters') { ui.shop.brands = []; ui.shop.price = ''; ui.shop.availableOnly = false; ui.shop.attrs = {}; ui.shop.page = 1; rerender(); return; }
  if (action === 'toggle-error') { ui.shop.error = !ui.shop.error; rerender(); return; }
  if (action === 'retry-shop') { ui.shop.error = false; rerender(); return; }
  if (action === 'back-list') { ui.shop.view = 'list'; ui.shop.notice = ''; rerender(); return; }
  if (action === 'add-cart') { addCart(rerender); return; }
  if (action === 'wish') { ui.shop.notice = 'به علاقه‌مندی اضافه شد. این عمل خرید یا رزرو نیست.'; rerender(); return; }
  if (action === 'add-compare') { addCompare(event.target.closest('[data-id]').dataset.id, rerender); return; }
  if (action === 'open-compare') { ui.shop.view = 'compare'; rerender(); return; }
  if (action === 'remove-compare') { ui.shop.compare = ui.shop.compare.filter((id) => id !== event.target.closest('[data-id]').dataset.id); rerender(); return; }
}

function onChange(event, rerender) {
  const target = event.target;
  if (target.dataset.field === 'customer') { ui.customerId = target.value; rerender(); return; }
  if (target.id === 'product-leaf') {
    const brandSelect = document.querySelector('#product-brand');
    const current = brandSelect?.value || '';
    const options = brandsForLeaf(target.value);
    if (brandSelect) brandSelect.innerHTML = `<option value="">بدون برند</option>${options.map((brand) => `<option value="${brand.id}">${escape(brand.name)}</option>`).join('')}`;
    if (brandSelect && options.some((brand) => brand.id === current)) brandSelect.value = current;
    return;
  }
  if (target.dataset.filterBrand) {
    const values = new Set(ui.shop.brands);
    target.checked ? values.add(target.dataset.filterBrand) : values.delete(target.dataset.filterBrand);
    ui.shop.brands = [...values];
    ui.shop.page = 1;
    rerender();
    return;
  }
  if (target.dataset.filterPrice) { ui.shop.price = ui.shop.price === target.dataset.filterPrice ? '' : target.dataset.filterPrice; ui.shop.page = 1; rerender(); return; }
  if (target.dataset.filterAvail !== undefined) { ui.shop.availableOnly = target.checked; ui.shop.page = 1; rerender(); return; }
  if (target.dataset.filterAttr) {
    const key = target.dataset.filterAttr;
    const values = new Set(ui.shop.attrs[key] || []);
    target.checked ? values.add(target.value) : values.delete(target.value);
    ui.shop.attrs = { ...ui.shop.attrs, [key]: [...values] };
    ui.shop.page = 1;
    rerender();
    return;
  }
  if (target.dataset.sort !== undefined || target.matches('[data-sort]')) {
    ui.shop.sort = target.value;
    ui.shop.page = 1;
    rerender();
    return;
  }
  if (target.dataset.skuValue) {
    const key = target.dataset.skuValue;
    const values = new Set(ui.skuPick?.[key] || []);
    target.checked ? values.add(target.value) : values.delete(target.value);
    ui.skuPick = { ...ui.skuPick, [key]: [...values] };
    rerender();
    return;
  }
  if (target.dataset.axis) return;
  if (target.dataset.installment !== undefined) { ui.shop.offer = target.checked ? 'installment' : 'cash'; rerender(); return; }
  if (target.dataset.diff !== undefined) { ui.shop.diffOnly = target.checked; rerender(); }
}

function saveBrand(rerender) {
  const name = document.querySelector('#brand-name')?.value.trim();
  const nameEn = document.querySelector('#brand-en')?.value.trim() || '';
  const leafIds = [...document.querySelectorAll('[data-brand-leaf]:checked')].map((node) => node.value);
  if (!name) return fail('نام فارسی برند لازم است.');
  if (duplicateBrand(name, ui.editingId)) return fail('برند با این نام وجود دارد.');
  const blocked = ui.editingId ? publishedUsingBrand(ui.editingId).filter((item) => leafIds.length && !leafIds.includes(item.leafId)) : [];
  if (blocked.length) return fail(`این محصول‌ها با دامنه جدید ناسازگارند: ${blocked.map((item) => item.title).join('، ')}`);
  if (ui.editingId) {
    const brand = brandById(ui.editingId);
    Object.assign(brand, { name, nameEn, leafIds });
    logChange(`ویرایش برند ${name}`);
  } else {
    const id = `brand-${Date.now().toString(36)}`;
    catalog.brands.push({ id, name, nameEn, status: 'active', leafIds });
    ui.brandId = id;
    logChange(`ایجاد برند ${name}`);
  }
  persistCatalog();
  ui.modal = null;
  toast('برند ذخیره شد', rerender);
}

function toggleBrand(rerender) {
  const brand = brandById(ui.brandId);
  if (brand.status === 'active' && publishedUsingBrand(brand.id).length) {
    ui.toast = 'برند دارای محصول منتشرشده است. اول تکلیف آن محصولات را مشخص کن.';
    rerender();
    setTimeout(() => { ui.toast = ''; rerender(); }, 2400);
    return;
  }
  brand.status = brand.status === 'active' ? 'inactive' : 'active';
  logChange(`${brand.status === 'active' ? 'فعال' : 'غیرفعال'} شد: ${brand.name}`);
  persistCatalog();
  toast('وضعیت برند ذخیره شد', rerender);
}

function toggleAxis(key, rerender) {
  const schema = schemaOf(ui.leafId);
  const field = schema.find((item) => item.key === key);
  if (!field.variant && schema.filter((item) => item.variant).length >= 2) {
    ui.toast = 'هر LeafCat حداکثر دو محور Variant دارد.';
    rerender();
    setTimeout(() => { ui.toast = ''; rerender(); }, 2000);
    return;
  }
  const used = catalog.products.some((item) => item.leafId === ui.leafId && item.skus.some((entry) => entry.combo?.[key]));
  if (field.variant && used) {
    catalog.products.forEach((item) => {
      if (item.leafId !== ui.leafId) return;
      item.skus.forEach((entry) => { if (entry.combo?.[key]) entry.incompatible = true; });
    });
  }
  field.variant = !field.variant;
  logChange(`محور ${field.label} در ${ui.leafId} ${field.variant ? 'فعال' : 'برداشته'} شد`);
  persistCatalog();
  rerender();
}

function addAttr(key, rerender) {
  const source = libraryAttributes().find((item) => item.key === key);
  catalog.schemas[ui.leafId] = schemaOf(ui.leafId);
  catalog.schemas[ui.leafId].push({ ...source, filterable: true, variant: false, required: false, active: true });
  logChange(`ویژگی ${source.label} به ${ui.leafId} اضافه شد`);
  persistCatalog();
  rerender();
}

function saveProduct(rerender) {
  const title = document.querySelector('#product-title')?.value.trim() || '';
  const leafId = document.querySelector('#product-leaf')?.value;
  const brandId = document.querySelector('#product-brand')?.value || null;
  const payload = {
    title,
    titleEn: document.querySelector('#product-en')?.value.trim() || '',
    model: document.querySelector('#product-model')?.value.trim() || '',
    leafId,
    brandId,
    image: document.querySelector('#product-image')?.value.trim() || '',
    description: document.querySelector('#product-description')?.value.trim() || '',
    attributes: {},
  };
  document.querySelectorAll('[data-attr]').forEach((node) => { payload.attributes[node.dataset.attr] = node.value.trim(); });
  if (brandId && !brandAllowed(brandById(brandId), leafId)) return fail('این برند برای LeafCat انتخاب‌شده مجاز نیست.');
  if (ui.editingId) {
    const item = productById(ui.editingId);
    const leafChanged = item.leafId !== leafId;
    Object.assign(item, payload);
    if (leafChanged) item.skus.forEach((entry) => { entry.incompatible = true; });
    if (item.status === 'published' && canPublish(item).length) item.status = 'draft';
    logChange(`ویرایش محصول ${item.title || item.id}`);
    ui.productId = item.id;
  } else {
    const id = `prd-${Date.now().toString(36)}`;
    catalog.products.push({ ...payload, id, status: 'draft', publishedAt: '', sales: 0, skus: [], links: [], seo: { slug: id, title: '', description: '', index: true, redirects: [] } });
    ui.productId = id;
    logChange(`ایجاد پیش‌نویس ${title || id}`);
  }
  persistCatalog();
  ui.modal = null;
  toast('پیش‌نویس ذخیره شد', rerender);
}

function confirmSkus(rerender) {
  const item = productById(ui.productId);
  const chosen = [...document.querySelectorAll('[data-combo]:checked')].map((node) => JSON.parse(node.dataset.combo));
  if (!chosen.length) return fail('حداقل یک ترکیب قابل فروش را انتخاب کن.');
  const existing = new Set(item.skus.map(skuIdentity));
  chosen.forEach((combo) => {
    const identity = skuIdentity({ combo });
    if (existing.has(identity)) return;
    const code = `PLAZA-${item.id.toUpperCase()}-${item.skus.length + 1}`;
    item.skus.push({ code, combo, price: 0, compareAt: null, stock: 0, reserved: 0, warranty: 'سلامت و اصالت فیزیکی', shipping: '۲ تا ۴ روز کاری', pickup: false, installment: null, active: true, incompatible: false, barcode: '' });
    existing.add(identity);
  });
  logChange(`SKUهای ${item.title} به‌روزرسانی شد`);
  persistCatalog();
  ui.modal = null;
  toast('SKUها ذخیره شدند', rerender);
}

function confirmBaseSku(rerender) {
  const item = productById(ui.productId);
  if (!item.skus.some((entry) => !Object.keys(entry.combo).length)) {
    item.skus.push({ code: `PLAZA-${item.id.toUpperCase()}-BASE`, combo: {}, price: 0, compareAt: null, stock: 0, reserved: 0, warranty: 'سلامت و اصالت فیزیکی', shipping: '۲ تا ۴ روز کاری', pickup: false, installment: null, active: true, incompatible: false, barcode: '' });
  }
  persistCatalog();
  ui.modal = null;
  toast('SKU پایه ذخیره شد', rerender);
}

function publishProduct(rerender) {
  const item = productById(ui.productId);
  const errors = canPublish(item);
  if (errors.length) { ui.modal = null; toast(errors[0], rerender); return; }
  item.status = 'published';
  if (!item.publishedAt) item.publishedAt = new Date().toISOString().slice(0, 10);
  logChange(`انتشار ${item.title}`);
  persistCatalog();
  ui.modal = null;
  toast('محصول منتشر شد', rerender);
}

function setStatus(status, message, rerender) {
  const item = productById(ui.productId);
  item.status = status;
  logChange(`${message}: ${item.title}`);
  persistCatalog();
  ui.modal = null;
  toast(message, rerender);
}

function saveSeo(rerender) {
  const item = productById(ui.productId);
  const slug = normalize(document.querySelector('#seo-slug')?.value).replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
  if (!slug) return fail('Slug لازم است.');
  if (catalog.products.some((entry) => entry.id !== item.id && entry.seo.slug === slug)) return fail('این Slug قبلاً استفاده شده است.');
  if (slug !== item.seo.slug) item.seo.redirects.push(`/p/${item.seo.slug}`);
  item.seo.slug = slug;
  item.seo.title = document.querySelector('#seo-title')?.value.trim() || '';
  item.seo.description = document.querySelector('#seo-description')?.value.trim() || '';
  item.seo.index = !!document.querySelector('#seo-index')?.checked;
  logChange(`SEO ${item.title} ذخیره شد`);
  persistCatalog();
  ui.modal = null;
  toast('تنظیم SEO ذخیره شد', rerender);
}

function addLink(rerender) {
  const item = productById(ui.productId);
  const productId = document.querySelector('#link-target')?.value;
  const type = document.querySelector('#link-type')?.value;
  if (!productId || productId === item.id) return fail('محصول نمی‌تواند به خودش وصل شود.');
  if (item.links.some((link) => link.productId === productId && link.type === type)) return fail('این اتصال قبلاً ثبت شده است.');
  const order = item.links.filter((link) => link.type === type).length + 1;
  item.links.push({ productId, type, order });
  logChange(`اتصال ${type} برای ${item.title}`);
  persistCatalog();
  rerender();
}

function dropLink(index, rerender) {
  const item = productById(ui.productId);
  item.links.splice(index, 1);
  persistCatalog();
  rerender();
}

function submitReview(rerender) {
  const customer = customerById(ui.customerId);
  const productId = document.querySelector('[data-field="review-product"]')?.value;
  const score = Number(document.querySelector('[data-field="review-score"]')?.value);
  const text = document.querySelector('[data-field="review-text"]')?.value.trim();
  if (!productId || !customer.purchases.includes(productId)) return toast('ثبت نظر فقط برای محصول خریداری‌شده ممکن است.', rerender);
  if (!text || score < 1 || score > 5) return toast('امتیاز و متن نظر لازم است.', rerender);
  const existing = catalog.reviews.find((review) => review.productId === productId && review.customerId === customer.id && review.status !== 'rejected');
  if (existing?.status === 'approved') {
    existing.previous = { score: existing.score, text: existing.text };
    existing.score = score;
    existing.text = text;
    existing.status = 'pending';
    existing.reason = '';
  } else if (existing) {
    existing.score = score;
    existing.text = text;
    existing.status = 'pending';
  } else {
    catalog.reviews.push({ id: `rev-${Date.now().toString(36)}`, productId, customerId: customer.id, score, text, status: 'pending', reason: '', previous: null });
  }
  persistCatalog();
  toast('نظر برای بررسی ثبت شد', rerender);
}

function approveReview(id, rerender) {
  const review = catalog.reviews.find((item) => item.id === id);
  review.status = 'approved';
  review.previous = null;
  review.reason = '';
  logChange('تأیید نظر');
  persistCatalog();
  toast('نظر تأیید و در PDP نمایش داده می‌شود', rerender);
}

function rejectReview(rerender) {
  const reason = document.querySelector('#reject-reason')?.value.trim();
  if (!reason) return fail('دلیل رد لازم است.');
  const review = catalog.reviews.find((item) => item.id === ui.rejectId);
  if (review.previous) {
    review.score = review.previous.score;
    review.text = review.previous.text;
    review.previous = null;
    review.status = 'approved';
    review.reason = reason;
  } else {
    review.status = 'rejected';
    review.reason = reason;
  }
  logChange('رد نظر');
  persistCatalog();
  ui.modal = null;
  toast('نتیجه رد برای نویسنده ثبت شد', rerender);
}

function runSearch(rerender) {
  const input = document.querySelector('#shop-search');
  const query = input?.value.trim() || '';
  if (!query) {
    ui.shop.notice = '';
    toast('عبارت جست‌وجو خالی است و اجرا نشد.', rerender);
    return;
  }
  ui.shop.q = query;
  ui.shop.query = query;
  ui.shop.page = 1;
  ui.shop.view = 'list';
  ui.shop.sort = 'relevance';
  const count = runShop().items.length;
  catalog.searches.unshift({ query, count, at: new Date().toISOString() });
  persistCatalog();
  rerender();
}

function clearChip(id) {
  ui.shop.page = 1;
  if (id.startsWith('brand:')) ui.shop.brands = ui.shop.brands.filter((item) => item !== id.slice(6));
  else if (id === 'price') ui.shop.price = '';
  else if (id === 'avail') ui.shop.availableOnly = false;
  else if (id.startsWith('attr:')) {
    const [, key, ...rest] = id.split(':');
    const value = rest.join(':');
    ui.shop.attrs = { ...ui.shop.attrs, [key]: (ui.shop.attrs[key] || []).filter((item) => item !== value) };
  }
}

function openPdp(id) {
  const item = productById(id);
  if (!item || !isPublicProduct(item)) {
    ui.shop.notice = 'این محصول دیگر برای نمایش عمومی معتبر نیست.';
    ui.shop.view = 'list';
    return;
  }
  ui.shop.productId = id;
  ui.shop.skuId = displaySku(item)?.code || item.skus[0]?.code || null;
  ui.shop.offer = 'cash';
  ui.shop.notice = '';
  ui.shop.view = 'pdp';
  ui.shop.listKey = `${ui.shop.nodeId}|${ui.shop.query}|${ui.shop.page}|${ui.shop.sort}`;
}

function addCart(rerender) {
  const item = productById(ui.shop.productId);
  const sku = item?.skus.find((entry) => entry.code === ui.shop.skuId);
  const fresh = item?.skus.find((entry) => entry.code === sku?.code);
  if (!fresh || !purchasable(fresh)) {
    ui.shop.notice = 'قیمت یا موجودی این SKU دیگر اجازه افزودن به سبد را نمی‌دهد.';
    rerender();
    return;
  }
  catalog.cart.push({ sku: fresh.code, price: fresh.price, qty: 1 });
  persistCatalog();
  ui.shop.notice = `به سبد اضافه شد. موجودی رزرو نشد و ${fa(catalog.cart.length)} قلم در سبد نمونه است.`;
  rerender();
}

function addCompare(id, rerender) {
  const item = productById(id);
  if (!item || !isPublicProduct(item)) return toast('فقط محصول منتشرشده قابل مقایسه است.', rerender);
  if (ui.shop.compare.includes(id)) return toast('این محصول در فهرست مقایسه هست.', rerender);
  if (ui.shop.compare.length >= 4) return toast('حداکثر چهار محصول قابل مقایسه است.', rerender);
  const first = productById(ui.shop.compare[0]);
  if (first && first.leafId !== item.leafId) return toast('مقایسه فقط بین محصولات یک LeafCat ممکن است.', rerender);
  ui.shop.compare.push(id);
  ui.shop.notice = 'به مقایسه اضافه شد.';
  toast('به مقایسه اضافه شد', rerender);
}

function pickAxis(axis, value, rerender) {
  const item = productById(ui.shop.productId);
  const current = item.skus.find((entry) => entry.code === ui.shop.skuId) || displaySku(item);
  const nextCombo = { ...(current?.combo || {}), [axis]: value };
  const exact = item.skus.find((entry) => variantAxes(item.leafId).every((entryAxis) => entry.combo?.[entryAxis.key] === nextCombo[entryAxis.key]));
  const fallback = item.skus.find((entry) => entry.combo?.[axis] === value);
  const chosen = exact || fallback;
  if (!chosen) return;
  ui.shop.skuId = chosen.code;
  if (!chosen.installment) ui.shop.offer = 'cash';
  ui.shop.notice = '';
  rerender();
}

export function openProductGaps() {
  ui.modal = 'decisions';
}
