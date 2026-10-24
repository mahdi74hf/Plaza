import { brandById, catalog, fa, normalize, sellable, toman } from './catalog.js';
import { findNode } from './tree.js';

const KEY = 'plaza-search-demo-v2';

const extras = [
  {
    id: 'glass',
    title: 'گلس گوشی سامسونگ',
    titleEn: 'Samsung Glass',
    model: 'GL-S25',
    leafId: 'phone-accessory',
    leafName: 'لوازم جانبی موبایل',
    kind: 'accessory',
    brandId: 'samsung',
    sales: 80,
    skus: [{ code: 'PLAZA-GLASS-S25', price: 290_000, stock: 20, reserved: 0 }],
    aliases: [],
  },
  {
    id: 'case',
    title: 'کاور گوشی آیفون',
    titleEn: 'iPhone Case',
    model: 'CV-16',
    leafId: 'phone-accessory',
    leafName: 'لوازم جانبی موبایل',
    kind: 'accessory',
    brandId: 'apple',
    sales: 40,
    skus: [{ code: 'PLAZA-CASE-16', price: 450_000, stock: 0, reserved: 0 }],
    aliases: [],
  },
];

const defaultMaps = [
  { from: 'کلس', to: 'گلس', both: false },
  { from: 'کلش', to: 'گلس', both: false },
  { from: 'گوشی', to: 'موبایل', both: true },
];

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

const saved = load();

const ui = {
  mode: 'shop',
  loggedIn: true,
  query: '',
  open: false,
  sort: 'relevance',
  onlyStock: false,
  notice: '',
  recents: saved.recents || ['آیفون', 'گلکسی'],
  counts: saved.counts || { موبایل: 42, گلس: 28, بخاری: 17, آیفون: 15 },
  maps: saved.maps || defaultMaps,
  log: saved.log || [],
};

function persist() {
  localStorage.setItem(KEY, JSON.stringify({
    recents: ui.recents,
    counts: ui.counts,
    maps: ui.maps,
    log: ui.log.slice(0, 30),
  }));
}

function compact(value) {
  return normalize(value).replace(/\s+/g, '');
}

function products() {
  return [
    ...catalog.products.filter((item) => item.status === 'published').map((item) => ({
      ...item,
      leafName: findNode(item.leafId)?.node?.name || item.leafId,
      kind: item.leafId === 'phone' ? 'phone' : 'other',
      aliases: [],
    })),
    ...extras,
  ];
}

function bestSku(item) {
  const rows = item.skus || [];
  return rows.find((sku) => sellable(sku) > 0) || rows[0] || null;
}

function expandQuery(raw) {
  let text = normalize(raw);
  const applied = [];
  ui.maps.forEach((rule) => {
    const from = normalize(rule.from);
    const to = normalize(rule.to);
    if (!from || !to || rule.both) return;
    if (text === from || text.split(' ').includes(from)) {
      text = text.split(' ').map((part) => (part === from ? to : part)).join(' ');
      applied.push(`${rule.from} ← ${rule.to}`);
    }
  });
  const words = new Set(text.split(' ').filter(Boolean));
  ui.maps.forEach((rule) => {
    if (!rule.both) return;
    const from = normalize(rule.from);
    const to = normalize(rule.to);
    if (words.has(from)) words.add(to);
    if (words.has(to)) words.add(from);
  });
  return { text, words: [...words], applied };
}

