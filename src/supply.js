import { catalog, fa } from './catalog.js';
import { pathLabel } from './tree.js';

const KEY = 'plaza-supply-flow-v2';
const SELLER = 'سارا محمدی · بوتیک ونک';
const FINANCE = 'رضا کاظمی · مالی';
const COMPANY = 'رایانه پایتخت ویراست';
const WAREHOUSE = 'انبار مرکزی تهران';
const suppliers = ['پارس موبایل', 'دیجی‌تامین', 'برفاب تجارت', 'آوای ارتباط', 'نوین سیستم'];
const THRESHOLD = 30;

const history = {
  'PLAZA-IPHONE-BLK-256': { supplier: 'پارس موبایل', avg: 91_200_000, last: 92_000_000, sale: 98_900_000, shadow: 1 },
  'PLAZA-IPHONE-SLV-256': { supplier: 'پارس موبایل', avg: 91_800_000, last: 92_400_000, sale: 99_400_000, shadow: 0 },
  'PLAZA-GALAXY-BLK-256': { supplier: 'آوای ارتباط', avg: 38_100_000, last: 38_600_000, sale: 42_500_000, shadow: 2 },
  'PLAZA-REDMI-BLU-128': { supplier: 'دیجی‌تامین', avg: 12_700_000, last: 12_900_000, sale: 14_900_000, shadow: 0 },
  'PLAZA-IPAD-256-11': { supplier: 'پارس موبایل', avg: 34_500_000, last: 34_500_000, sale: 39_000_000, shadow: 0 },
  'PLAZA-VIVO-16-512': { supplier: 'نوین سیستم', avg: 41_000_000, last: 41_300_000, sale: 46_000_000, shadow: 1 },
  'PLAZA-BARFAB-QH3000': { supplier: 'برفاب تجارت', avg: 4_900_000, last: 5_050_000, sale: 5_980_000, shadow: 0 },
  'PLAZA-BARFAB-BF15': { supplier: 'برفاب تجارت', avg: 11_200_000, last: 11_400_000, sale: 13_400_000, shadow: 1 },
};

function iso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function addDays(days) {
  const next = new Date();
  next.setDate(next.getDate() + days);
  return iso(next);
}
function stamp(daysAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

function seedRequests() {
  return [
    {
      id: 'SUP-1043', seller: SELLER, supplier: 'آوای ارتباط', settle: addDays(12), delivery: addDays(1), deliveryType: 'supplier', address: '', official: true, vat: 10, note: '',
      lines: [{ sku: 'PLAZA-GALAXY-BLK-256', qty: 4, buy: 38_400_000 }, { sku: 'PLAZA-REDMI-BLU-128', qty: 6, buy: 12_800_000 }],
      status: 'approved', created: stamp(3),
      log: [{ at: stamp(3), who: SELLER, text: 'ارسال برای تأیید مالی' }, { at: stamp(2), who: FINANCE, text: 'تأیید شد' }],
    },
    {
      id: 'SUP-1044', seller: SELLER, supplier: 'برفاب تجارت', settle: addDays(20), delivery: addDays(4), deliveryType: 'pickup', address: 'تهران، جاده مخصوص، کیلومتر ۹', official: false, vat: 10, note: '',
      lines: [{ sku: 'PLAZA-BARFAB-BF15', qty: 10, buy: 11_300_000 }],
      status: 'pending', created: stamp(1),
      log: [{ at: stamp(1), who: SELLER, text: 'ارسال برای تأیید مالی' }],
    },
    {
      id: 'SUP-1045', seller: SELLER, supplier: 'پارس موبایل', settle: addDays(9), delivery: addDays(2), deliveryType: 'supplier', address: '', official: true, vat: 10, note: '',
      lines: [{ sku: 'PLAZA-IPHONE-BLK-256', qty: 3, buy: 92_500_000 }],
      status: 'returned', created: stamp(1),
      log: [{ at: stamp(1), who: SELLER, text: 'ارسال برای تأیید مالی' }, { at: stamp(0), who: FINANCE, text: 'برگشت برای اصلاح: پیش‌فاکتور با مبلغ ردیف یکی نیست.' }],
    },
  ];
}

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
const saved = load();

const ui = {
  requests: saved.requests || seedRequests(),
  receipts: saved.receipts || [],
  prices: saved.prices || {},
  uploads: saved.uploads || [],
  avg: saved.avg || {},
  seq: saved.seq || 1045,
  stockTab: 'stock',
  financeTab: 'pending',
  reqQuery: '',
  reqStatus: '',
  stockQuery: '',
  dialog: null,
  target: '',
  form: null,
  pickQuery: '',
  pickCategory: '',
  upload: null,
  toast: '',
  edits: {},
};

let focusKey = '';
let focusPos = 0;

function persist() {
  localStorage.setItem(KEY, JSON.stringify({ requests: ui.requests, receipts: ui.receipts, prices: ui.prices, uploads: ui.uploads, avg: ui.avg, seq: ui.seq }));
}

function demoState() {
  return new URLSearchParams(window.location.search).get('state') || '';
}

function escape(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}
function money(value) {
  return `${fa(Math.round(Number(value) || 0))} تومان`;
}
function digits(value) {
  return String(value ?? '').replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٬,\s]/g, '');
}
function num(value) {
  const text = digits(value);
  return text === '' ? NaN : Number(text);
}
function jalali(value) {
  if (!value) return '—';
  const date = value.length === 10 ? new Date(`${value}T12:00:00`) : new Date(value);
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}
function code(value) {
  return `<bdi dir="ltr" class="mono">${escape(value)}</bdi>`;
}

function skus() {
  return catalog.products.filter((item) => item.status === 'published').flatMap((item) => (item.skus || []).map((sku) => ({
    code: sku.code,
    productCode: item.model || item.id,
    product: item.title,
    category: pathLabel(item.leafId).split(' / ').pop() || item.leafId,
    categoryPath: pathLabel(item.leafId),
    listPrice: sku.price,
    compareAt: sku.compareAt,
    warehouse: Number(sku.stock || 0),
    reserved: Number(sku.reserved || 0),
  })));
}
function skuByCode(value) {
  return skus().find((item) => item.code === value);
}
function categories() {
  return [...new Set(skus().map((item) => item.category))];
}

function priceOf(value) {
  const sku = skuByCode(value);
  const stored = ui.prices[value];
  const base = Number(stored?.base ?? (sku?.compareAt && sku.compareAt > sku.listPrice ? sku.compareAt : sku?.listPrice) ?? 0);
  const discount = Number(stored?.discount ?? (sku?.compareAt && sku.compareAt > sku.listPrice ? sku.compareAt - sku.listPrice : 0));
  const kind = stored?.kind || 'amount';
  return { base, discount, kind, final: finalPrice(base, discount, kind) };
}
function finalPrice(base, discount, kind) {
  const off = kind === 'percent' ? Math.round(base * discount / 100) : discount;
  return base - off;
}

function received(requestId, sku) {
  return ui.receipts.filter((item) => item.requestId === requestId && item.sku === sku).reduce((sum, item) => sum + item.qty, 0);
}
function transitLines(value) {
  return ui.requests.filter((item) => item.status === 'approved').flatMap((item) => item.lines.filter((line) => line.sku === value).map((line) => ({
    requestId: item.id,
    supplier: item.supplier,
    delivery: item.delivery,
    buy: line.buy,
    left: line.qty - received(item.id, line.sku),
  }))).filter((line) => line.left > 0);
}

// PRD-066: sellable = approved in-transit due within one day + warehouse − reserved; shadow excluded; negative shows 0.
function stockRow(sku) {
  const lines = transitLines(sku.code);
  const transit = lines.reduce((sum, line) => sum + line.left, 0);
  const limit = addDays(1);
  const near = lines.filter((line) => line.delivery <= limit).reduce((sum, line) => sum + line.left, 0);
  const arrived = ui.receipts.filter((item) => item.sku === sku.code).reduce((sum, item) => sum + item.qty, 0);
  const warehouse = sku.warehouse + arrived;
  const raw = near + warehouse - sku.reserved;
  const past = history[sku.code] || {};
  const lastLine = ui.requests.filter((item) => item.status === 'approved').flatMap((item) => item.lines.map((line) => ({ ...line, supplier: item.supplier }))).filter((line) => line.sku === sku.code).pop();
  return {
    ...sku,
    transit,
    near,
    warehouse,
    shadow: past.shadow || 0,
    sellable: Math.max(0, raw),
    oversold: raw < 0,
    supplier: lastLine?.supplier || past.supplier || '',
    avg: ui.avg[sku.code] ?? past.avg ?? null,
    last: lastLine?.buy ?? past.last ?? null,
    saleAtLast: lastLine?.saleAt ?? past.sale ?? null,
    lines,
    price: priceOf(sku.code),
  };
}
function stockRows() {
  return skus().map(stockRow);
}

function totals(form) {
  const net = form.lines.reduce((sum, line) => sum + (num(line.qty) || 0) * (num(line.buy) || 0), 0);
  const vat = form.official ? Math.round(net * (num(form.vat) || 0) / 100) : 0;
  return { net, vat, total: net + vat };
}

