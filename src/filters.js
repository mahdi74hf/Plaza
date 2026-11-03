import {
  BUILTIN_FILTERS,
  activeLeaves,
  brandById,
  catalog,
  ensureFilterPanel,
  fa,
  facetValues,
  filterDisplayTitle,
  filterPanelOf,
  filterSourceMeta,
  filterTypeLabel,
  isPublicProduct,
  logChange,
  moveFilterItem,
  passesFilters,
  persistCatalog,
  priceBucketsFor,
  rangeBucketsFor,
  toman,
  visibleFilterItems,
} from './catalog.js';
import { pathLabel } from './tree.js';

export const filterUi = {
  preview: emptyPreview(),
};

function emptyPreview() {
  return {
    brands: [],
    price: '',
    priceMin: '',
    priceMax: '',
    availableOnly: false,
    color: [],
    warranty: [],
    attrs: {},
    ranges: {},
    filterQuery: {},
    open: {},
  };
}

function escape(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function productsOnLeaf(leafId) {
  return catalog.products.filter((item) => item.leafId === leafId && isPublicProduct(item));
}

export function filtersView() {
  const leaves = activeLeaves();
  const leaf = leaves.find((item) => item.node.id === filterHostLeaf()) || leaves[0];
  if (leaf) setHostLeaf(leaf.node.id);
  const leafId = filterHostLeaf();
  const panel = leafId ? ensureFilterPanel(leafId) : { items: [] };
  return `<div class="workspace">
    <section class="card tree-card">
      <div class="card-head"><div><h2>LeafCat فعال</h2><p>فیلترهای عمومی روی همه دسته‌ها از اول روشن‌اند.</p></div><span>${fa(panel.items.length)} فیلتر</span></div>
      <div class="entity-list">${leaves.map(({ node }) => `<button class="entity-row ${node.id === leafId ? 'selected' : ''}" data-leaf="${node.id}"><b>${escape(node.name)}</b><small>${escape(pathLabel(node.id))}</small></button>`).join('') || '<p class="empty-copy">LeafCat فعالی در CAT Tree نیست.</p>'}</div>
    </section>
    ${leaf ? `<section class="card detail-card">
      <div class="detail-head"><div><span class="type-pill leafcat">PRD-071</span><h2>فیلترهای ${escape(leaf.node.name)}</h2><p>ترتیب، عنوان اختصاصی، باز یا بسته بودن و Bucket همین دسته</p></div></div>
      <div class="schema-list filter-admin">${panel.items.map((item, index) => filterRow(leafId, item, index, panel.items.length)).join('')}</div>
      <p class="form-note">نوع کنترل و جست‌وجوی داخل فیلتر از تعریف ویژگی می‌آید و اینجا عوض نمی‌شود.</p>
    </section>
    <section class="card detail-card filter-preview-card">
      <div class="detail-head"><div><span class="type-pill">PLP</span><h2>پیش‌نمایش فهرست</h2><p>همان تنظیمات روی محصولات منتشرشدهٔ این دسته</p></div>
      <button type="button" class="action-button" data-action="reset-filter-preview">پاک‌کردن فیلترها</button></div>
      ${plpPreview(leafId)}
    </section>` : ''}
  </div>`;
}

function filterHostLeaf() {
  return window.__plazaFilterLeaf || '';
}

function setHostLeaf(id) {
  window.__plazaFilterLeaf = id;
}

function filterRow(leafId, item, index, total) {
  const meta = filterSourceMeta(leafId, item.id);
  const builtin = BUILTIN_FILTERS.some((entry) => entry.id === item.id);
  const range = meta?.type === 'range';
  return `<article class="filter-admin-row">
    <div class="filter-admin-main">
      <b>${escape(filterDisplayTitle(leafId, item))}</b>
      <small>${builtin ? 'پیش‌فرض همه دسته‌ها' : 'ویژگی' } · ${escape(filterTypeLabel(meta?.type))} · ${meta?.search ? 'جست‌وجو دارد' : 'بدون جست‌وجو'}${item.collapsed ? ' · پیش‌فرض بسته' : ' · پیش‌فرض باز'}</small>
    </div>
    <div class="filter-admin-controls">
      <label class="check-line"><input type="checkbox" data-filter-visible="${item.id}" ${item.visible ? 'checked' : ''}/>نمایش</label>
      <label class="check-line"><input type="checkbox" data-filter-collapsed="${item.id}" ${item.collapsed ? 'checked' : ''}/>بسته</label>
      <label><span>عنوان اختصاصی</span><input data-filter-title="${item.id}" value="${escape(item.title)}" placeholder="${escape(meta?.label || '')}" /></label>
      <div class="detail-actions">
        <button type="button" class="action-button" data-action="move-filter" data-id="${item.id}" data-delta="-1" ${index === 0 ? 'disabled' : ''}>بالا</button>
        <button type="button" class="action-button" data-action="move-filter" data-id="${item.id}" data-delta="1" ${index === total - 1 ? 'disabled' : ''}>پایین</button>
      </div>
    </div>
    ${range ? bucketEditor(leafId, item) : ''}
  </article>`;
}

function bucketEditor(leafId, item) {
  const buckets = item.buckets || [];
  return `<div class="bucket-box">
    <span>بازه‌های ${escape(filterDisplayTitle(leafId, item))}</span>
    ${buckets.map((bucket) => `<div class="bucket-row"><b>${escape(bucket.label)}</b><small>${fa(bucket.min)} تا ${bucket.max == null || bucket.max === Infinity ? '∞' : fa(bucket.max)}</small><button type="button" class="action-button" data-action="drop-bucket" data-id="${item.id}" data-bucket="${bucket.id}">حذف</button></div>`).join('') || '<p class="empty-copy">بدون Bucket، مشتری کمینه و بیشینه آزاد می‌گذارد.</p>'}
    <div class="bucket-form">
      <input data-bucket-label="${item.id}" placeholder="عنوان بازه، مثلاً تا ۲۰ میلیون" />
      <input data-bucket-min="${item.id}" inputmode="numeric" placeholder="از" />
      <input data-bucket-max="${item.id}" inputmode="numeric" placeholder="تا، خالی یعنی بی‌نهایت" />
      <button type="button" class="action-button" data-action="add-bucket" data-id="${item.id}">افزودن بازه</button>
    </div>
  </div>`;
}

function previewFilters() {
  return filterUi.preview;
}

function filteredProducts(leafId) {
  return productsOnLeaf(leafId).filter((item) => passesFilters(item, previewFilters()));
}

function plpPreview(leafId) {
  const items = filteredProducts(leafId);
  const total = productsOnLeaf(leafId).length;
  const panel = visibleFilterItems(leafId);
  return `<div class="plp-layout">
    <aside class="filter-panel">${panel.map((item) => plpGroup(leafId, item, productsOnLeaf(leafId))).join('') || '<p class="empty-copy">هیچ فیلتری برای نمایش روشن نیست.</p>'}</aside>
    <div>
      <p class="form-note">${fa(items.length)} از ${fa(total)} محصول</p>
      <div class="card-grid">${items.map((item) => `<article class="product-card"><div class="thumb">${escape(item.image || item.title)}</div><h3>${escape(item.title)}</h3><small>${escape(brandById(item.brandId)?.name || 'بدون برند')}</small><strong>${item.skus[0]?.price ? toman(item.skus[0].price) : 'بدون قیمت'}</strong></article>`).join('') || '<p class="empty-copy">با این فیلتر محصولی نماند.</p>'}</div>
    </div>
  </div>`;
}

function plpGroup(leafId, item, products) {
  const meta = filterSourceMeta(leafId, item.id);
  const preview = previewFilters();
  const open = preview.open[item.id] ?? !item.collapsed;
  const query = preview.filterQuery[item.id] || '';
  let body = '';
  if (item.id === 'price') body = priceGroup(leafId);
  else if (item.id === 'availability') {
    body = `<label class="check-line"><input type="checkbox" data-plp-avail ${preview.availableOnly ? 'checked' : ''}/>فقط موجودها</label>`;
  } else {
    let values = facetValues(products, item.id, leafId);
    if (meta?.search && query) values = values.filter((value) => labelOf(item.id, value).includes(query));
    if (meta?.type === 'range') body = rangeGroup(leafId, item);
    else body = valueList(item, meta, values);
  }
  return `<div class="filter-block ${open ? 'open' : ''}">
    <button type="button" class="filter-block-head" data-action="toggle-plp-group" data-id="${item.id}"><b>${escape(filterDisplayTitle(leafId, item))}</b><span>${open ? '−' : '+'}</span></button>
    ${open ? `${meta?.search && meta?.type !== 'range' ? `<input class="filter-search" data-plp-search="${item.id}" value="${escape(query)}" placeholder="جست‌وجو در ${escape(filterDisplayTitle(leafId, item))}" />` : ''}${body}` : ''}
  </div>`;
}

function labelOf(filterId, value) {
  if (filterId === 'brand') return brandById(value)?.name || value;
  return String(value);
}

function valueList(item, meta, values) {
  const selected = selectedValues(item.id);
  const radio = meta?.type === 'radio';
  return `<div class="check-grid">${values.map((value) => {
    const checked = selected.includes(value);
    return `<label class="chip-button ${checked ? 'active' : ''}"><input type="${radio ? 'radio' : 'checkbox'}" name="plp-${item.id}" data-plp-value="${item.id}" value="${escape(value)}" ${checked ? 'checked' : ''}/>${escape(labelOf(item.id, value))}</label>`;
  }).join('') || '<p class="empty-copy">مقداری نیست.</p>'}</div>`;
}

function selectedValues(id) {
  const preview = previewFilters();
  if (id === 'brand') return preview.brands;
  if (id === 'color') return preview.color;
  if (id === 'warranty') return preview.warranty;
  if (id.startsWith('attr:')) return preview.attrs[id.slice(5)] || [];
  return [];
}

function priceGroup(leafId) {
  const preview = previewFilters();
  const buckets = priceBucketsFor(leafId);
  return `${buckets.map((bucket) => `<label class="chip-button ${preview.price === bucket.id ? 'active' : ''}"><input type="radio" name="plp-price" data-plp-price value="${bucket.id}" ${preview.price === bucket.id ? 'checked' : ''}/>${escape(bucket.label)}</label>`).join('')}
    <div class="range-free"><input data-plp-price-min value="${escape(preview.priceMin)}" placeholder="از تومان" /><input data-plp-price-max value="${escape(preview.priceMax)}" placeholder="تا تومان" /></div>`;
}

function rangeGroup(leafId, item) {
  const key = item.id.slice(5);
  const spec = previewFilters().ranges[key] || { bucket: '', min: '', max: '' };
  const buckets = rangeBucketsFor(leafId, item.id);
  return `${buckets.map((bucket) => `<label class="chip-button ${spec.bucket === bucket.id ? 'active' : ''}"><input type="radio" name="plp-range-${item.id}" data-plp-range="${item.id}" value="${bucket.id}" ${spec.bucket === bucket.id ? 'checked' : ''}/>${escape(bucket.label)}</label>`).join('')}
    <div class="range-free"><input data-plp-range-min="${item.id}" value="${escape(spec.min)}" placeholder="از" /><input data-plp-range-max="${item.id}" value="${escape(spec.max)}" placeholder="تا" /></div>`;
}

export function bindFilterHost(leafId) {
  if (leafId) setHostLeaf(leafId);
}

export function handleFiltersClick(action, host, rerender) {
  const leafId = filterHostLeaf();
  if (action === 'move-filter') {
    if (moveFilterItem(leafId, host.dataset.id, Number(host.dataset.delta))) {
      persistCatalog();
      logChange(`ترتیب فیلتر ${filterDisplayTitle(leafId, { id: host.dataset.id, title: '' })}`);
      rerender();
    }
    return true;
  }
  if (action === 'add-bucket') {
    addBucket(leafId, host.dataset.id);
    rerender();
    return true;
  }
  if (action === 'drop-bucket') {
    const item = filterPanelOf(leafId).items.find((row) => row.id === host.dataset.id);
    if (item) {
      item.buckets = (item.buckets || []).filter((bucket) => bucket.id !== host.dataset.bucket);
      persistCatalog();
      rerender();
    }
    return true;
  }
  if (action === 'reset-filter-preview') {
    filterUi.preview = emptyPreview();
    rerender();
    return true;
  }
  if (action === 'toggle-plp-group') {
    filterUi.preview.open[host.dataset.id] = !(filterUi.preview.open[host.dataset.id] ?? !filterPanelOf(leafId).items.find((row) => row.id === host.dataset.id)?.collapsed);
    rerender();
    return true;
  }
  return false;
}

function addBucket(leafId, id) {
  const label = document.querySelector(`[data-bucket-label="${id}"]`)?.value.trim();
  const min = Number(document.querySelector(`[data-bucket-min="${id}"]`)?.value);
  const maxRaw = document.querySelector(`[data-bucket-max="${id}"]`)?.value.trim();
  const max = maxRaw === '' ? Infinity : Number(maxRaw);
  if (!label) return;
  if (!Number.isFinite(min) || (!Number.isFinite(max) && max !== Infinity)) return;
  if (max !== Infinity && max <= min) return;
  const item = filterPanelOf(leafId).items.find((row) => row.id === id);
  if (!item) return;
  const overlap = (item.buckets || []).some((bucket) => {
    const bMax = bucket.max == null || bucket.max === Infinity ? Infinity : bucket.max;
    return min < bMax && (max === Infinity ? Infinity : max) > bucket.min;
  });
  if (overlap) return;
  item.buckets = [...(item.buckets || []), { id: `b-${Date.now().toString(36)}`, label, min, max }];
  persistCatalog();
  logChange(`بازه فیلتر ${filterDisplayTitle(leafId, item)}`);
}

export function handleFiltersChange(target, rerender) {
  const leafId = filterHostLeaf();
  if (target.dataset.filterVisible) {
    const item = filterPanelOf(leafId).items.find((row) => row.id === target.dataset.filterVisible);
    if (item) {
      item.visible = target.checked;
      persistCatalog();
      rerender();
    }
    return true;
  }
  if (target.dataset.filterCollapsed) {
    const item = filterPanelOf(leafId).items.find((row) => row.id === target.dataset.filterCollapsed);
    if (item) {
      item.collapsed = target.checked;
      persistCatalog();
      rerender();
    }
    return true;
  }
  if (target.dataset.filterTitle) {
    const item = filterPanelOf(leafId).items.find((row) => row.id === target.dataset.filterTitle);
    if (item) {
      item.title = target.value;
      persistCatalog();
    }
    return true;
  }
  if (target.dataset.plpAvail !== undefined) {
    filterUi.preview.availableOnly = target.checked;
    rerender();
    return true;
  }
  if (target.dataset.plpPrice !== undefined) {
    filterUi.preview.price = target.checked ? target.value : '';
    filterUi.preview.priceMin = '';
    filterUi.preview.priceMax = '';
    rerender();
    return true;
  }
  if (target.dataset.plpPriceMin !== undefined || target.dataset.plpPriceMax !== undefined) {
    filterUi.preview.price = '';
    filterUi.preview.priceMin = document.querySelector('[data-plp-price-min]')?.value ?? '';
    filterUi.preview.priceMax = document.querySelector('[data-plp-price-max]')?.value ?? '';
    rerender();
    return true;
  }
  if (target.dataset.plpRange) {
    const key = target.dataset.plpRange.slice(5);
    filterUi.preview.ranges[key] = { bucket: target.value, min: '', max: '' };
    rerender();
    return true;
  }
  if (target.dataset.plpRangeMin || target.dataset.plpRangeMax) {
    const id = target.dataset.plpRangeMin || target.dataset.plpRangeMax;
    const key = id.slice(5);
    filterUi.preview.ranges[key] = {
      bucket: '',
      min: document.querySelector(`[data-plp-range-min="${id}"]`)?.value ?? '',
      max: document.querySelector(`[data-plp-range-max="${id}"]`)?.value ?? '',
    };
    rerender();
    return true;
  }
  if (target.dataset.plpSearch) {
    filterUi.preview.filterQuery[target.dataset.plpSearch] = target.value;
    rerender();
    return true;
  }
  if (target.dataset.plpValue) {
    setPreviewValue(target.dataset.plpValue, target.value, target.type === 'radio' ? true : target.checked);
    rerender();
    return true;
  }
  return false;
}

function setPreviewValue(id, value, on) {
  const preview = filterUi.preview;
  if (id === 'brand') {
    preview.brands = targetRadio(id, preview.brands, value, on);
    return;
  }
  if (id === 'color') {
    preview.color = targetRadio(id, preview.color, value, on);
    return;
  }
  if (id === 'warranty') {
    preview.warranty = targetRadio(id, preview.warranty, value, on);
    return;
  }
  if (id.startsWith('attr:')) {
    const key = id.slice(5);
    const current = preview.attrs[key] || [];
    preview.attrs[key] = targetRadio(id, current, value, on);
  }
}

function targetRadio(id, list, value, on) {
  const meta = filterSourceMeta(filterHostLeaf(), id);
  if (meta?.type === 'radio') return on ? [value] : [];
  if (on && !list.includes(value)) return [...list, value];
  if (!on) return list.filter((item) => item !== value);
  return list;
}

export function filterableHint(field) {
  if (!field?.filterable) return '';
  return ` · فیلتر ${filterTypeLabel(field.filterType)}${field.filterSearch ? ' با جست‌وجو' : ''}`;
}