function score(item, expanded, raw) {
  const sku = bestSku(item);
  const title = normalize(item.title);
  const bag = compact([item.title, item.titleEn, item.model, brandById(item.brandId)?.name, ...(item.aliases || []), sku?.code].join(' '));
  const qCompact = compact(expanded.text);
  const rawCompact = compact(raw);
  let rank = 0;
  let why = 'جزئی';
  if (sku && (compact(sku.code) === qCompact || compact(sku.code) === rawCompact)) {
    rank = 1000;
    why = 'SKU دقیق';
  } else if (compact(title) === qCompact || title === expanded.text) {
    rank = 800;
    why = 'عنوان کامل';
  } else if ([item.model, brandById(item.brandId)?.name, ...(item.aliases || [])].some((part) => part && (normalize(part) === expanded.text || compact(part) === qCompact))) {
    rank = 600;
    why = 'مدل یا برند';
  } else if (qCompact.length >= 2 && (bag.includes(qCompact) || expanded.words.some((word) => word.length >= 2 && bag.includes(compact(word))))) {
    rank = 200;
    why = 'تطابق جزئی';
  } else {
    return null;
  }

  const asksAccessory = expanded.words.some((word) => ['گلس', 'کاور', 'محافظ'].includes(word));
  const asksPhone = expanded.words.some((word) => ['گوشی', 'موبایل', 'آیفون'].includes(word));
  if (asksAccessory && item.kind === 'accessory') rank += 120;
  if (asksPhone && !asksAccessory && item.kind === 'phone') rank += 120;
  if (asksPhone && !asksAccessory && item.kind === 'accessory') rank -= 40;

  return { item, sku, rank, why, stock: sku ? sellable(sku) : 0 };
}

function results() {
  const raw = ui.query.trim();
  if (compact(raw).length < 2) return { rows: [], expanded: null };
  const expanded = expandQuery(raw);
  let rows = products().map((item) => score(item, expanded, raw)).filter(Boolean);
  if (ui.onlyStock) rows = rows.filter((row) => row.stock > 0);
  rows.sort((a, b) => {
    if (ui.sort === 'cheap') return (a.sku?.price || 0) - (b.sku?.price || 0);
    if (ui.sort === 'expensive') return (b.sku?.price || 0) - (a.sku?.price || 0);
    if (ui.sort === 'bestseller') return b.item.sales - a.item.sales;
    if (b.rank !== a.rank) return b.rank - a.rank;
    if ((b.stock > 0) !== (a.stock > 0)) return b.stock > 0 ? 1 : -1;
    return b.item.sales - a.item.sales;
  });
  return { rows, expanded };
}

function remember(query) {
  const text = normalize(query);
  if (text.length < 2) return;
  ui.counts[text] = (ui.counts[text] || 0) + 1;
  ui.log.unshift({ query: text, at: new Date().toLocaleTimeString('fa-IR'), hits: results().rows.length });
  if (ui.loggedIn) {
    ui.recents = [text, ...ui.recents.filter((item) => item !== text)].slice(0, 6);
  }
  persist();
}