const STATUS = {
  draft: ['پیش‌نویس', 'muted'],
  pending: ['منتظر تأیید مالی', 'warning'],
  returned: ['برگشت برای اصلاح', 'info'],
  approved: ['تأییدشده', 'success'],
  rejected: ['ردشده', 'danger'],
  cancelled: ['لغوشده', 'muted'],
};
function pill(status) {
  const [label, tone] = STATUS[status] || [status, 'muted'];
  return `<span class="pill pill-${tone}">${label}</span>`;
}

function csv(name, rows) {
  const text = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([`\uFEFF${text}`], { type: 'text/csv;charset=utf-8' }));
  link.download = `${name}-${iso(new Date())}.csv`;
  link.click();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i += 1; } else if (char === '"') quoted = false; else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(cell); cell = ''; } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((item) => item.some((value) => value.trim() !== ''));
}

function pageHead(eyebrow, title, text, actions = '') {
  return `<header class="ux-head"><div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${text}</p></div><div class="ux-actions">${actions}</div></header>`;
}

function stateBlock(kind, colspan, emptyText, emptyAction = '') {
  if (kind === 'loading') {
    return Array.from({ length: 4 }, () => `<tr class="skeleton-row">${Array.from({ length: colspan }, () => '<td><span class="skeleton"></span></td>').join('')}</tr>`).join('');
  }
  if (kind === 'error') {
    return `<tr><td colspan="${colspan}"><div class="ux-empty" role="alert"><b>بارگذاری لیست انجام نشد.</b><p>اتصال را بررسی کنید و دوباره تلاش کنید.</p><button type="button" class="ux-btn" data-sup-retry>تلاش مجدد</button></div></td></tr>`;
  }
  return `<tr><td colspan="${colspan}"><div class="ux-empty"><b>${emptyText}</b>${emptyAction}</div></td></tr>`;
}

function denied() {
  return `<div class="ux-page"><div class="ux-card ux-empty" role="alert"><b>برای مشاهده این بخش دسترسی ندارید.</b><p>با مدیر پنل تماس بگیرید.</p></div></div>`;
}

function toast() {
  return `<div class="ux-toast" role="status" aria-live="polite">${ui.toast ? escape(ui.toast) : ''}</div>`;
}

/* ---------- Supply (PRD-065) ---------- */

function visibleRequests() {
  const query = ui.reqQuery.trim();
  return ui.requests.filter((item) => (!ui.reqStatus || item.status === ui.reqStatus)
    && (!query || `${item.id} ${item.supplier} ${item.lines.map((line) => skuByCode(line.sku)?.product || '').join(' ')}`.includes(query)));
}