function popular() {
  return Object.entries(ui.counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
}

function money(sku) {
  return sku ? toman(sku.price) : 'بدون قیمت';
}

function shop() {
  const { rows, expanded } = results();
  const suggestions = ui.loggedIn && ui.recents.length ? ui.recents : popular().map(([query]) => query);
  const suggestionLabel = ui.loggedIn && ui.recents.length ? 'جست‌وجوهای اخیر' : 'پرجستجوترین‌ها';
  const showSuggest = compact(ui.query).length < 2;
  return `<section class="srch">
    <div class="srch-top">
      <div>
        <span class="eyebrow">STOREFRONT · PRD-004</span>
        <h1>جست‌وجوی پلازا</h1>
        <p>نمونهٔ ویترین. قیمت روی کارت از خود سرچ است.</p>
      </div>
      <label class="srch-login"><input type="checkbox" data-srch-login ${ui.loggedIn ? 'checked' : ''} /> وارد شده به‌عنوان سارا</label>
    </div>
    <div class="srch-box">
      <input data-srch-query value="${escape(ui.query)}" placeholder="جست‌وجوی محصول، برند یا مدل" />
      ${ui.query ? '<button type="button" data-srch-clear>پاک کردن</button>' : ''}
    </div>
    ${expanded?.applied.length ? `<p class="srch-fix">اصلاح شد: ${expanded.applied.map(escape).join('، ')}. عبارت جست‌وجو: ${escape(expanded.text)}</p>` : ''}
    ${showSuggest ? `<div class="srch-suggest"><div><b>${suggestionLabel}</b>${ui.loggedIn && ui.recents.length ? '<button type="button" data-srch-clear-all>حذف همه</button>' : ''}</div>${suggestions.map((item) => `<span><button type="button" data-srch-pick="${escape(item)}">${escape(item)}</button>${ui.loggedIn && ui.recents.length ? `<button type="button" data-srch-del="${escape(item)}" aria-label="حذف">×</button>` : ''}</span>`).join('')}</div>` : ''}
    ${compact(ui.query).length >= 2 ? `<div class="srch-tools"><span>${fa(rows.length)} محصول</span><label><input type="checkbox" data-srch-stock ${ui.onlyStock ? 'checked' : ''} /> فقط موجود</label><select data-srch-sort><option value="relevance" ${ui.sort === 'relevance' ? 'selected' : ''}>مرتبط‌ترین</option><option value="cheap" ${ui.sort === 'cheap' ? 'selected' : ''}>ارزان‌ترین</option><option value="expensive" ${ui.sort === 'expensive' ? 'selected' : ''}>گران‌ترین</option><option value="bestseller" ${ui.sort === 'bestseller' ? 'selected' : ''}>پرفروش‌ترین</option></select></div>
    <div class="srch-grid">${rows.length ? rows.map(card).join('') : '<p class="srch-empty">نتیجه‌ای پیدا نشد. عبارت را عوض کن.</p>'}</div>` : '<div class="srch-hints"><b>چند عبارت را امتحان کن</b><button type="button" data-srch-pick="موبایل">موبایل</button><button type="button" data-srch-pick="گ   وشی موبایل">گ   وشی موبایل</button><button type="button" data-srch-pick="کلس">کلس</button><button type="button" data-srch-pick="کلش">کلش</button><button type="button" data-srch-pick="آیفون">آیفون</button><button type="button" data-srch-pick="PLAZA-IPHONE-BLK-256">SKU آیفون</button></div>'}
    ${ui.notice ? `<p class="srch-note">${escape(ui.notice)}</p>` : ''}
  </section>`;
}

function card(row) {
  const available = row.stock > 0;
  return `<article class="srch-card">
    <div><b>${escape(row.item.title)}</b><small>${escape(row.item.leafName)} · ${escape(row.why)}</small></div>
    <strong>${money(row.sku)}</strong>
    <em class="${available ? 'ok' : ''}">${available ? `موجود ${fa(row.stock)}` : 'ناموجود'}</em>
    <button type="button" data-srch-open="${row.item.id}">دیدن در صفحه محصول</button>
  </article>`;
}

function admin() {
  const top = popular();
  const zero = ui.log.filter((row) => row.hits === 0);
  return `<section class="srch">
    <div class="srch-top"><div><span class="eyebrow">ADMIN · PRD-004</span><h1>همسان‌سازی سرچ</h1><p>هر عبارتی که مشتری می‌زند را به کلمه‌ای که باید جست‌وجو شود وصل کن. Alias جدا تعریف نشده؛ همین جدول است.</p></div></div>
    <article class="srch-map">
      <form data-srch-map>
        <input name="from" placeholder="عبارت مشتری، مثل کلش" />
        <input name="to" placeholder="جست‌وجو شود، مثل گلس" />
        <label><input type="checkbox" name="both" /> دو طرفه</label>
        <button class="primary" type="submit">افزودن</button>
      </form>
      <table>
        <thead><tr><th>مشتری می‌زند</th><th>جست‌وجو می‌شود</th><th>جهت</th><th></th></tr></thead>
        <tbody>${ui.maps.map((rule, index) => `<tr><td>${escape(rule.from)}</td><td>${escape(rule.to)}</td><td>${rule.both ? 'هر دو طرف' : 'فقط همین جهت'}</td><td><button type="button" data-srch-map-del="${index}">حذف</button></td></tr>`).join('')}</tbody>
      </table>
      <p>یک‌طرفه یعنی «کلش» همان «گلس» است و در کادر اصلاح می‌شود. دو طرفه یعنی «گوشی» و «موبایل» هر دو یک جست‌وجو هستند و عبارت مشتری عوض نمی‌شود.</p>
    </article>
    <div class="srch-admin">
      <article><h2>پرجستجو</h2>${top.map(([query, count]) => `<p>${escape(query)} <b>${fa(count)}</b></p>`).join('') || '<p>هنوز جست‌وجویی نیست.</p>'}</article>
      <article><h2>بدون نتیجه</h2>${zero.length ? zero.slice(0, 6).map((row) => `<p>${escape(row.query)} <small>${escape(row.at)}</small></p>`).join('') : '<p>موردی نیست.</p>'}</article>
    </div>
  </section>`;
}

function escape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function searchContent() {
  return `<div class="srch-shell">
    <div class="prd-tabs"><button type="button" class="${ui.mode === 'shop' ? 'active' : ''}" data-srch-mode="shop">ویترین<small>SRCH</small></button><button type="button" class="${ui.mode === 'admin' ? 'active' : ''}" data-srch-mode="admin">ادمین سرچ<small>SRCH-11</small></button></div>
    ${ui.mode === 'admin' ? admin() : shop()}
  </div>`;
}

export function bindSearch(render) {
  document.querySelectorAll('[data-srch-mode]').forEach((button) => button.addEventListener('click', () => {
    ui.mode = button.dataset.srchMode;
    render();
  }));
  const input = document.querySelector('[data-srch-query]');
  input?.addEventListener('input', (event) => {
    ui.query = event.target.value;
    ui.open = true;
    render();
    const next = document.querySelector('[data-srch-query]');
    if (next) {
      next.focus();
      const pos = next.value.length;
      next.setSelectionRange(pos, pos);
    }
  });
  input?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && compact(ui.query).length >= 2) {
      remember(expandQuery(ui.query).text);
      ui.open = false;
      ui.notice = 'نتیجه ثبت شد و اگر وارد شده باشی به جست‌وجوهای اخیر اضافه می‌شود.';
      render();
    }
  });
  document.querySelector('[data-srch-clear]')?.addEventListener('click', () => { ui.query = ''; ui.open = true; render(); });
  document.querySelector('[data-srch-login]')?.addEventListener('change', (event) => { ui.loggedIn = event.target.checked; render(); });
  document.querySelector('[data-srch-stock]')?.addEventListener('change', (event) => { ui.onlyStock = event.target.checked; render(); });
  document.querySelector('[data-srch-sort]')?.addEventListener('change', (event) => { ui.sort = event.target.value; render(); });
  document.querySelectorAll('[data-srch-pick]').forEach((button) => button.addEventListener('click', () => {
    ui.query = button.dataset.srchPick;
    ui.open = false;
    remember(expandQuery(ui.query).text);
    render();
  }));
  document.querySelectorAll('[data-srch-del]').forEach((button) => button.addEventListener('click', () => {
    ui.recents = ui.recents.filter((item) => item !== button.dataset.srchDel);
    persist();
    render();
  }));
  document.querySelector('[data-srch-clear-all]')?.addEventListener('click', () => { ui.recents = []; persist(); render(); });
  document.querySelectorAll('[data-srch-open]').forEach((button) => button.addEventListener('click', () => {
    const row = results().rows.find((item) => item.item.id === button.dataset.srchOpen);
    ui.notice = row ? `در صفحه محصول قیمت همان ${money(row.sku)} نشان داده می‌شود.` : '';
    render();
  }));
  document.querySelector('[data-srch-map]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    const from = String(data.get('from') || '').trim();
    const to = String(data.get('to') || '').trim();
    if (from && to) ui.maps.push({ from, to, both: data.get('both') === 'on' });
    persist();
    render();
  });
  document.querySelectorAll('[data-srch-map-del]').forEach((button) => button.addEventListener('click', () => {
    ui.maps.splice(Number(button.dataset.srchMapDel), 1);
    persist();
    render();
  }));
}