function supplyPage() {
  const state = demoState();
  if (state === 'denied') return denied();
  const list = state === 'empty' ? [] : visibleRequests();
  const kind = state === 'loading' || state === 'error' ? state : '';
  const filtered = ui.reqQuery || ui.reqStatus;
  const body = kind ? stateBlock(kind, 11) : list.length ? list.map(requestRow).join('') : stateBlock('', 11,
    filtered ? 'نتیجه‌ای با این فیلترها پیدا نشد.' : 'هنوز درخواست تامینی ثبت نکرده‌اید.',
    filtered ? '<button type="button" class="ux-btn" data-sup-clear>حذف فیلترها</button>' : '<button type="button" class="ux-btn ux-primary" data-sup-new>ثبت اولین درخواست</button>');
  return `<div class="ux-page">
    ${pageHead('تامین کالا · PRD-065', 'درخواست‌های تامین', `فروشنده: ${SELLER}. موجودی در راه فقط بعد از تأیید مالی ساخته می‌شود.`,
      `<button type="button" class="ux-btn ux-primary" data-sup-new aria-label="ثبت درخواست تامین جدید"><span aria-hidden="true">+</span> ثبت درخواست تامین</button>`)}
    <section class="ux-card">
      <div class="ux-toolbar">
        <label class="ux-field ux-grow"><span>جست‌وجو</span><input data-focus="req-q" data-sup-req-q value="${escape(ui.reqQuery)}" placeholder="شماره، تامین‌کننده یا نام کالا" /></label>
        <label class="ux-field"><span>وضعیت</span><select data-sup-req-status><option value="">همه</option>${Object.entries(STATUS).map(([key, [label]]) => `<option value="${key}" ${ui.reqStatus === key ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
        <div class="ux-actions"><button type="button" class="ux-btn" data-sup-export="requests">خروجی اکسل درخواست‌ها</button><button type="button" class="ux-btn" data-sup-export="lines">خروجی اکسل ردیف کالا</button></div>
      </div>
      <div class="ux-table-wrap"><table class="ux-table" aria-label="لیست درخواست‌های تامین">
        <thead><tr><th scope="col">شماره</th><th scope="col">تامین‌کننده</th><th scope="col" class="num">ردیف</th><th scope="col" class="num">مبلغ کل</th><th scope="col">خرید رسمی</th><th scope="col">تاریخ تسویه</th><th scope="col">تاریخ تحویل</th><th scope="col">نوع تحویل</th><th scope="col">وضعیت</th><th scope="col">تاریخ ثبت</th><th scope="col"><span class="sr-only">عملیات</span></th></tr></thead>
        <tbody>${body}</tbody>
      </table></div>
      <p class="ux-caption">${fa(list.length)} درخواست</p>
    </section>
  </div>`;
}

function requestRow(item) {
  const total = totals(item).total;
  const editable = item.status === 'draft' || item.status === 'returned';
  const cancellable = ['draft', 'pending', 'returned'].includes(item.status);
  return `<tr>
    <th scope="row">${code(item.id)}</th>
    <td>${escape(item.supplier)}</td>
    <td class="num">${fa(item.lines.length)}</td>
    <td class="num">${money(total)}</td>
    <td>${item.official ? 'بله' : 'خیر'}</td>
    <td>${jalali(item.settle)}</td>
    <td>${jalali(item.delivery)}</td>
    <td>${item.deliveryType === 'pickup' ? 'جمع‌آوری توسط لجستیک' : 'ارسال توسط تامین‌کننده'}</td>
    <td>${pill(item.status)}</td>
    <td>${jalali(item.created)}</td>
    <td><div class="ux-row-actions">
      <button type="button" class="ux-btn ux-ghost" data-sup-view="${item.id}">جزئیات</button>
      ${editable ? `<button type="button" class="ux-btn ux-ghost" data-sup-edit="${item.id}">ویرایش</button>` : ''}
      ${cancellable ? `<button type="button" class="ux-btn ux-ghost ux-danger-text" data-sup-cancel="${item.id}">لغو</button>` : ''}
      <button type="button" class="ux-btn ux-ghost" data-sup-pdf="${item.id}">سند PDF</button>
    </div></td>
  </tr>`;
}

function blankForm() {
  return { id: '', supplier: '', settle: addDays(14), delivery: addDays(1), deliveryType: 'supplier', address: '', official: false, vat: '10', note: '', lines: [], errors: {} };
}

function requestDialog() {
  const form = ui.form;
  const sum = totals(form);
  const query = ui.pickQuery.trim();
  const found = skus().filter((item) => (!ui.pickCategory || item.category === ui.pickCategory)
    && (!query || `${item.product} ${item.code} ${item.productCode}`.toLowerCase().includes(query.toLowerCase())));
  const added = new Set(form.lines.map((line) => line.sku));
  const err = (key) => (form.errors[key] ? `<small class="ux-error" id="err-${key}">${form.errors[key]}</small>` : '');
  const inv = (key) => (form.errors[key] ? `aria-invalid="true" aria-describedby="err-${key}"` : '');
  return `<div class="ux-backdrop" data-sup-close-bg>
    <section class="ux-dialog ux-dialog-lg" role="dialog" aria-modal="true" aria-labelledby="req-title">
      <header class="ux-dialog-head"><h2 id="req-title">${form.id ? `ویرایش «${form.id}»` : 'درخواست تامین جدید'}</h2><button type="button" class="ux-icon" data-sup-close aria-label="بستن">×</button></header>
      <div class="ux-dialog-body">
        ${Object.keys(form.errors).length ? '<p class="ux-alert" role="alert">چند فیلد نیاز به اصلاح دارد. موارد قرمز را ببینید.</p>' : ''}
        <h3>اطلاعات درخواست</h3>
        <div class="ux-grid-2">
          <label class="ux-field"><span>تامین‌کننده</span><select data-sup-f="supplier" ${inv('supplier')}><option value="">انتخاب تامین‌کننده</option>${suppliers.map((item) => `<option ${form.supplier === item ? 'selected' : ''}>${item}</option>`).join('')}</select>${err('supplier')}</label>
          <label class="ux-field"><span>انبار مقصد</span><input value="${WAREHOUSE}" readonly aria-readonly="true" /><small>تنها انبار فعال؛ پیش‌فرض و قفل است.</small></label>
          <label class="ux-field"><span>تاریخ تسویه با تامین‌کننده</span><input type="date" data-sup-f="settle" value="${form.settle}" ${inv('settle')} />${err('settle')}</label>
          <label class="ux-field"><span>تاریخ تحویل به انبار</span><input type="date" data-sup-f="delivery" value="${form.delivery}" ${inv('delivery')} /><small>مبنای موجودی در راه است.</small>${err('delivery')}</label>
        </div>
        <fieldset class="ux-segment"><legend>نوع تحویل</legend>
          <label><input type="radio" name="dtype" value="supplier" data-sup-f="deliveryType" ${form.deliveryType === 'supplier' ? 'checked' : ''} /> ارسال توسط تامین‌کننده</label>
          <label><input type="radio" name="dtype" value="pickup" data-sup-f="deliveryType" ${form.deliveryType === 'pickup' ? 'checked' : ''} /> جمع‌آوری توسط لجستیک Plaza</label>
        </fieldset>
        ${form.deliveryType === 'pickup' ? `<label class="ux-field"><span>آدرس جمع‌آوری</span><input data-sup-f="address" value="${escape(form.address)}" ${inv('address')} />${err('address')}</label>` : ''}
        <div class="ux-grid-2">
          <label class="ux-switch"><input type="checkbox" role="switch" data-sup-official ${form.official ? 'checked' : ''} /> <span>خرید رسمی (با ارزش افزوده)</span></label>
          ${form.official ? `<label class="ux-field"><span>نرخ ارزش افزوده ٪</span><input inputmode="numeric" data-sup-f="vat" value="${escape(form.vat)}" ${inv('vat')} />${err('vat')}</label>` : '<span></span>'}
        </div>

        <h3>کالاها</h3>
        <div class="ux-grid-2">
          <label class="ux-field"><span>جست‌وجوی کالا</span><input data-focus="pick-q" data-sup-pick-q value="${escape(ui.pickQuery)}" placeholder="نام کالا، کد کالا یا SKU" /></label>
          <label class="ux-field"><span>دسته‌بندی</span><select data-sup-pick-cat><option value="">همه دسته‌ها</option>${categories().map((item) => `<option ${ui.pickCategory === item ? 'selected' : ''}>${escape(item)}</option>`).join('')}</select></label>
        </div>
        <div class="ux-table-wrap ux-pick"><table class="ux-table ux-compact" aria-label="نتیجه جست‌وجوی کالا">
          <thead><tr><th scope="col">کالا</th><th scope="col">دسته‌بندی</th><th scope="col">SKU</th><th scope="col"><span class="sr-only">افزودن</span></th></tr></thead>
          <tbody>${found.length ? found.map((item) => `<tr><td>${escape(item.product)}</td><td>${escape(item.category)}</td><td>${code(item.code)}</td><td>${added.has(item.code) ? '<span class="pill pill-success">اضافه شد</span>' : `<button type="button" class="ux-btn ux-ghost" data-sup-add="${item.code}">+ افزودن</button>`}</td></tr>`).join('') : '<tr><td colspan="4"><div class="ux-empty"><b>کالایی با این جست‌وجو پیدا نشد.</b></div></td></tr>'}</tbody>
        </table></div>
        ${err('lines')}
        <div class="ux-table-wrap"><table class="ux-table" aria-label="ردیف‌های درخواست">
          <thead><tr><th scope="col">کالا</th><th scope="col">SKU</th><th scope="col" class="num">تعداد</th><th scope="col" class="num">قیمت واحد خرید (تومان)</th><th scope="col" class="num">مبلغ ردیف</th><th scope="col"><span class="sr-only">حذف</span></th></tr></thead>
          <tbody>${form.lines.length ? form.lines.map((line, index) => {
            const sku = skuByCode(line.sku);
            const rowTotal = (num(line.qty) || 0) * (num(line.buy) || 0);
            return `<tr><td>${escape(sku?.product || line.sku)}</td><td>${code(line.sku)}</td>
              <td class="num"><input class="ux-cell" inputmode="numeric" data-focus="qty-${index}" data-sup-line-qty="${index}" value="${escape(line.qty)}" aria-label="تعداد ${escape(sku?.product || '')}" ${form.errors[`qty-${index}`] ? 'aria-invalid="true"' : ''} /></td>
              <td class="num"><input class="ux-cell" inputmode="numeric" data-focus="buy-${index}" data-sup-line-buy="${index}" value="${escape(line.buy)}" aria-label="قیمت خرید ${escape(sku?.product || '')}" ${form.errors[`buy-${index}`] ? 'aria-invalid="true"' : ''} /></td>
              <td class="num">${money(rowTotal)}</td>
              <td><button type="button" class="ux-icon" data-sup-line-del="${index}" aria-label="حذف ${escape(sku?.product || '')}">×</button></td></tr>`;
          }).join('') : '<tr><td colspan="6"><div class="ux-empty"><b>هنوز کالایی اضافه نشده.</b><p>از جدول بالا یک یا چند کالا اضافه کنید.</p></div></td></tr>'}</tbody>
        </table></div>
        <dl class="ux-sum">
          <div><dt>جمع خالص</dt><dd>${money(sum.net)}</dd></div>
          ${form.official ? `<div><dt>ارزش افزوده (${fa(num(form.vat) || 0)}٪)</dt><dd>${money(sum.vat)}</dd></div>` : ''}
          <div class="ux-sum-total"><dt>مبلغ کل</dt><dd>${money(sum.total)}</dd></div>
        </dl>
        <label class="ux-field"><span>توضیحات (اختیاری)</span><textarea data-sup-f="note" rows="2">${escape(form.note)}</textarea></label>
      </div>
      <footer class="ux-dialog-foot">
        <button type="button" class="ux-btn ux-primary" data-sup-submit="pending">ارسال برای تأیید مالی</button>
        <button type="button" class="ux-btn" data-sup-submit="draft">ذخیره پیش‌نویس</button>
        <button type="button" class="ux-btn ux-ghost" data-sup-close>انصراف</button>
      </footer>
    </section>
  </div>`;
}

function detailDrawer() {
  const item = ui.requests.find((row) => row.id === ui.target);
  if (!item) return '';
  const sum = totals(item);
  return `<div class="ux-backdrop" data-sup-close-bg>
    <aside class="ux-drawer" role="dialog" aria-modal="true" aria-labelledby="det-title">
      <header class="ux-dialog-head"><h2 id="det-title">درخواست ${code(item.id)}</h2><button type="button" class="ux-icon" data-sup-close aria-label="بستن">×</button></header>
      <div class="ux-dialog-body">
        <div>${pill(item.status)}</div>
        <dl class="ux-meta">
          <div><dt>فروشنده</dt><dd>${escape(item.seller)}</dd></div>
          <div><dt>تامین‌کننده</dt><dd>${escape(item.supplier)}</dd></div>
          <div><dt>تاریخ تسویه</dt><dd>${jalali(item.settle)}</dd></div>
          <div><dt>تاریخ تحویل</dt><dd>${jalali(item.delivery)}</dd></div>
          <div><dt>نوع تحویل</dt><dd>${item.deliveryType === 'pickup' ? `جمع‌آوری · ${escape(item.address)}` : 'ارسال توسط تامین‌کننده'}</dd></div>
          <div><dt>انبار مقصد</dt><dd>${WAREHOUSE}</dd></div>
        </dl>
        <div class="ux-table-wrap"><table class="ux-table ux-compact" aria-label="ردیف‌های درخواست">
          <thead><tr><th scope="col">کالا</th><th scope="col" class="num">تعداد</th><th scope="col" class="num">قیمت خرید</th><th scope="col" class="num">مبلغ</th></tr></thead>
          <tbody>${item.lines.map((line) => `<tr><td>${escape(skuByCode(line.sku)?.product || line.sku)}</td><td class="num">${fa(line.qty)}</td><td class="num">${money(line.buy)}</td><td class="num">${money(line.qty * line.buy)}</td></tr>`).join('')}</tbody>
        </table></div>
        <dl class="ux-sum"><div><dt>جمع خالص</dt><dd>${money(sum.net)}</dd></div>${item.official ? `<div><dt>ارزش افزوده</dt><dd>${money(sum.vat)}</dd></div>` : ''}<div class="ux-sum-total"><dt>مبلغ کل</dt><dd>${money(sum.total)}</dd></div></dl>
        <h3>تاریخچه</h3>
        <ol class="ux-timeline">${item.log.map((entry) => `<li><b>${escape(entry.text)}</b><small>${escape(entry.who)} · ${jalali(entry.at)}</small></li>`).join('')}</ol>
      </div>
    </aside>
  </div>`;
}

function confirmDialog(title, text, action, label, needReason = false) {
  return `<div class="ux-backdrop" data-sup-close-bg>
    <section class="ux-dialog" role="dialog" aria-modal="true" aria-labelledby="cf-title">
      <header class="ux-dialog-head"><h2 id="cf-title">${title}</h2><button type="button" class="ux-icon" data-sup-close aria-label="بستن">×</button></header>
      <div class="ux-dialog-body"><p>${text}</p>${needReason ? `<label class="ux-field"><span>${needReason}</span><textarea data-sup-reason rows="3"></textarea><small class="ux-error" data-sup-reason-err hidden>نوشتن این بخش الزامی است.</small></label>` : ''}</div>
      <footer class="ux-dialog-foot"><button type="button" class="ux-btn ${action === 'approve' ? 'ux-primary' : 'ux-destructive'}" data-sup-confirm="${action}">${label}</button><button type="button" class="ux-btn ux-ghost" data-sup-close>انصراف</button></footer>
    </section>
  </div>`;
}

/* ---------- Price & stock (PRD-066 / 067) ---------- */

function stockPage() {
  const state = demoState();
  if (state === 'denied') return denied();
  return `<div class="ux-page">
    ${pageHead('موجودی و قیمت · PRD-066 / PRD-067', 'قیمت و موجودی', 'موجودی قابل فروش از درخواست‌های تأییدشده و انبار حساب می‌شود. لیست قیمت همان عدد را فقط می‌خواند.')}
    <div class="ux-tabs" role="tablist" aria-label="قیمت و موجودی">
      <button type="button" role="tab" aria-selected="${ui.stockTab === 'stock'}" class="${ui.stockTab === 'stock' ? 'active' : ''}" data-sup-stock-tab="stock">وضعیت موجودی</button>
      <button type="button" role="tab" aria-selected="${ui.stockTab === 'price'}" class="${ui.stockTab === 'price' ? 'active' : ''}" data-sup-stock-tab="price">لیست قیمت</button>
    </div>
    ${ui.stockTab === 'price' ? priceSection(state) : stockSection(state)}
  </div>`;
}

function filteredStock() {
  const query = ui.stockQuery.trim().toLowerCase();
  return stockRows().filter((row) => !query || `${row.code} ${row.productCode} ${row.product}`.toLowerCase().includes(query));
}

function stockSection(state) {
  const rows = state === 'empty' ? [] : filteredStock();
  const kind = state === 'loading' || state === 'error' ? state : '';
  const body = kind ? stateBlock(kind, 12) : rows.length ? rows.map((row) => `<tr>
    <td>${code(row.productCode)}</td>
    <th scope="row"><button type="button" class="ux-link" data-sup-sku="${row.code}">${code(row.code)}</button></th>
    <td>${escape(row.product)}</td>
    <td class="num"><b>${fa(row.sellable)}</b>${row.oversold ? ' <span class="pill pill-danger">فروش بیش از موجودی</span>' : ''}</td>
    <td class="num">${fa(row.transit)}</td>
    <td class="num">${fa(row.warehouse)}</td>
    <td class="num">${fa(row.shadow)}</td>
    <td class="num">${fa(row.reserved)}</td>
    <td>${row.supplier ? escape(row.supplier) : '—'}</td>
    <td class="num">${row.avg ? money(row.avg) : '—'}</td>
    <td class="num">${row.last ? money(row.last) : '—'}</td>
    <td class="num">${row.saleAtLast ? money(row.saleAtLast) : '—'}</td>
  </tr>`).join('') : stateBlock('', 12, ui.stockQuery ? 'نتیجه‌ای با این جست‌وجو پیدا نشد.' : 'هنوز SKU فعالی نیست.', ui.stockQuery ? '<button type="button" class="ux-btn" data-sup-stock-clear>حذف جست‌وجو</button>' : '');
  return `<section class="ux-card" role="tabpanel">
    <div class="ux-toolbar">
      <label class="ux-field ux-grow"><span>جست‌وجو</span><input data-focus="stock-q" data-sup-stock-q value="${escape(ui.stockQuery)}" placeholder="کد کالا، کد SKU یا نام کالا" /></label>
      <div class="ux-actions"><button type="button" class="ux-btn" data-sup-export="stock">خروجی اکسل</button></div>
    </div>
    <div class="ux-table-wrap"><table class="ux-table" aria-label="وضعیت موجودی کالا">
      <thead><tr>
        <th scope="col">کد کالا</th><th scope="col">کد SKU</th><th scope="col">نام کالا</th>
        <th scope="col" class="num"><span class="ux-tip" tabindex="0" aria-describedby="tip-sellable">موجودی انبار قابل فروش ⓘ<span role="tooltip" id="tip-sellable">در راهِ تأییدشده با تحویل حداکثر تا فردا + موجودی انبار − موجودی رزرو. موجودی سایه حساب نمی‌شود و عدد منفی صفر نمایش داده می‌شود.</span></span></th>
        <th scope="col" class="num">موجودی در راه</th><th scope="col" class="num">موجودی انبار</th><th scope="col" class="num">موجودی سایه انبار</th><th scope="col" class="num">موجودی رزرو</th>
        <th scope="col">نام تامین‌کننده کالا</th><th scope="col" class="num">میانگین قیمت خرید</th><th scope="col" class="num">آخرین قیمت خرید</th><th scope="col" class="num">قیمت فروش در آخرین تاریخ خرید</th>
      </tr></thead>
      <tbody>${body}</tbody>
    </table></div>
    <p class="ux-caption">روی کد SKU بزنید تا در راه به تفکیک درخواست و تاریخ تحویل دیده شود.</p>
  </section>`;
}

function skuDrawer() {
  const sku = skuByCode(ui.target);
  if (!sku) return '';
  const row = stockRow(sku);
  return `<div class="ux-backdrop" data-sup-close-bg>
    <aside class="ux-drawer" role="dialog" aria-modal="true" aria-labelledby="sku-title">
      <header class="ux-dialog-head"><h2 id="sku-title">${escape(row.product)}</h2><button type="button" class="ux-icon" data-sup-close aria-label="بستن">×</button></header>
      <div class="ux-dialog-body">
        <p>${code(row.code)}</p>
        <dl class="ux-meta">
          <div><dt>موجودی انبار قابل فروش</dt><dd>${fa(row.sellable)}</dd></div>
          <div><dt>در راه داخل پنجره یک‌روزه</dt><dd>${fa(row.near)}</dd></div>
          <div><dt>موجودی انبار</dt><dd>${fa(row.warehouse)}</dd></div>
          <div><dt>موجودی رزرو</dt><dd>${fa(row.reserved)}</dd></div>
        </dl>
        <h3>موجودی در راه به تفکیک درخواست</h3>
        <div class="ux-table-wrap"><table class="ux-table ux-compact" aria-label="موجودی در راه">
          <thead><tr><th scope="col">درخواست</th><th scope="col">تامین‌کننده</th><th scope="col">تاریخ تحویل</th><th scope="col" class="num">باقی‌مانده</th><th scope="col"><span class="sr-only">عملیات</span></th></tr></thead>
          <tbody>${row.lines.length ? row.lines.map((line) => `<tr><td>${code(line.requestId)}</td><td>${escape(line.supplier)}</td><td>${jalali(line.delivery)}</td><td class="num">${fa(line.left)}</td><td><button type="button" class="ux-btn ux-ghost" data-sup-receive="${line.requestId}">ورود ۱ عدد</button></td></tr>`).join('') : '<tr><td colspan="5"><div class="ux-empty"><b>موجودی در راهی برای این SKU نیست.</b></div></td></tr>'}</tbody>
        </table></div>
        <p class="ux-note"><span class="pill pill-info">خارج از این PRD</span> «ورود ۱ عدد» فقط شبیه‌سازی PRD ورود انبار است تا اثرش روی موجودی و میانگین قیمت خرید دیده شود.</p>
      </div>
    </aside>
  </div>`;
}

function priceSection(state) {
  const rows = state === 'empty' ? [] : filteredStock();
  const kind = state === 'loading' || state === 'error' ? state : '';
  const body = kind ? stateBlock(kind, 11) : rows.length ? rows.map(priceRow).join('') : stateBlock('', 11, ui.stockQuery ? 'نتیجه‌ای با این جست‌وجو پیدا نشد.' : 'هنوز SKU فعالی نیست.');
  return `<section class="ux-card" role="tabpanel">
    <div class="ux-toolbar">
      <label class="ux-field ux-grow"><span>جست‌وجو</span><input data-focus="price-q" data-sup-stock-q value="${escape(ui.stockQuery)}" placeholder="کد کالا، کد SKU یا نام کالا" /></label>
      <div class="ux-actions"><button type="button" class="ux-btn ux-primary" data-sup-upload-open>به‌روزرسانی با اکسل</button><button type="button" class="ux-btn" data-sup-export="prices">خروجی اکسل لیست</button></div>
    </div>
    <div class="ux-table-wrap"><table class="ux-table" aria-label="لیست قیمت و موجودی">
      <thead><tr>
        <th scope="col">کد کالا</th><th scope="col">کد SKU</th><th scope="col">نام کالا</th><th scope="col">دسته‌بندی</th>
        <th scope="col" class="num">قیمت پایه (تومان)</th><th scope="col">نوع تخفیف</th><th scope="col" class="num">تخفیف کالا</th>
        <th scope="col" class="num"><span class="ux-tip" tabindex="0" aria-describedby="tip-final">قیمت فروش نهایی سایت ⓘ<span role="tooltip" id="tip-final">مبلغی: قیمت پایه − تخفیف. درصدی: قیمت پایه × (۱ − درصد).</span></span></th>
        <th scope="col" class="num">تعداد قابل فروش</th><th scope="col" class="num">موجودی انبار</th><th scope="col"><span class="sr-only">ذخیره</span></th>
      </tr></thead>
      <tbody>${body}</tbody>
    </table></div>
    <p class="ux-caption">قیمت پایه و تخفیف همین‌جا تکی ویرایش می‌شود. تعداد قابل فروش و موجودی انبار از وضعیت موجودی می‌آید و قابل ویرایش نیست.</p>
    ${ui.uploads.length ? `<h3>تاریخچه آپلود</h3><div class="ux-table-wrap"><table class="ux-table ux-compact" aria-label="تاریخچه آپلود"><thead><tr><th scope="col">زمان</th><th scope="col">کاربر</th><th scope="col">فایل</th><th scope="col" class="num">اعمال‌شده</th><th scope="col" class="num">خطادار</th></tr></thead><tbody>${ui.uploads.map((item) => `<tr><td>${jalali(item.at)}</td><td>${escape(item.who)}</td><td>${code(item.file)}</td><td class="num">${fa(item.applied)}</td><td class="num">${fa(item.errors)}</td></tr>`).join('')}</tbody></table></div>` : ''}
  </section>`;
}

function priceRow(row) {
  const edit = ui.edits[row.code] || { base: String(row.price.base), discount: String(row.price.discount), kind: row.price.kind };
  const dirty = edit.base !== String(row.price.base) || edit.discount !== String(row.price.discount) || edit.kind !== row.price.kind;
  const preview = finalPrice(num(edit.base) || 0, num(edit.discount) || 0, edit.kind);
  const error = dirty ? priceError(num(edit.base), num(edit.discount), edit.kind) : '';
  return `<tr class="${dirty ? 'is-dirty' : ''}">
    <td>${code(row.productCode)}</td><th scope="row">${code(row.code)}</th><td>${escape(row.product)}</td><td>${escape(row.category)}</td>
    <td class="num"><input class="ux-cell" inputmode="numeric" data-focus="base-${row.code}" data-sup-price="base" data-code="${row.code}" value="${escape(edit.base)}" aria-label="قیمت پایه ${escape(row.product)}" /></td>
    <td><select class="ux-cell" data-sup-price="kind" data-code="${row.code}" aria-label="نوع تخفیف ${escape(row.product)}"><option value="amount" ${edit.kind === 'amount' ? 'selected' : ''}>مبلغی</option><option value="percent" ${edit.kind === 'percent' ? 'selected' : ''}>درصدی</option></select></td>
    <td class="num"><input class="ux-cell" inputmode="numeric" data-focus="off-${row.code}" data-sup-price="discount" data-code="${row.code}" value="${escape(edit.discount)}" aria-label="تخفیف ${escape(row.product)}" ${error ? 'aria-invalid="true"' : ''} /><small class="ux-unit">${edit.kind === 'percent' ? '٪' : 'تومان'}</small></td>
    <td class="num">${error ? `<small class="ux-error">${error}</small>` : `<b>${money(dirty ? preview : row.price.final)}</b>`}</td>
    <td class="num">${fa(row.sellable)}</td><td class="num">${fa(row.warehouse)}</td>
    <td>${dirty ? `<div class="ux-row-actions"><button type="button" class="ux-btn ux-primary" data-sup-price-save="${row.code}" ${error ? 'disabled' : ''}>ذخیره</button><button type="button" class="ux-btn ux-ghost" data-sup-price-reset="${row.code}">انصراف</button></div>` : ''}</td>
  </tr>`;
}

function priceError(base, discount, kind) {
  if (!Number.isFinite(base) || !Number.isInteger(base) || base <= 0) return 'قیمت پایه باید عدد صحیح مثبت باشد.';
  if (!Number.isFinite(discount) || discount < 0) return 'تخفیف نمی‌تواند منفی باشد.';
  if (kind === 'percent' && discount > 100) return 'درصد باید بین ۰ تا ۱۰۰ باشد.';
  if (kind !== 'percent' && discount > base) return 'تخفیف از قیمت پایه بیشتر است.';
  if (finalPrice(base, discount, kind) <= 0) return 'قیمت نهایی باید بزرگ‌تر از صفر باشد.';
  return '';
}

function uploadDialog() {
  const up = ui.upload || { step: 1 };
  const steps = ['دانلود قالب', 'بارگذاری فایل', 'پیش‌نمایش و اعتبارسنجی', 'اعمال و نتیجه'];
  let body = '';
  if (up.step === 1) {
    body = `<p>قالب، قیمت فعلی همه SKUهای لیست را دارد. فقط ستون‌های «جدید» را پر کنید. سلول خالی یعنی بدون تغییر.</p>
      <div class="ux-actions"><button type="button" class="ux-btn ux-primary" data-sup-template>دانلود قالب</button><button type="button" class="ux-btn" data-sup-step="2">قالب را دارم، بعدی</button></div>`;
  } else if (up.step === 2) {
    body = `<label class="ux-drop"><input type="file" accept=".csv,text/csv" data-sup-file /><b>فایل قالب را اینجا انتخاب کنید</b><small>فقط همان قالب دانلودشده پذیرفته می‌شود. حداکثر ۱۰٬۰۰۰ ردیف.</small></label>
      ${up.fileError ? `<p class="ux-alert" role="alert">${escape(up.fileError)}</p>` : ''}
      <div class="ux-actions"><button type="button" class="ux-btn ux-ghost" data-sup-step="1">قبلی</button></div>`;
  } else if (up.step === 3) {
    const changed = up.rows.filter((row) => row.state !== 'same');
    body = `<div class="ux-stats">
        <div><span>کل ردیف</span><b>${fa(up.rows.length)}</b></div>
        <div><span>تغییر</span><b>${fa(up.rows.filter((row) => row.state === 'ok').length)}</b></div>
        <div><span>بدون تغییر</span><b>${fa(up.rows.filter((row) => row.state === 'same').length)}</b></div>
        <div class="tone-danger"><span>خطا</span><b>${fa(up.rows.filter((row) => row.state === 'error').length)}</b></div>
        <div class="tone-warning"><span>هشدار</span><b>${fa(up.rows.filter((row) => row.state === 'warning').length)}</b></div>
      </div>
      <div class="ux-table-wrap"><table class="ux-table ux-compact" aria-label="پیش‌نمایش تغییر قیمت">
        <thead><tr><th scope="col">SKU</th><th scope="col">کالا</th><th scope="col" class="num">قیمت پایه</th><th scope="col" class="num">تخفیف</th><th scope="col" class="num">قیمت نهایی</th><th scope="col" class="num">٪ تغییر</th><th scope="col">نتیجه</th></tr></thead>
        <tbody>${changed.length ? changed.map((row) => `<tr class="row-${row.state}"><td>${code(row.code)}</td><td>${escape(row.name)}</td>
          <td class="num">${row.old ? `${fa(row.old.base)} ← ${fa(row.next?.base ?? row.old.base)}` : '—'}</td>
          <td class="num">${row.old ? `${row.old.kind === 'percent' ? `${fa(row.old.discount)}٪` : fa(row.old.discount)} ← ${row.next ? (row.next.kind === 'percent' ? `${fa(row.next.discount)}٪` : fa(row.next.discount)) : '—'}` : '—'}</td>
          <td class="num">${row.old && row.next ? `${fa(row.old.final)} ← ${fa(row.next.final)}` : '—'}</td>
          <td class="num">${row.change === null ? '—' : `${row.change > 0 ? '+' : ''}${fa(row.change)}٪`}</td>
          <td>${row.state === 'error' ? `<span class="pill pill-danger">خطا</span> ${escape(row.message)}` : row.state === 'warning' ? `<span class="pill pill-warning">هشدار</span> ${escape(row.message)}` : '<span class="pill pill-success">معتبر</span>'}</td></tr>`).join('') : '<tr><td colspan="7"><div class="ux-empty"><b>تغییری یافت نشد.</b></div></td></tr>'}</tbody>
      </table></div>
      ${up.rows.some((row) => row.state === 'warning') ? `<label class="ux-switch"><input type="checkbox" data-sup-warn ${up.acceptWarnings ? 'checked' : ''} /> <span>ردیف‌های دارای هشدار هم اعمال شوند</span> <span class="pill pill-info" title="آیا تغییر خارج از آستانه تأیید مدیر فروش می‌خواهد؟">سوال باز</span></label>` : ''}
      <div class="ux-actions">
        <button type="button" class="ux-btn ux-primary" data-sup-apply ${up.rows.some((row) => row.state === 'ok' || (row.state === 'warning' && up.acceptWarnings)) ? '' : 'disabled'}>اعمال ردیف‌های معتبر</button>
        ${up.rows.some((row) => row.state === 'error' || row.state === 'warning') ? '<button type="button" class="ux-btn" data-sup-error-report>دانلود گزارش خطا</button>' : ''}
        <button type="button" class="ux-btn ux-ghost" data-sup-step="2">فایل دیگر</button>
      </div>`;
  } else {
    body = `<div class="ux-empty"><b>قیمت‌ها با موفقیت به‌روزرسانی شد.</b><p>${fa(up.applied)} ردیف اعمال شد و ${fa(up.skipped)} ردیف اعمال نشد. موجودی تغییری نکرد.</p><button type="button" class="ux-btn ux-primary" data-sup-close>بازگشت به لیست</button></div>`;
  }
  return `<div class="ux-backdrop" data-sup-close-bg>
    <section class="ux-dialog ux-dialog-lg" role="dialog" aria-modal="true" aria-labelledby="up-title">
      <header class="ux-dialog-head"><h2 id="up-title">به‌روزرسانی قیمت با اکسل</h2><button type="button" class="ux-icon" data-sup-close aria-label="بستن">×</button></header>
      <ol class="ux-stepper">${steps.map((label, index) => `<li class="${index + 1 === up.step ? 'current' : index + 1 < up.step ? 'done' : ''}" ${index + 1 === up.step ? 'aria-current="step"' : ''}><span>${fa(index + 1)}</span>${label}</li>`).join('')}</ol>
      <div class="ux-dialog-body">${body}</div>
    </section>
  </div>`;
}

function readUpload(text, file) {
  const table = parseCsv(text.replace(/^\uFEFF/, ''));
  const head = table[0] || [];
  if (head.length < 9 || head[0].trim() !== 'کد SKU') return { error: 'ساختار فایل با قالب یکی نیست. ستون‌ها را حذف یا جابه‌جا نکنید و دوباره از قالب استفاده کنید.' };
  if (table.length - 1 > 10_000) return { error: 'تعداد ردیف بیشتر از ۱۰٬۰۰۰ است.' };
  const seen = new Set();
  const rows = table.slice(1).map((cells) => {
    const [skuCode, , name, , , , newBase, newDiscount, newKind] = cells.map((cell) => cell.trim());
    const sku = skuByCode(skuCode);
    const base = { code: skuCode, name: name || sku?.product || '', old: null, next: null, change: null };
    if (!sku) return { ...base, state: 'error', message: 'SKU نامعتبر' };
    if (seen.has(skuCode)) return { ...base, state: 'error', message: 'ردیف تکراری' };
    seen.add(skuCode);
    const old = priceOf(skuCode);
    if (!newBase && !newDiscount && !newKind) return { ...base, old, state: 'same' };
    const kind = newKind ? (newKind === 'درصدی' || newKind === 'percent' ? 'percent' : 'amount') : old.kind;
    const b = newBase ? num(newBase) : old.base;
    const d = newDiscount ? num(newDiscount) : old.discount;
    const message = priceError(b, d, kind);
    if (message) return { ...base, old, state: 'error', message };
    const next = { base: b, discount: d, kind, final: finalPrice(b, d, kind) };
    if (next.base === old.base && next.discount === old.discount && next.kind === old.kind) return { ...base, old, state: 'same' };
    const change = Math.round(((next.final - old.final) / old.final) * 100);
    if (ui.prices[skuCode]?.at && ui.prices[skuCode].at > file.lastModified) return { ...base, old, next, change, state: 'warning', message: 'قیمت بعد از ساخت فایل تغییر کرده است.' };
    if (Math.abs(change) > THRESHOLD) return { ...base, old, next, change, state: 'warning', message: `تغییر غیرعادی بیش از ${fa(THRESHOLD)}٪` };
    return { ...base, old, next, change, state: 'ok' };
  });
  return { rows };
}

/* ---------- Finance (PRD-065) ---------- */

function financePage() {
  const state = demoState();
  if (state === 'denied') return denied();
  const pending = ui.requests.filter((item) => item.status === 'pending').sort((a, b) => a.settle.localeCompare(b.settle));
  const done = ui.requests.filter((item) => ['approved', 'rejected', 'returned'].includes(item.status));
  const list = state === 'empty' ? [] : ui.financeTab === 'pending' ? pending : done;
  const kind = state === 'loading' || state === 'error' ? state : '';
  const body = kind ? stateBlock(kind, 9) : list.length ? list.map((item) => `<tr>
    <th scope="row">${code(item.id)}</th><td>${escape(item.seller)}</td><td>${escape(item.supplier)}</td>
    <td>${item.lines.map((line) => `${escape(skuByCode(line.sku)?.product || line.sku)} × ${fa(line.qty)}`).join('<br>')}</td>
    <td class="num">${money(totals(item).total)}</td><td>${item.official ? 'بله' : 'خیر'}</td><td>${jalali(item.settle)}</td><td>${pill(item.status)}</td>
    <td><div class="ux-row-actions"><button type="button" class="ux-btn ux-ghost" data-sup-view="${item.id}">جزئیات</button>${item.status === 'pending' ? `<button type="button" class="ux-btn ux-primary" data-sup-fin="approve" data-id="${item.id}">تأیید</button><button type="button" class="ux-btn" data-sup-fin="return" data-id="${item.id}">برگشت برای اصلاح</button><button type="button" class="ux-btn ux-ghost ux-danger-text" data-sup-fin="reject" data-id="${item.id}">رد</button>` : ''}</div></td>
  </tr>`).join('') : stateBlock('', 9, ui.financeTab === 'pending' ? 'درخواستی منتظر تأیید نیست.' : 'هنوز درخواستی بررسی نشده.');
  return `<div class="ux-page">
    ${pageHead('تأیید مالی · PRD-065', 'صف تأیید مالی', `کاربر: ${FINANCE}. این صفحه فقط برای نقش مالی است و فروشنده به آن دسترسی ندارد.`)}
    <div class="ux-tabs" role="tablist" aria-label="صف مالی">
      <button type="button" role="tab" aria-selected="${ui.financeTab === 'pending'}" class="${ui.financeTab === 'pending' ? 'active' : ''}" data-sup-fin-tab="pending">منتظر تأیید (${fa(pending.length)})</button>
      <button type="button" role="tab" aria-selected="${ui.financeTab === 'done'}" class="${ui.financeTab === 'done' ? 'active' : ''}" data-sup-fin-tab="done">بررسی‌شده</button>
    </div>
    <section class="ux-card" role="tabpanel">
      <div class="ux-table-wrap"><table class="ux-table" aria-label="درخواست‌های مالی">
        <thead><tr><th scope="col">شماره</th><th scope="col">فروشنده</th><th scope="col">تامین‌کننده</th><th scope="col">کالاها</th><th scope="col" class="num">مبلغ کل</th><th scope="col">خرید رسمی</th><th scope="col">تاریخ تسویه</th><th scope="col">وضعیت</th><th scope="col"><span class="sr-only">عملیات</span></th></tr></thead>
        <tbody>${body}</tbody>
      </table></div>
      <p class="ux-caption">مرتب‌سازی پیش‌فرض بر اساس تاریخ تسویه است. رد و برگشت بدون توضیح ثبت نمی‌شود.</p>
    </section>
  </div>`;
}

/* ---------- Document ---------- */

function printRequest(item) {
  const sum = totals(item);
  const rows = item.lines.map((line, index) => {
    const sku = skuByCode(line.sku);
    return `<tr><td>${fa(index + 1)}</td><td>${escape(sku?.product || line.sku)}</td><td dir="ltr">${escape(line.sku)}</td><td>${fa(line.qty)}</td><td>${fa(line.buy)}</td><td>${fa(line.qty * line.buy)}</td></tr>`;
  }).join('');
  const win = window.open('', '_blank', 'width=900,height=1000');
  if (!win) {
    ui.toast = 'پنجره سند باز نشد. اجازه باز شدن پنجره را در مرورگر بدهید.';
    return;
  }
  win.document.write(`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>سند ${item.id}</title>
  <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 18mm; }
    body { font-family: Vazirmatn, Tahoma, sans-serif; color: #161616; margin: 0; line-height: 1.8; }
    .doc { max-width: 760px; margin: 0 auto; }
    header { text-align: center; border-bottom: 2px solid #161616; padding-bottom: 12px; margin-bottom: 20px; }
    header h1 { margin: 0; font-size: 24px; }
    header p { margin: 4px 0 0; font-size: 14px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; font-size: 13px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border: 1px solid #8d8d8d; padding: 8px; text-align: center; }
    th { background: #f0f0f0; }
    .sum { margin-top: 16px; text-align: left; font-size: 14px; }
    .sum b { font-size: 16px; }
    .sign { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 48px; text-align: center; font-size: 13px; }
    .sign div { border-top: 1px solid #8d8d8d; padding-top: 8px; }
  </style></head><body><div class="doc">
    <header><h1>${COMPANY}</h1><p>سند درخواست تامین کالا</p><p>فروشنده: <b>${escape(item.seller)}</b></p></header>
    <div class="meta">
      <div>شماره درخواست: <b dir="ltr">${item.id}</b></div><div>تاریخ ثبت: ${jalali(item.created)}</div>
      <div>تامین‌کننده: ${escape(item.supplier)}</div><div>انبار مقصد: ${WAREHOUSE}</div>
      <div>تاریخ تسویه: ${jalali(item.settle)}</div><div>تاریخ تحویل: ${jalali(item.delivery)}</div>
      <div>وضعیت: ${STATUS[item.status]?.[0] || item.status}</div><div>خرید رسمی: ${item.official ? 'بله' : 'خیر'}</div>
    </div>
    <table><thead><tr><th>ردیف</th><th>کالا</th><th>SKU</th><th>تعداد</th><th>قیمت واحد (تومان)</th><th>مبلغ (تومان)</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="sum"><div>جمع خالص: ${fa(sum.net)} تومان</div>${item.official ? `<div>ارزش افزوده: ${fa(sum.vat)} تومان</div>` : ''}<div><b>مبلغ کل: ${fa(sum.total)} تومان</b></div></div>
    <div class="sign"><div>امضای فروشنده</div><div>تأیید مالی</div></div>
  </div><script>window.onload = () => { window.focus(); window.print(); };<\/script></body></html>`);
  win.document.close();
}

/* ---------- Public ---------- */

export function supplyContent() {
  return `${supplyPage()}${ui.dialog === 'request' ? requestDialog() : ''}${ui.dialog === 'detail' ? detailDrawer() : ''}${ui.dialog === 'cancel' ? confirmDialog(`لغو «${ui.target}»؟`, 'درخواست لغو می‌شود و دیگر به مالی نمی‌رسد. بعد از تأیید مالی، لغو از اینجا ممکن نیست.', 'cancel', 'لغو درخواست') : ''}${toast()}`;
}

export function stockContent() {
  return `${stockPage()}${ui.dialog === 'sku' ? skuDrawer() : ''}${ui.dialog === 'upload' ? uploadDialog() : ''}${toast()}`;
}

export function financeContent() {
  const reason = { approve: false, reject: 'دلیل رد', return: 'توضیح برای اصلاح' };
  const titles = { approve: `تأیید «${ui.target}»؟`, reject: `رد «${ui.target}»؟`, return: `برگشت «${ui.target}» برای اصلاح؟` };
  const texts = { approve: 'با تأیید، تعداد هر ردیف به‌عنوان موجودی در راه همان SKU با تاریخ تحویل این درخواست ثبت می‌شود.', reject: 'درخواست ردشده نهایی است و موجودی در راه نمی‌سازد.', return: 'درخواست برای فروشنده باز می‌شود تا اصلاح و دوباره ارسال کند.' };
  const labels = { approve: 'تأیید درخواست', reject: 'رد درخواست', return: 'برگشت برای اصلاح' };
  const dialog = ['approve', 'reject', 'return'].includes(ui.dialog) ? confirmDialog(titles[ui.dialog], texts[ui.dialog], ui.dialog, labels[ui.dialog], reason[ui.dialog]) : '';
  return `${financePage()}${ui.dialog === 'detail' ? detailDrawer() : ''}${dialog}${toast()}`;
}

function nowLog(who, text) {
  return { at: new Date().toISOString(), who, text };
}

function validate(form, status) {
  const errors = {};
  if (!form.supplier) errors.supplier = 'تامین‌کننده را انتخاب کنید.';
  if (status === 'pending') {
    if (!form.settle) errors.settle = 'تاریخ تسویه را وارد کنید.';
    if (!form.delivery) errors.delivery = 'تاریخ تحویل را وارد کنید.';
    else if (form.delivery < iso(new Date())) errors.delivery = 'تاریخ تحویل نمی‌تواند قبل از امروز باشد.';
    if (form.deliveryType === 'pickup' && !form.address.trim()) errors.address = 'برای جمع‌آوری، آدرس لازم است.';
    if (form.official && !(num(form.vat) >= 0 && num(form.vat) <= 100)) errors.vat = 'نرخ ارزش افزوده باید بین ۰ تا ۱۰۰ باشد.';
    if (!form.lines.length) errors.lines = 'حداقل یک کالا اضافه کنید.';
    form.lines.forEach((line, index) => {
      const qty = num(line.qty);
      const buy = num(line.buy);
      if (!Number.isInteger(qty) || qty < 1) errors[`qty-${index}`] = 'x';
      if (!Number.isInteger(buy) || buy < 1) errors[`buy-${index}`] = 'x';
    });
    if (Object.keys(errors).some((key) => key.startsWith('qty-') || key.startsWith('buy-'))) errors.lines = 'تعداد و قیمت خرید هر ردیف باید عدد صحیح مثبت باشد.';
  }
  return errors;
}

function submit(status) {
  const form = ui.form;
  form.errors = validate(form, status);
  if (Object.keys(form.errors).length) return false;
  const lines = form.lines.map((line) => ({ sku: line.sku, qty: num(line.qty), buy: num(line.buy) }));
  const text = status === 'pending' ? 'ارسال برای تأیید مالی' : 'ذخیره پیش‌نویس';
  if (form.id) {
    const item = ui.requests.find((row) => row.id === form.id);
    Object.assign(item, { supplier: form.supplier, settle: form.settle, delivery: form.delivery, deliveryType: form.deliveryType, address: form.address, official: form.official, vat: num(form.vat) || 0, note: form.note, lines, status });
    item.log.push(nowLog(SELLER, text));
  } else {
    ui.seq += 1;
    ui.requests.unshift({ id: `SUP-${ui.seq}`, seller: SELLER, supplier: form.supplier, settle: form.settle, delivery: form.delivery, deliveryType: form.deliveryType, address: form.address, official: form.official, vat: num(form.vat) || 0, note: form.note, lines, status, created: new Date().toISOString(), log: [nowLog(SELLER, text)] });
  }
  ui.toast = status === 'pending' ? 'درخواست برای تأیید مالی ارسال شد. تا تأیید نشده می‌توانید لغوش کنید.' : 'پیش‌نویس ذخیره شد.';
  return true;
}

function rememberFocus() {
  const el = document.activeElement;
  focusKey = el?.dataset?.focus || '';
  focusPos = typeof el?.selectionStart === 'number' ? el.selectionStart : 0;
}
function restoreFocus() {
  if (!focusKey) return;
  const el = document.querySelector(`[data-focus="${CSS.escape(focusKey)}"]`);
  if (el) {
    el.focus();
    try { el.setSelectionRange(focusPos, focusPos); } catch { /* select elements */ }
  }
  focusKey = '';
}

let toastTimer = 0;

export function bindSupply(render) {
  restoreFocus();
  const rerender = () => { rememberFocus(); render(); };
  const commit = () => { persist(); render(); };
  if (ui.toast) {
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { ui.toast = ''; const el = document.querySelector('.ux-toast'); if (el) el.textContent = ''; }, 5000);
  }
  const on = (selector, event, handler) => document.querySelectorAll(selector).forEach((el) => el.addEventListener(event, (e) => handler(el, e)));

  on('[data-sup-close]', 'click', () => { ui.dialog = null; ui.upload = null; render(); });
  on('[data-sup-close-bg]', 'click', (el, e) => { if (e.target === el) { ui.dialog = null; ui.upload = null; render(); } });
  document.querySelector('.ux-dialog, .ux-drawer')?.addEventListener('keydown', (e) => { if (e.key === 'Escape') { ui.dialog = null; ui.upload = null; render(); } });
  const first = document.querySelector('.ux-dialog [data-sup-f], .ux-dialog button, .ux-drawer button');
  if (first && !focusKey && !document.activeElement?.closest?.('.ux-dialog, .ux-drawer')) first.focus();
  on('[data-sup-retry]', 'click', () => { const url = new URL(window.location.href); url.searchParams.delete('state'); window.history.replaceState({}, '', url); render(); });

  on('[data-sup-new]', 'click', () => { ui.form = blankForm(); ui.pickQuery = ''; ui.pickCategory = ''; ui.dialog = 'request'; render(); });
  on('[data-sup-edit]', 'click', (el) => {
    const item = ui.requests.find((row) => row.id === el.dataset.supEdit);
    ui.form = { ...item, vat: String(item.vat), lines: item.lines.map((line) => ({ sku: line.sku, qty: String(line.qty), buy: String(line.buy) })), errors: {} };
    ui.dialog = 'request';
    render();
  });
  on('[data-sup-view]', 'click', (el) => { ui.target = el.dataset.supView; ui.dialog = 'detail'; render(); });
  on('[data-sup-cancel]', 'click', (el) => { ui.target = el.dataset.supCancel; ui.dialog = 'cancel'; render(); });
  on('[data-sup-pdf]', 'click', (el) => { const item = ui.requests.find((row) => row.id === el.dataset.supPdf); if (item) printRequest(item); if (ui.toast) render(); });
  on('[data-sup-req-q]', 'input', (el) => { ui.reqQuery = el.value; rerender(); });
  on('[data-sup-req-status]', 'change', (el) => { ui.reqStatus = el.value; render(); });
  on('[data-sup-clear]', 'click', () => { ui.reqQuery = ''; ui.reqStatus = ''; render(); });

  on('[data-sup-f]', 'input', (el) => { ui.form[el.dataset.supF] = el.value; });
  on('[data-sup-f]', 'change', (el) => {
    ui.form[el.dataset.supF] = el.value;
    if (el.dataset.supF === 'deliveryType' || el.dataset.supF === 'vat') rerender();
  });
  on('[data-sup-official]', 'change', (el) => { ui.form.official = el.checked; rerender(); });
  on('[data-sup-pick-q]', 'input', (el) => { ui.pickQuery = el.value; rerender(); });
  on('[data-sup-pick-cat]', 'change', (el) => { ui.pickCategory = el.value; render(); });
  on('[data-sup-add]', 'click', (el) => {
    if (!ui.form.lines.some((line) => line.sku === el.dataset.supAdd)) ui.form.lines.push({ sku: el.dataset.supAdd, qty: '1', buy: '' });
    delete ui.form.errors.lines;
    focusKey = `buy-${ui.form.lines.length - 1}`;
    render();
  });
  on('[data-sup-line-qty]', 'input', (el) => { ui.form.lines[Number(el.dataset.supLineQty)].qty = el.value; rerender(); });
  on('[data-sup-line-buy]', 'input', (el) => { ui.form.lines[Number(el.dataset.supLineBuy)].buy = el.value; rerender(); });
  on('[data-sup-line-del]', 'click', (el) => { ui.form.lines.splice(Number(el.dataset.supLineDel), 1); render(); });
  on('[data-sup-submit]', 'click', (el) => {
    if (submit(el.dataset.supSubmit)) { ui.dialog = null; ui.form = null; commit(); } else render();
  });

  on('[data-sup-confirm]', 'click', (el) => {
    const action = el.dataset.supConfirm;
    const item = ui.requests.find((row) => row.id === ui.target);
    const reasonField = document.querySelector('[data-sup-reason]');
    if (reasonField && !reasonField.value.trim()) {
      reasonField.setAttribute('aria-invalid', 'true');
      document.querySelector('[data-sup-reason-err]').hidden = false;
      reasonField.focus();
      return;
    }
    if (!item) return;
    if (action === 'cancel' && ['draft', 'pending', 'returned'].includes(item.status)) {
      item.status = 'cancelled';
      item.log.push(nowLog(SELLER, 'لغو توسط فروشنده'));
      ui.toast = `«${item.id}» لغو شد.`;
    }
    if (action === 'approve' && item.status === 'pending') {
      item.status = 'approved';
      item.lines.forEach((line) => { line.saleAt = priceOf(line.sku).final; });
      item.log.push(nowLog(FINANCE, 'تأیید شد'));
      ui.toast = `«${item.id}» تأیید شد و موجودی در راه ساخته شد.`;
    }
    if (action === 'reject' && item.status === 'pending') {
      item.status = 'rejected';
      item.log.push(nowLog(FINANCE, `رد شد: ${reasonField.value.trim()}`));
      ui.toast = `«${item.id}» رد شد.`;
    }
    if (action === 'return' && item.status === 'pending') {
      item.status = 'returned';
      item.log.push(nowLog(FINANCE, `برگشت برای اصلاح: ${reasonField.value.trim()}`));
      ui.toast = `«${item.id}» برای اصلاح به فروشنده برگشت.`;
    }
    ui.dialog = null;
    commit();
  });
  on('[data-sup-fin]', 'click', (el) => { ui.target = el.dataset.id; ui.dialog = el.dataset.supFin; render(); });
  on('[data-sup-fin-tab]', 'click', (el) => { ui.financeTab = el.dataset.supFinTab; render(); });

  on('[data-sup-stock-tab]', 'click', (el) => { ui.stockTab = el.dataset.supStockTab; render(); });
  on('[data-sup-stock-q]', 'input', (el) => { ui.stockQuery = el.value; rerender(); });
  on('[data-sup-stock-clear]', 'click', () => { ui.stockQuery = ''; render(); });
  on('[data-sup-sku]', 'click', (el) => { ui.target = el.dataset.supSku; ui.dialog = 'sku'; render(); });
  on('[data-sup-receive]', 'click', (el) => {
    const sku = ui.target;
    const row = stockRow(skuByCode(sku));
    const line = row.lines.find((item) => item.requestId === el.dataset.supReceive);
    if (!line) return;
    const before = row.warehouse;
    const avg = row.avg ?? line.buy;
    ui.avg[sku] = Math.round((before * avg + line.buy) / (before + 1));
    ui.receipts.push({ requestId: line.requestId, sku, qty: 1 });
    ui.toast = 'یک عدد وارد انبار شد. در راه کم و موجودی انبار زیاد شد.';
    commit();
  });

  on('[data-sup-price]', 'input', (el) => {
    const row = stockRow(skuByCode(el.dataset.code));
    const edit = ui.edits[el.dataset.code] || { base: String(row.price.base), discount: String(row.price.discount), kind: row.price.kind };
    edit[el.dataset.supPrice] = el.value;
    ui.edits[el.dataset.code] = edit;
    rerender();
  });
  on('select[data-sup-price]', 'change', (el) => {
    const row = stockRow(skuByCode(el.dataset.code));
    const edit = ui.edits[el.dataset.code] || { base: String(row.price.base), discount: String(row.price.discount), kind: row.price.kind };
    edit.kind = el.value;
    ui.edits[el.dataset.code] = edit;
    render();
  });
  on('[data-sup-price-reset]', 'click', (el) => { delete ui.edits[el.dataset.supPriceReset]; render(); });
  on('[data-sup-price-save]', 'click', (el) => {
    const edit = ui.edits[el.dataset.supPriceSave];
    if (!edit || priceError(num(edit.base), num(edit.discount), edit.kind)) return;
    ui.prices[el.dataset.supPriceSave] = { base: num(edit.base), discount: num(edit.discount), kind: edit.kind, at: Date.now(), source: 'تکی' };
    delete ui.edits[el.dataset.supPriceSave];
    ui.toast = 'قیمت ذخیره شد. موجودی تغییری نکرد.';
    commit();
  });

  on('[data-sup-upload-open]', 'click', () => { ui.upload = { step: 1 }; ui.dialog = 'upload'; render(); });
  on('[data-sup-step]', 'click', (el) => { ui.upload = { ...ui.upload, step: Number(el.dataset.supStep), fileError: '' }; render(); });
  on('[data-sup-template]', 'click', () => {
    csv('price-template', [['کد SKU', 'کد کالا', 'نام کالا', 'دسته‌بندی', 'قیمت پایه فعلی', 'تخفیف فعلی', 'قیمت پایه جدید', 'تخفیف جدید', 'نوع تخفیف جدید (مبلغی یا درصدی)'],
      ...stockRows().map((row) => [row.code, row.productCode, row.product, row.category, row.price.base, row.price.kind === 'percent' ? `${row.price.discount}%` : row.price.discount, '', '', ''])]);
    ui.upload = { step: 2 };
    render();
  });
  on('[data-sup-file]', 'change', async (el) => {
    const file = el.files?.[0];
    if (!file) return;
    const result = readUpload(await file.text(), file);
    ui.upload = result.error ? { step: 2, fileError: result.error } : { step: 3, rows: result.rows, file: file.name, acceptWarnings: false };
    render();
  });
  on('[data-sup-warn]', 'change', (el) => { ui.upload.acceptWarnings = el.checked; render(); });
  on('[data-sup-error-report]', 'click', () => {
    csv('price-error-report', [['کد SKU', 'نام کالا', 'نتیجه', 'پیام'], ...ui.upload.rows.filter((row) => row.state === 'error' || row.state === 'warning').map((row) => [row.code, row.name, row.state === 'error' ? 'خطا' : 'هشدار', row.message])]);
  });
  on('[data-sup-apply]', 'click', () => {
    let applied = 0;
    ui.upload.rows.forEach((row) => {
      if (row.state === 'ok' || (row.state === 'warning' && ui.upload.acceptWarnings)) {
        ui.prices[row.code] = { ...row.next, at: Date.now(), source: 'اکسل' };
        applied += 1;
      }
    });
    const skipped = ui.upload.rows.filter((row) => row.state === 'error' || (row.state === 'warning' && !ui.upload.acceptWarnings)).length;
    ui.uploads.unshift({ at: new Date().toISOString(), who: SELLER, file: ui.upload.file, applied, errors: skipped });
    ui.upload = { step: 4, applied, skipped };
    commit();
  });

  on('[data-sup-export]', 'click', (el) => {
    const type = el.dataset.supExport;
    if (type === 'requests') {
      csv('supply-requests', [['شماره', 'تامین‌کننده', 'بوتیک', 'تعداد ردیف', 'مبلغ کل', 'خرید رسمی', 'تاریخ تسویه', 'تاریخ تحویل', 'نوع تحویل', 'وضعیت', 'تاریخ ثبت'],
        ...visibleRequests().map((item) => [item.id, item.supplier, item.seller, item.lines.length, totals(item).total, item.official ? 'بله' : 'خیر', jalali(item.settle), jalali(item.delivery), item.deliveryType === 'pickup' ? 'جمع‌آوری' : 'ارسال تامین‌کننده', STATUS[item.status][0], jalali(item.created)])]);
    } else if (type === 'lines') {
      csv('supply-request-lines', [['شماره', 'تامین‌کننده', 'کالا', 'SKU', 'تعداد', 'قیمت واحد خرید', 'مبلغ ردیف', 'وضعیت'],
        ...visibleRequests().flatMap((item) => item.lines.map((line) => [item.id, item.supplier, skuByCode(line.sku)?.product || '', line.sku, line.qty, line.buy, line.qty * line.buy, STATUS[item.status][0]]))]);
    } else if (type === 'stock') {
      csv('stock-status', [['کد کالا', 'کد SKU', 'نام کالا', 'موجودی انبار قابل فروش', 'موجودی در راه', 'موجودی انبار', 'موجودی سایه انبار', 'موجودی رزرو', 'نام تامین‌کننده کالا', 'میانگین قیمت خرید', 'آخرین قیمت خرید', 'قیمت فروش در آخرین تاریخ خرید'],
        ...filteredStock().map((row) => [row.productCode, row.code, row.product, row.sellable, row.transit, row.warehouse, row.shadow, row.reserved, row.supplier, row.avg ?? '', row.last ?? '', row.saleAtLast ?? ''])]);
    } else {
      csv('price-list', [['کد کالا', 'کد SKU', 'نام کالا', 'دسته‌بندی', 'قیمت پایه', 'تخفیف کالا', 'قیمت فروش نهایی سایت', 'تعداد قابل فروش', 'موجودی انبار'],
        ...filteredStock().map((row) => [row.productCode, row.code, row.product, row.category, row.price.base, row.price.kind === 'percent' ? `${row.price.discount}%` : row.price.discount, row.price.final, row.sellable, row.warehouse])]);
    }
  });
}
