import { catalog, fa } from './catalog.js';
import { pathLabel } from './tree.js';

const KEY = 'plaza-supply-flow-v4';
const SELLER = 'سارا محمدی · بوتیک ونک';
const FINANCE = 'رضا کاظمی · مالی';
const WAREHOUSE = 'انبار · Inbound';
const COMPANY = 'رایانه پایتخت ویراست';
const IN_TRANSIT = ['approved', 'warehouse_changed', 'overdue'];
const CURRENCY = 'ریال';

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
      id: 'INV-PLZ-01043', seller: SELLER, supplier: 'آوای ارتباط', settle: addDays(12), delivery: addDays(1), official: true, vat: 10, note: '',
      lines: [{ sku: 'PLAZA-GALAXY-BLK-256', qty: 4, buy: 38_400_000 }, { sku: 'PLAZA-REDMI-BLU-128', qty: 6, buy: 12_800_000 }],
      status: 'approved', created: stamp(3),
      log: [{ at: stamp(3), who: SELLER, text: 'تأیید پیش‌فاکتور و ارسال برای مالی' }, { at: stamp(2), who: FINANCE, text: 'تأیید شد. سند حسابداری در این فاز زده نشد.' }],
    },
    {
      id: 'INV-PLZ-01044', seller: SELLER, supplier: 'برفاب تجارت', settle: addDays(20), delivery: addDays(10), official: false, vat: 10, note: 'تاریخ فاکتور ۱۰ روز بعد است؛ ورود زودتر از انبار مجاز است.',
      lines: [{ sku: 'PLAZA-BARFAB-BF15', qty: 10, buy: 11_300_000 }],
      status: 'pending', created: stamp(1),
      log: [{ at: stamp(1), who: SELLER, text: 'تأیید پیش‌فاکتور و ارسال برای مالی' }],
    },
    {
      id: 'INV-PLZ-01045', seller: SELLER, supplier: 'پارس موبایل', settle: addDays(9), delivery: addDays(2), official: true, vat: 10, note: '',
      lines: [{ sku: 'PLAZA-IPHONE-BLK-256', qty: 3, buy: 92_500_000 }],
      status: 'returned', created: stamp(1),
      log: [{ at: stamp(1), who: SELLER, text: 'تأیید پیش‌فاکتور و ارسال برای مالی' }, { at: stamp(0), who: FINANCE, text: 'برگشت از مالی جهت اصلاح: پیش‌فاکتور با مبلغ ردیف یکی نیست.' }],
    },
    {
      id: 'INV-PLZ-01042', seller: SELLER, supplier: 'دیجی‌تامین', settle: addDays(8), delivery: addDays(14), official: false, vat: 10, note: '',
      lines: [{ sku: 'PLAZA-IPAD-256-11', qty: 2, buy: 34_500_000 }],
      status: 'draft', created: stamp(4),
      log: [{ at: stamp(4), who: SELLER, text: 'پیش‌نویس پیش‌فاکتور ذخیره شد' }],
    },
    {
      id: 'INV-PLZ-01039', seller: SELLER, supplier: 'نوین سیستم', settle: addDays(5), delivery: addDays(-3), official: false, vat: 10, note: '',
      lines: [{ sku: 'PLAZA-VIVO-16-512', qty: 2, buy: 41_000_000 }],
      status: 'overdue', created: stamp(12),
      log: [{ at: stamp(12), who: SELLER, text: 'تأیید پیش‌فاکتور و ارسال برای مالی' }, { at: stamp(10), who: FINANCE, text: 'تأیید شد.' }, { at: stamp(3), who: WAREHOUSE, text: 'تاریخ موعد گذشته ولی به انبار نرسیده.' }],
    },
  ];
}

function seedSuppliers() {
  return [
    { id: 's-pars', name: 'پارس موبایل', status: 'active' },
    { id: 's-digi', name: 'دیجی‌تامین', status: 'active' },
    { id: 's-barfab', name: 'برفاب تجارت', status: 'active' },
    { id: 's-ava', name: 'آوای ارتباط', status: 'active' },
    { id: 's-novin', name: 'نوین سیستم', status: 'inactive' },
  ];
}

function seedPriceLogs() {
  return [
    { at: stamp(4), who: SELLER, sku: 'PLAZA-GALAXY-BLK-256', product: 'گوشی سامسونگ گلکسی S25', oldFinal: 44_000_000, newFinal: 42_500_000, oldBase: 47_000_000, newBase: 47_000_000, oldDiscount: 3_000_000, newDiscount: 4_500_000, kind: 'amount' },
    { at: stamp(1), who: SELLER, sku: 'PLAZA-VIVO-16-512', product: 'لپ‌تاپ ایسوس ویووبوک', oldFinal: 47_000_000, newFinal: 46_000_000, oldBase: 49_000_000, newBase: 49_000_000, oldDiscount: 2_000_000, newDiscount: 3_000_000, kind: 'amount' },
  ];
}
function seedUploads() {
  return [
    { at: stamp(6), who: SELLER, file: 'price-1405-07-28.csv', applied: 8, errors: 1, warnings: 1, same: 1, total: 11 },
    { at: stamp(2), who: SELLER, file: 'price-1405-08-02.csv', applied: 3, errors: 0, warnings: 0, same: 7, total: 10 },
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
  uploads: saved.uploads?.length ? saved.uploads : seedUploads(),
  priceLogs: saved.priceLogs?.length ? saved.priceLogs : seedPriceLogs(),
  avg: saved.avg || {},
  bounds: saved.bounds || {},
  sellableOverride: saved.sellableOverride || {},
  suppliers: saved.suppliers?.length ? saved.suppliers : seedSuppliers(),
  seq: saved.seq || 1045,
  stockTab: 'stock',
  logTab: 'single',
  financeTab: 'pending',
  supplyTab: 'requests',
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
  stockEdits: {},
};

let focusKey = '';
let focusPos = 0;

function persist() {
  localStorage.setItem(KEY, JSON.stringify({
    requests: ui.requests, receipts: ui.receipts, prices: ui.prices, uploads: ui.uploads, priceLogs: ui.priceLogs,
    avg: ui.avg, bounds: ui.bounds, sellableOverride: ui.sellableOverride, suppliers: ui.suppliers, seq: ui.seq,
  }));
}

function demoState() {
  return new URLSearchParams(window.location.search).get('state') || '';
}

function escape(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}
function money(value) {
  return `${fa(Math.round(Number(value) || 0))} ${CURRENCY}`;
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
function jalaliTime(value) {
  if (!value) return '—';
  const date = typeof value === 'number' ? new Date(value) : new Date(value);
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}
function code(value) {
  return `<bdi dir="ltr" class="mono">${escape(value)}</bdi>`;
}

function variantOf(sku) {
  return Object.values(sku.combo || {}).filter(Boolean).join(' · ');
}

function mapSku(item, sku) {
  const categoryPath = pathLabel(item.leafId) || item.leafId || '';
  return {
    code: sku.code,
    productCode: item.model || item.id,
    product: item.title,
    variant: variantOf(sku),
    category: categoryPath.split(' / ').pop() || item.leafId || 'بدون دسته',
    categoryPath,
    listPrice: sku.price,
    compareAt: sku.compareAt,
    warehouse: Number(sku.stock || 0),
    reserved: Number(sku.reserved || 0),
  };
}

const FALLBACK_SKUS = [
  { code: 'PLAZA-IPHONE-BLK-256', productCode: 'A3293', product: 'گوشی اپل آیفون ۱۶ پرو', variant: 'مشکی · ۲۵۶ گیگابایت', category: 'گوشی موبایل', categoryPath: 'موبایل و تبلت / گوشی موبایل', listPrice: 98_900_000, compareAt: 109_000_000, warehouse: 6, reserved: 2 },
  { code: 'PLAZA-IPHONE-SLV-256', productCode: 'A3293', product: 'گوشی اپل آیفون ۱۶ پرو', variant: 'نقره‌ای · ۲۵۶ گیگابایت', category: 'گوشی موبایل', categoryPath: 'موبایل و تبلت / گوشی موبایل', listPrice: 99_400_000, compareAt: 109_000_000, warehouse: 1, reserved: 1 },
  { code: 'PLAZA-GALAXY-BLK-256', productCode: 'SM-S931', product: 'گوشی سامسونگ گلکسی S25', variant: 'مشکی · ۲۵۶ گیگابایت', category: 'گوشی موبایل', categoryPath: 'موبایل و تبلت / گوشی موبایل', listPrice: 42_500_000, compareAt: 47_000_000, warehouse: 8, reserved: 0 },
  { code: 'PLAZA-REDMI-BLU-128', productCode: 'Note14', product: 'گوشی شیائومی ردمی نوت ۱۴', variant: 'آبی · ۱۲۸ گیگابایت', category: 'گوشی موبایل', categoryPath: 'موبایل و تبلت / گوشی موبایل', listPrice: 14_900_000, compareAt: null, warehouse: 12, reserved: 0 },
  { code: 'PLAZA-IPAD-256-11', productCode: 'A2898', product: 'تبلت اپل آیپد ایر', variant: '۲۵۶ گیگابایت · ۱۱ اینچ', category: 'تبلت', categoryPath: 'موبایل و تبلت / تبلت', listPrice: 39_000_000, compareAt: null, warehouse: 3, reserved: 0 },
  { code: 'PLAZA-VIVO-16-512', productCode: 'X1504', product: 'لپ‌تاپ ایسوس ویووبوک', variant: '۱۶ گیگابایت · ۵۱۲ گیگابایت', category: 'لپ‌تاپ', categoryPath: 'لپ‌تاپ و کامپیوتر / لپ‌تاپ', listPrice: 46_000_000, compareAt: 49_000_000, warehouse: 2, reserved: 0 },
  { code: 'PLAZA-BARFAB-QH3000', productCode: 'QH-3000', product: 'بخاری برقی برفاب', variant: 'SKU پایه', category: 'بخاری برقی', categoryPath: 'لوازم گرمایشی / بخاری برقی', listPrice: 5_980_000, compareAt: null, warehouse: 9, reserved: 0 },
  { code: 'PLAZA-BARFAB-BF15', productCode: 'BF-15', product: 'بخاری گازی برفاب', variant: 'SKU پایه', category: 'بخاری گازی', categoryPath: 'لوازم گرمایشی / بخاری گازی', listPrice: 13_400_000, compareAt: null, warehouse: 5, reserved: 0 },
  { code: 'PLAZA-ENERGY-GH0618', productCode: 'GH-0618', product: 'بخاری گازی انرژی', variant: 'SKU پایه', category: 'بخاری گازی', categoryPath: 'لوازم گرمایشی / بخاری گازی', listPrice: 15_700_000, compareAt: null, warehouse: 4, reserved: 0 },
];

function skus() {
  const fromCatalog = (catalog.products || [])
    .filter((item) => item.status === 'published' && Array.isArray(item.skus) && item.skus.length)
    .flatMap((item) => item.skus.filter((sku) => sku?.code && sku.active !== false).map((sku) => mapSku(item, sku)));
  return fromCatalog.length ? fromCatalog : FALLBACK_SKUS;
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
  return ui.requests.filter((item) => IN_TRANSIT.includes(item.status)).flatMap((item) => item.lines.filter((line) => line.sku === value).map((line) => ({
    requestId: item.id,
    supplier: item.supplier,
    delivery: item.delivery,
    buy: line.buy,
    left: line.qty - received(item.id, line.sku),
  }))).filter((line) => line.left > 0);
}

function pricedLines(sku) {
  const from = addDays(-30);
  return ui.requests
    .filter((item) => ['approved', 'received', 'warehouse_changed', 'overdue'].includes(item.status))
    .flatMap((item) => item.lines.filter((line) => line.sku === sku).map((line) => ({ ...line, supplier: item.supplier, at: item.created, saleAt: line.saleAt })))
    .filter((line) => (line.at || '').slice(0, 10) >= from);
}

function monthAvg(sku) {
  const lines = pricedLines(sku);
  const qty = lines.reduce((sum, line) => sum + (Number(line.qty) || 0), 0);
  const amount = lines.reduce((sum, line) => sum + (Number(line.qty) || 0) * (Number(line.buy) || 0), 0);
  if (qty) return Math.round(amount / qty);
  return ui.avg[sku] ?? history[sku]?.avg ?? null;
}

// PRD-066: sellable = approved in-transit due within one day + warehouse − reserved; shadow is out of this phase.
function stockRow(sku) {
  const lines = transitLines(sku.code);
  const transit = lines.reduce((sum, line) => sum + line.left, 0);
  const limit = addDays(1);
  const near = lines.filter((line) => line.delivery <= limit).reduce((sum, line) => sum + line.left, 0);
  const arrived = ui.receipts.filter((item) => item.sku === sku.code).reduce((sum, item) => sum + item.qty, 0);
  const warehouse = sku.warehouse + arrived;
  const computed = Math.max(0, near + warehouse - sku.reserved);
  const override = ui.sellableOverride[sku.code];
  const sellable = Number.isInteger(override?.value) ? override.value : computed;
  const past = history[sku.code] || {};
  const lastLine = ui.requests.filter((item) => ['approved', 'received', 'warehouse_changed', 'overdue'].includes(item.status)).flatMap((item) => item.lines.map((line) => ({ ...line, supplier: item.supplier }))).filter((line) => line.sku === sku.code).pop();
  return {
    ...sku,
    transit,
    near,
    warehouse,
    computed,
    sellable,
    needsSupply: Number.isInteger(override?.value) && override.value !== computed,
    oversold: (near + warehouse - sku.reserved) < 0,
    supplier: lastLine?.supplier || past.supplier || '',
    avg: monthAvg(sku.code),
    last: lastLine?.buy ?? past.last ?? null,
    saleAtLast: lastLine?.saleAt ?? past.sale ?? null,
    lines,
    price: priceOf(sku.code),
    bound: boundsOf(sku.code, priceOf(sku.code).final),
  };
}

function remaining(item) {
  return item.lines.some((line) => line.qty - received(item.id, line.sku) > 0);
}

function markOverdue() {
  const today = iso(new Date());
  let changed = false;
  ui.requests.forEach((item) => {
    if (!['approved', 'warehouse_changed'].includes(item.status) || !remaining(item) || item.delivery >= today) return;
    item.status = 'overdue';
    changed = true;
    if (!item.log.some((entry) => entry.text.includes('تاریخ موعد گذشته'))) {
      item.log.push(nowLog(WAREHOUSE, 'تاریخ موعد گذشته ولی به انبار نرسیده.'));
    }
  });
  if (changed) persist();
}

function activeSuppliers() {
  return ui.suppliers.filter((item) => item.status === 'active');
}

function supplierOptions(selected) {
  const extra = selected && !activeSuppliers().some((item) => item.name === selected) ? `<option selected>${escape(selected)}</option>` : '';
  return `${extra}${activeSuppliers().map((item) => `<option ${selected === item.name ? 'selected' : ''}>${escape(item.name)}</option>`).join('')}`;
}

function boundNum(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function boundsOf(code, ref = 0, override = null) {
  const stored = { ...(ui.bounds[code] || { minPct: 20, maxPct: 25 }) };
  if (override) {
    ['minPct', 'maxPct', 'minPrice', 'maxPrice'].forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(override, key)) stored[key] = override[key];
    });
  }
  const minPct = boundNum(stored.minPct);
  const maxPct = boundNum(stored.maxPct);
  const minPrice = boundNum(stored.minPrice);
  const maxPrice = boundNum(stored.maxPrice);
  const floors = [];
  const caps = [];
  if (minPrice != null) floors.push(minPrice);
  if (maxPrice != null) caps.push(maxPrice);
  if (minPct != null && ref) floors.push(Math.round(ref * (1 - minPct / 100)));
  if (maxPct != null && ref) caps.push(Math.round(ref * (1 + maxPct / 100)));
  return {
    minPct,
    maxPct,
    minPrice,
    maxPrice,
    min: floors.length ? Math.max(...floors) : 0,
    max: caps.length ? Math.min(...caps) : Infinity,
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
  draft: ['پیش‌نویس (پیش‌فاکتور)', 'muted'],
  sent: ['تأیید پیش‌فاکتور و ارسال برای مالی', 'info'],
  pending: ['منتظر تأیید مالی', 'warning'],
  returned: ['برگشت از مالی جهت اصلاح', 'info'],
  approved: ['تأییدشده توسط مالی', 'success'],
  received: ['ورود به انبار', 'success'],
  rejected: ['ردشده توسط مالی', 'danger'],
  cancelled: ['لغوشده', 'muted'],
  warehouse_changed: ['تغییر درخواست توسط انبار', 'warning'],
  overdue: ['تاریخ موعد گذشته ولی به انبار نرسیده', 'danger'],
};

function canCancel(item) {
  return ['draft', 'sent', 'pending', 'returned'].includes(item.status);
}

function tip(id, label, text) {
  return `<span class="ux-tip" tabindex="0" aria-describedby="${id}">${label} ⓘ<span role="tooltip" id="${id}">${text}</span></span>`;
}

function depNote() {
  return `<aside class="ux-deps" aria-label="وابستگی‌های این فاز">
    <p><b>کالا از قبل ساخته شده:</b> فقط SKU منتشرشده قابل انتخاب است. محصول بدون SKU در این لیست نمی‌آید.</p>
    <p><b>انبار Inbound:</b> وقتی وضعیت به تأیید مالی برسد، تامین باید به سرویس ورود انبار وصل شود تا انبار ورود را ثبت کند.</p>
    <p><b>مالی:</b> سند حسابداری در این فاز زده نمی‌شود؛ وابستگی ثبت سند برای فاز بعد است.</p>
    <p><b>شناسه یکتا:</b> شماره فاکتور با مالی، انبار Inbound و سفارش یکی است.</p>
    <p><b>واحد پول:</b> همه مبلغ‌ها ریال است. ارزش افزوده داخل میانگین خرید نمی‌آید.</p>
  </aside>`;
}
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
  markOverdue();
  if (ui.supplyTab === 'suppliers') return suppliersPage();
  const list = state === 'empty' ? [] : visibleRequests();
  const kind = state === 'loading' || state === 'error' ? state : '';
  const filtered = ui.reqQuery || ui.reqStatus;
  const body = kind ? stateBlock(kind, 10) : list.length ? list.map(requestRow).join('') : stateBlock('', 10,
    filtered ? 'نتیجه‌ای با این فیلترها پیدا نشد.' : 'هنوز درخواست تامینی ثبت نکرده‌اید.',
    filtered ? '<button type="button" class="ux-btn" data-sup-clear>حذف فیلترها</button>' : '<button type="button" class="ux-btn ux-primary" data-sup-new>ثبت اولین درخواست</button>');
  return `<div class="ux-page">
    ${pageHead('تامین کالا · PRD-065', 'درخواست‌های تامین', `فروشنده: ${SELLER}. واحد پول ریال است. هر فاکتور شناسه یکتا دارد و با مالی، انبار Inbound و سفارش یکی است.`,
      `<button type="button" class="ux-btn ux-primary" data-sup-new aria-label="ثبت درخواست تامین جدید"><span aria-hidden="true">+</span> ثبت درخواست تامین</button>`)}
    ${depNote()}
    ${supplyTabs()}
    <section class="ux-card">
      <ol class="ux-flow" aria-label="مراحل درخواست تامین">
        <li>پیش‌نویس (پیش‌فاکتور)</li>
        <li>تأیید پیش‌فاکتور و ارسال برای مالی</li>
        <li>منتظر تأیید مالی</li>
        <li>برگشت از مالی جهت اصلاح</li>
        <li>تأییدشده توسط مالی</li>
        <li>ورود به انبار — فاکتور بسته می‌شود</li>
        <li>ردشده توسط مالی</li>
        <li>لغوشده — فقط تا قبل از تأیید مالی</li>
        <li>تغییر درخواست توسط انبار</li>
        <li>تاریخ موعد گذشته ولی به انبار نرسیده</li>
      </ol>
      <div class="ux-toolbar">
        <label class="ux-field ux-grow"><span>جست‌وجو</span><input data-focus="req-q" data-sup-req-q value="${escape(ui.reqQuery)}" placeholder="شناسه فاکتور، تامین‌کننده یا SKU" /></label>
        <label class="ux-field"><span>وضعیت</span><select data-sup-req-status><option value="">همه</option>${Object.entries(STATUS).map(([key, [label]]) => `<option value="${key}" ${ui.reqStatus === key ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
        <div class="ux-actions"><button type="button" class="ux-btn" data-sup-export="requests">خروجی اکسل درخواست‌ها</button><button type="button" class="ux-btn" data-sup-export="lines">خروجی اکسل ردیف کالا</button></div>
      </div>
      <div class="ux-table-wrap"><table class="ux-table" aria-label="لیست درخواست‌های تامین">
        <thead><tr><th scope="col">شناسه فاکتور</th><th scope="col">تامین‌کننده</th><th scope="col" class="num">ردیف SKU</th><th scope="col" class="num">مبلغ کل</th><th scope="col">خرید رسمی</th><th scope="col">تاریخ تسویه</th><th scope="col">تاریخ تحویل فاکتور</th><th scope="col">وضعیت</th><th scope="col">تاریخ ثبت</th><th scope="col"><span class="sr-only">عملیات</span></th></tr></thead>
        <tbody>${body}</tbody>
      </table></div>
      <p class="ux-caption">${fa(list.length)} درخواست · لغو فقط تا قبل از تأیید مالی ممکن است. بعد از تغییر درخواست توسط انبار تأیید دوباره فروشنده لازم نیست.</p>
    </section>
  </div>`;
}

function supplyTabs() {
  return `<div class="ux-tabs" role="tablist" aria-label="تامین">
    <button type="button" role="tab" aria-selected="${ui.supplyTab === 'requests'}" class="${ui.supplyTab === 'requests' ? 'active' : ''}" data-sup-tab="requests">درخواست‌ها</button>
    <button type="button" role="tab" aria-selected="${ui.supplyTab === 'suppliers'}" class="${ui.supplyTab === 'suppliers' ? 'active' : ''}" data-sup-tab="suppliers">تامین‌کنندگان</button>
  </div>`;
}

function suppliersPage() {
  const list = ui.suppliers;
  return `<div class="ux-page">
    ${pageHead('تامین‌کنندگان · PRD-065', 'لیست تامین‌کنندگان', 'فقط تامین‌کننده فعال در فرم درخواست دیده می‌شود. غیرفعال برای درخواست جدید انتخاب نمی‌شود.',
      `<button type="button" class="ux-btn ux-primary" data-sup-supplier-new>+ تامین‌کننده جدید</button>`)}
    ${depNote()}
    ${supplyTabs()}
    <section class="ux-card">
      <div class="ux-table-wrap"><table class="ux-table" aria-label="لیست تامین‌کنندگان">
        <thead><tr><th scope="col">نام</th><th scope="col">وضعیت</th><th scope="col"><span class="sr-only">عملیات</span></th></tr></thead>
        <tbody>${list.map((item) => `<tr>
          <th scope="row">${escape(item.name)}</th>
          <td>${item.status === 'active' ? '<span class="pill pill-success">فعال</span>' : '<span class="pill pill-muted">غیرفعال</span>'}</td>
          <td><div class="ux-row-actions">
            <button type="button" class="ux-btn ux-ghost" data-sup-supplier-edit="${item.id}">ویرایش</button>
            <button type="button" class="ux-btn ux-ghost" data-sup-supplier-toggle="${item.id}">${item.status === 'active' ? 'غیرفعال‌سازی' : 'فعال‌سازی'}</button>
          </div></td>
        </tr>`).join('')}</tbody>
      </table></div>
    </section>
  </div>`;
}

function supplierDialog() {
  const existing = ui.suppliers.find((item) => item.id === ui.target);
  const name = existing?._draftName ?? existing?.name ?? ui.supplierForm?.name ?? '';
  const status = existing?._draftStatus ?? existing?.status ?? ui.supplierForm?.status ?? 'active';
  return `<div class="ux-backdrop" data-sup-close-bg>
    <section class="ux-dialog" role="dialog" aria-modal="true" aria-labelledby="sup-title">
      <header class="ux-dialog-head"><h2 id="sup-title">${existing ? 'ویرایش تامین‌کننده' : 'تامین‌کننده جدید'}</h2><button type="button" class="ux-icon" data-sup-close aria-label="بستن">×</button></header>
      <div class="ux-dialog-body">
        <label class="ux-field"><span>نام تامین‌کننده</span><input data-focus="sup-name" data-sup-sname value="${escape(name)}" /></label>
        <label class="ux-field"><span>وضعیت</span><select data-sup-sstatus>
          <option value="active" ${status === 'active' ? 'selected' : ''}>فعال</option>
          <option value="inactive" ${status === 'inactive' ? 'selected' : ''}>غیرفعال</option>
        </select></label>
      </div>
      <footer class="ux-dialog-foot">
        <button type="button" class="ux-btn ux-primary" data-sup-supplier-save>ذخیره</button>
        <button type="button" class="ux-btn ux-ghost" data-sup-close>انصراف</button>
      </footer>
    </section>
  </div>`;
}

function requestRow(item) {
  const total = totals(item).total;
  const editable = item.status === 'draft' || item.status === 'returned';
  const inbound = IN_TRANSIT.includes(item.status);
  return `<tr>
    <th scope="row">${code(item.id)}</th>
    <td>${escape(item.supplier)}</td>
    <td class="num">${fa(item.lines.length)}</td>
    <td class="num">${money(total)}</td>
    <td>${item.official ? 'بله' : 'خیر'}</td>
    <td>${jalali(item.settle)}</td>
    <td>${jalali(item.delivery)}</td>
    <td>${pill(item.status)}</td>
    <td>${jalali(item.created)}</td>
    <td><div class="ux-row-actions">
      <button type="button" class="ux-btn ux-ghost" data-sup-view="${item.id}">جزئیات</button>
      ${editable ? `<button type="button" class="ux-btn ux-ghost" data-sup-edit="${item.id}">ویرایش</button>` : ''}
      ${canCancel(item) ? `<button type="button" class="ux-btn ux-ghost ux-danger-text" data-sup-cancel="${item.id}">لغو</button>` : ''}
      ${inbound ? `<button type="button" class="ux-btn ux-ghost" data-sup-inb="${item.id}">ورود انبار</button>` : ''}
      <button type="button" class="ux-btn ux-ghost" data-sup-pdf="${item.id}">سند PDF</button>
    </div></td>
  </tr>`;
}

function blankForm() {
  return { id: '', supplier: '', settle: addDays(14), delivery: addDays(1), official: false, vat: '10', note: '', lines: [], errors: {} };
}

function requestDialog() {
  const form = ui.form;
  const sum = totals(form);
  const query = ui.pickQuery.trim();
  const found = skus().filter((item) => (!ui.pickCategory || item.category === ui.pickCategory)
    && (!query || `${item.product} ${item.code} ${item.productCode} ${item.variant || ''}`.toLowerCase().includes(query.toLowerCase())));
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
          <label class="ux-field"><span>تامین‌کننده</span><select data-sup-f="supplier" ${inv('supplier')}><option value="">انتخاب تامین‌کننده فعال</option>${supplierOptions(form.supplier)}</select>${err('supplier') || '<small>فقط تامین‌کننده فعال</small>'}</label>
          <label class="ux-field"><span>تاریخ تسویه با تامین‌کننده</span><input type="date" data-sup-f="settle" value="${form.settle}" ${inv('settle')} />${err('settle') || '<small> </small>'}</label>
          <label class="ux-field"><span>تاریخ تحویل روی فاکتور</span><input type="date" data-sup-f="delivery" value="${form.delivery}" ${inv('delivery')} />${err('delivery') || '<small>ورود زودتر از این تاریخ هم پذیرفته می‌شود.</small>'}</label>
          <label class="ux-field ux-check-field"><span>خرید رسمی</span><div class="ux-switch"><input type="checkbox" role="switch" data-sup-official ${form.official ? 'checked' : ''} /> <span>با ارزش افزوده</span></div><small> </small></label>
          ${form.official ? `<label class="ux-field"><span>نرخ ارزش افزوده ٪</span><input inputmode="numeric" data-sup-f="vat" value="${escape(form.vat)}" ${inv('vat')} />${err('vat') || '<small> </small>'}</label>` : '<label class="ux-field"><span>نرخ ارزش افزوده ٪</span><input value="—" disabled /><small>با روشن شدن خرید رسمی فعال می‌شود.</small></label>'}
        </div>
        <p class="ux-note">انبار مقصد در این فاز نیست. ورود کالا از سرویس Inbound انبار می‌آید. سند حسابداری مالی هم در این فاز زده نمی‌شود.</p>

        <h3>SKUها</h3>
        <p class="ux-note">فقط کالایی که از قبل در کاتالوگ ساخته و SKU فعال دارد انتخاب می‌شود. ردیف درخواست همان SKU است، نه خود محصول.</p>
        <div class="ux-grid-2">
          <label class="ux-field"><span>جست‌وجوی SKU</span><input data-focus="pick-q" data-sup-pick-q value="${escape(ui.pickQuery)}" placeholder="نام کالا، مشخصه یا کد SKU" /><small> </small></label>
          <label class="ux-field"><span>دسته‌بندی</span><select data-sup-pick-cat><option value="">همه دسته‌ها</option>${categories().map((item) => `<option ${ui.pickCategory === item ? 'selected' : ''}>${escape(item)}</option>`).join('')}</select><small> </small></label>
        </div>
        <div class="ux-table-wrap ux-pick"><table class="ux-table ux-compact" aria-label="لیست SKUهای ساخته‌شده">
          <caption class="sr-only">لیست SKUهای ساخته‌شده</caption>
          <thead><tr><th scope="col">کالا</th><th scope="col">مشخصه SKU</th><th scope="col">کد SKU</th><th scope="col">دسته‌بندی</th><th scope="col"><span class="sr-only">افزودن</span></th></tr></thead>
          <tbody>${found.length ? found.map((item) => `<tr><td>${escape(item.product)}</td><td>${escape(item.variant || 'SKU پایه')}</td><td>${code(item.code)}</td><td>${escape(item.category)}</td><td>${added.has(item.code) ? '<span class="pill pill-success">اضافه شد</span>' : `<button type="button" class="ux-btn ux-ghost" data-sup-add="${item.code}">+ افزودن SKU</button>`}</td></tr>`).join('') : '<tr><td colspan="5"><div class="ux-empty"><b>SKU ساخته‌شده‌ای با این جست‌وجو نیست.</b><p>اول محصول و SKU را در کاتالوگ بسازید.</p></div></td></tr>'}</tbody>
        </table></div>
        <p class="ux-caption">${fa(found.length)} SKU در لیست</p>
        ${err('lines')}
        <div class="ux-table-wrap"><table class="ux-table" aria-label="ردیف‌های درخواست">
          <thead><tr><th scope="col">کالا</th><th scope="col">SKU</th><th scope="col" class="num">تعداد</th><th scope="col" class="num">قیمت واحد خرید (${CURRENCY})</th><th scope="col" class="num">مبلغ ردیف</th><th scope="col"><span class="sr-only">حذف</span></th></tr></thead>
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
        <button type="button" class="ux-btn ux-primary" data-sup-submit="pending">تأیید پیش‌فاکتور و ارسال برای مالی</button>
        <button type="button" class="ux-btn" data-sup-submit="draft">ذخیره پیش‌نویس (پیش‌فاکتور)</button>
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
          <div><dt>شناسه یکتا</dt><dd>${code(item.id)}</dd></div>
          <div><dt>فروشنده</dt><dd>${escape(item.seller)}</dd></div>
          <div><dt>تامین‌کننده</dt><dd>${escape(item.supplier)}</dd></div>
          <div><dt>تاریخ تسویه</dt><dd>${jalali(item.settle)}</dd></div>
          <div><dt>تاریخ تحویل فاکتور</dt><dd>${jalali(item.delivery)}</dd></div>
          <div><dt>سینک</dt><dd>مالی · انبار Inbound · سفارش</dd></div>
        </dl>
        ${IN_TRANSIT.includes(item.status) ? `<p class="ux-note">ورود زودتر از تاریخ فاکتور هم تأیید می‌شود و وضعیت به ورود به انبار می‌رود.</p>
          <div class="ux-actions"><button type="button" class="ux-btn ux-primary" data-sup-inb="${item.id}">ثبت ورود از Inbound</button></div>` : ''}
        ${item.status === 'received' ? '<p class="ux-note">فاکتور با ورود به انبار بسته شده است. بعد از تغییر درخواست توسط انبار تأیید دوباره فروشنده لازم نیست.</p>' : ''}
        ${item.status === 'overdue' ? '<p class="ux-alert" role="alert">تاریخ موعد گذشته ولی هنوز ورود به انبار نخورده است.</p>' : ''}
        ${item.status === 'warehouse_changed' ? '<p class="ux-note">ورود با مغایرت ثبت شد. تأیید دوباره فروشنده لازم نیست.</p>' : ''}
        <div class="ux-table-wrap"><table class="ux-table ux-compact" aria-label="ردیف‌های درخواست">
          <thead><tr><th scope="col">کالا</th><th scope="col">SKU</th><th scope="col" class="num">تعداد</th><th scope="col" class="num">قیمت خرید</th><th scope="col" class="num">مبلغ</th></tr></thead>
          <tbody>${item.lines.map((line) => `<tr><td>${escape(skuByCode(line.sku)?.product || line.sku)}</td><td>${code(line.sku)}</td><td class="num">${fa(line.qty)}</td><td class="num">${money(line.buy)}</td><td class="num">${money(line.qty * line.buy)}</td></tr>`).join('')}</tbody>
        </table></div>
        <dl class="ux-sum"><div><dt>جمع خالص</dt><dd>${money(sum.net)}</dd></div>${item.official ? `<div><dt>ارزش افزوده</dt><dd>${money(sum.vat)}</dd></div>` : ''}<div class="ux-sum-total"><dt>مبلغ کل</dt><dd>${money(sum.total)}</dd></div></dl>
        <h3>تاریخچه</h3>
        <ol class="ux-timeline">${item.log.map((entry) => `<li><b>${escape(entry.text)}</b><small>${escape(entry.who)} · ${jalali(entry.at)}</small></li>`).join('')}</ol>
      </div>
    </aside>
  </div>`;
}

function inboundDialog() {
  const item = ui.requests.find((row) => row.id === ui.target);
  if (!item) return '';
  const early = item.delivery > iso(new Date());
  return `<div class="ux-backdrop" data-sup-close-bg>
    <section class="ux-dialog" role="dialog" aria-modal="true" aria-labelledby="inb-title">
      <header class="ux-dialog-head"><h2 id="inb-title">ورود به انبار · ${code(item.id)}</h2><button type="button" class="ux-icon" data-sup-close aria-label="بستن">×</button></header>
      <div class="ux-dialog-body">
        <p>این ثبت از سرویس <b>Inbound انبار</b> می‌آید. تامین فقط وضعیت را می‌گیرد و فاکتور را می‌بندد. بعد از تغییر درخواست توسط انبار تأیید دوباره فروشنده لازم نیست.</p>
        <p>تاریخ تحویل فاکتور: <b>${jalali(item.delivery)}</b>${early ? ' — ورود زودتر از تاریخ فاکتور هم تأیید می‌شود و در ظرفیت کالا می‌نشیند.' : ''}</p>
        <div class="ux-table-wrap"><table class="ux-table ux-compact" aria-label="SKUهای فاکتور">
          <thead><tr><th scope="col">SKU</th><th scope="col" class="num">تعداد سند</th><th scope="col" class="num">واردشده</th></tr></thead>
          <tbody>${item.lines.map((line) => `<tr><td>${code(line.sku)}<br><small>${escape(skuByCode(line.sku)?.product || '')}</small></td><td class="num">${fa(line.qty)}</td><td class="num">${fa(received(item.id, line.sku))}</td></tr>`).join('')}</tbody>
        </table></div>
      </div>
      <footer class="ux-dialog-foot">
        <button type="button" class="ux-btn ux-primary" data-sup-inbound="match">ورود مطابق سند</button>
        <button type="button" class="ux-btn" data-sup-inbound="diff">ورود با مغایرت</button>
        <button type="button" class="ux-btn ux-ghost" data-sup-close>انصراف</button>
      </footer>
    </section>
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
  markOverdue();
  const state = demoState();
  if (state === 'denied') return denied();
  return `<div class="ux-page">
    ${pageHead('موجودی و قیمت · PRD-066 / PRD-067', 'قیمت و موجودی', 'مرجع قیمت‌گذاری همین صفحه است. واحد پول ریال. قابل فروش سایت جمع همه انبارهاست و می‌تواند دستی یا با اکسل عوض شود.')}
    ${depNote()}
    <div class="ux-tabs" role="tablist" aria-label="قیمت و موجودی">
      <button type="button" role="tab" aria-selected="${ui.stockTab === 'stock'}" class="${ui.stockTab === 'stock' ? 'active' : ''}" data-sup-stock-tab="stock">وضعیت موجودی</button>
      <button type="button" role="tab" aria-selected="${ui.stockTab === 'price'}" class="${ui.stockTab === 'price' ? 'active' : ''}" data-sup-stock-tab="price">لیست قیمت</button>
      <button type="button" role="tab" aria-selected="${ui.stockTab === 'log'}" class="${ui.stockTab === 'log' ? 'active' : ''}" data-sup-stock-tab="log">گزارش تغییرات قیمت</button>
    </div>
    ${ui.stockTab === 'price' ? priceSection(state) : ui.stockTab === 'log' ? priceLogSection() : stockSection(state)}
  </div>`;
}

function filteredStock() {
  const query = ui.stockQuery.trim().toLowerCase();
  return stockRows().filter((row) => !query || `${row.code} ${row.productCode} ${row.product}`.toLowerCase().includes(query));
}

function stockSection(state) {
  const rows = state === 'empty' ? [] : filteredStock();
  const kind = state === 'loading' || state === 'error' ? state : '';
  const body = kind ? stateBlock(kind, 13) : rows.length ? rows.map((row) => {
    const edit = ui.stockEdits[row.code] ?? String(row.sellable);
    const dirty = Number(edit) !== row.sellable;
    return `<tr class="${dirty || row.needsSupply ? 'is-dirty' : ''}">
    <td>${code(row.productCode)}</td>
    <th scope="row"><button type="button" class="ux-link" data-sup-sku="${row.code}">${code(row.code)}</button></th>
    <td>${escape(row.product)}</td>
    <td class="num">${fa(row.computed)}</td>
    <td class="num"><input class="ux-cell" inputmode="numeric" data-focus="sell-${row.code}" data-sup-sell="${row.code}" value="${escape(edit)}" aria-label="قابل فروش سایت ${escape(row.product)}" />
      ${row.needsSupply || dirty ? '<small class="ux-warn">باید بعداً در انبار تامین شود</small>' : ''}</td>
    <td class="num">${fa(row.transit)}</td>
    <td class="num">${fa(row.warehouse)}</td>
    <td class="num">${fa(row.reserved)}</td>
    <td>${row.supplier ? escape(row.supplier) : '—'}</td>
    <td class="num">${row.avg ? money(row.avg) : '—'}</td>
    <td class="num">${row.last ? money(row.last) : '—'}</td>
    <td class="num">${row.saleAtLast ? money(row.saleAtLast) : '—'}</td>
    <td>${dirty ? `<button type="button" class="ux-btn ux-primary" data-sup-sell-save="${row.code}">ذخیره</button>` : ''}</td>
  </tr>`;
  }).join('') : stateBlock('', 13, ui.stockQuery ? 'نتیجه‌ای با این جست‌وجو پیدا نشد.' : 'هنوز SKU فعالی نیست.', ui.stockQuery ? '<button type="button" class="ux-btn" data-sup-stock-clear>حذف جست‌وجو</button>' : '');
  return `<section class="ux-card" role="tabpanel">
    <div class="ux-toolbar">
      <label class="ux-field ux-grow"><span>جست‌وجو</span><input data-focus="stock-q" data-sup-stock-q value="${escape(ui.stockQuery)}" placeholder="کد کالا، کد SKU یا نام کالا" /></label>
      <div class="ux-actions"><button type="button" class="ux-btn ux-primary" data-sup-sell-upload>به‌روزرسانی قابل فروش با اکسل</button><button type="button" class="ux-btn" data-sup-export="stock">خروجی اکسل</button></div>
    </div>
    <div class="ux-table-wrap"><table class="ux-table" aria-label="وضعیت موجودی کالا">
      <thead><tr>
        <th scope="col">${tip('tip-pcode', 'کد کالا', 'کد مدل یا شناسه محصول والد همین SKU.')}</th>
        <th scope="col">${tip('tip-sku', 'کد SKU', 'واحد انتخاب و شمارش موجودی. درخواست تامین فقط روی SKU ثبت می‌شود.')}</th>
        <th scope="col">${tip('tip-name', 'نام کالا', 'عنوان محصول منتشرشده‌ای که این SKU به آن وصل است.')}</th>
        <th scope="col" class="num">${tip('tip-calc', 'قابل فروش محاسبه‌شده', 'جمع موجودی انبار + در راه یک روز قبل از ورود − رزرو. به تفکیک انبار نیست.')}</th>
        <th scope="col" class="num">${tip('tip-sellable', 'قابل فروش سایت', 'از فرمول پر می‌شود ولی دستی یا با اکسل هم عوض می‌شود. اگر عوض شود باید بعداً در انبار تامین شود.')}</th>
        <th scope="col" class="num">${tip('tip-transit', 'موجودی در راه', 'تعداد باقی‌مانده فاکتورهای تأییدشده، موعد گذشته یا مغایر انبار که هنوز ورود نخورده‌اند.')}</th>
        <th scope="col" class="num">${tip('tip-wh', 'موجودی انبار', 'جمع ورود Inbound همه انبارها. سایه در این فاز نیست.')}</th>
        <th scope="col" class="num">${tip('tip-rsv', 'موجودی رزرو', 'فروخته شده و هنوز از انبار خارج نشده.')}</th>
        <th scope="col">${tip('tip-sup', 'نام تامین‌کننده کالا', 'تامین‌کننده آخرین فاکتور تأییدشده همین SKU.')}</th>
        <th scope="col" class="num">${tip('tip-avg', 'میانگین قیمت خرید', 'میانگین موزون خرید یک ماه گذشته همین SKU، بدون ارزش افزوده، به ریال.')}</th>
        <th scope="col" class="num">${tip('tip-last', 'آخرین قیمت خرید', 'قیمت واحد آخرین فاکتور تأییدشده همین SKU به ریال.')}</th>
        <th scope="col" class="num">${tip('tip-sale', 'قیمت فروش در آخرین تاریخ خرید', 'قیمت سایت در زمان همان تأیید مالی؛ با تغییر بعدی عوض نمی‌شود.')}</th>
        <th scope="col"><span class="sr-only">ذخیره</span></th>
      </tr></thead>
      <tbody>${body}</tbody>
    </table></div>
    <p class="ux-caption">قابل فروش سایت = موجودی انبار + در راه (یک روز قبل از ورود) − رزرو. اگر عدد سایت را کمتر یا بیشتر بگذارید باید بعداً در انبار تامین شود.</p>
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
          <div><dt>قابل فروش محاسبه‌شده</dt><dd>${fa(row.computed)}</dd></div>
          <div><dt>قابل فروش سایت</dt><dd>${fa(row.sellable)}${row.needsSupply ? ' · باید بعداً تامین شود' : ''}</dd></div>
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
  const body = kind ? stateBlock(kind, 14) : rows.length ? rows.map(priceRow).join('') : stateBlock('', 14, ui.stockQuery ? 'نتیجه‌ای با این جست‌وجو پیدا نشد.' : 'هنوز SKU فعالی نیست.');
  return `<section class="ux-card" role="tabpanel">
    <div class="ux-toolbar">
      <label class="ux-field ux-grow"><span>جست‌وجو</span><input data-focus="price-q" data-sup-stock-q value="${escape(ui.stockQuery)}" placeholder="کد کالا، کد SKU یا نام کالا" /></label>
      <div class="ux-actions"><button type="button" class="ux-btn ux-primary" data-sup-upload-open>به‌روزرسانی با اکسل</button><button type="button" class="ux-btn" data-sup-export="prices">خروجی اکسل لیست</button></div>
    </div>
    <div class="ux-table-wrap"><table class="ux-table" aria-label="لیست قیمت و موجودی">
      <thead><tr>
        <th scope="col">${tip('tip-pc2', 'کد کالا', 'کد مدل محصول والد.')}</th>
        <th scope="col">${tip('tip-sku2', 'کد SKU', 'کلید ردیف قیمت. فقط SKU ساخته‌شده در این لیست است.')}</th>
        <th scope="col">${tip('tip-nm2', 'نام کالا', 'عنوان محصول منتشرشده.')}</th>
        <th scope="col">${tip('tip-cat2', 'دسته‌بندی', 'LeafCat همان SKU.')}</th>
        <th scope="col" class="num">${tip('tip-base', `قیمت پایه (${CURRENCY})`, 'قیمت قبل از تخفیف SKU. مرجع قیمت‌گذاری همین صفحه است.')}</th>
        <th scope="col">${tip('tip-kind', 'نوع تخفیف', 'مبلغی یا درصدی روی همین SKU. پروموشن سبد اینجا نیست.')}</th>
        <th scope="col" class="num">${tip('tip-off', 'تخفیف کالا', `اگر مبلغی باشد ${CURRENCY} کم می‌شود؛ اگر درصدی باشد از قیمت پایه.`)}</th>
        <th scope="col" class="num">${tip('tip-minp', `کف قیمت (${CURRENCY})`, 'حداقل مبلغ مجاز. خالی یعنی این قید نیست.')}</th>
        <th scope="col" class="num">${tip('tip-maxp', `سقف قیمت (${CURRENCY})`, 'حداکثر مبلغ مجاز. خالی یعنی این قید نیست.')}</th>
        <th scope="col" class="num">${tip('tip-minpct', 'کف درصد', 'حداقل درصد نسبت به قیمت پایه. خالی یعنی این قید نیست.')}</th>
        <th scope="col" class="num">${tip('tip-maxpct', 'سقف درصد', 'حداکثر درصد نسبت به قیمت پایه. خالی یعنی این قید نیست.')}</th>
        <th scope="col" class="num">${tip('tip-final', 'قیمت فروش نهایی سایت', 'خارج از بازه مجاز ذخیره نمی‌شود. کمتر از میانگین خرید فقط هشدار است.')}</th>
        <th scope="col" class="num">${tip('tip-sell2', 'قابل فروش سایت', 'از تب موجودی می‌آید و اینجا عوض نمی‌شود.')}</th>
        <th scope="col"><span class="sr-only">ذخیره</span></th>
      </tr></thead>
      <tbody>${body}</tbody>
    </table></div>
    <p class="ux-caption">این صفحه مرجع قیمت‌گذاری است و سند قبلی را جایگزین می‌کند. تأیید مدیر در این فاز نیست. اعمال از یک ساعت آینده هم در این فاز نیست. واحد پول ریال است.</p>
  </section>`;
}

function lastOf(list) {
  return [...list].sort((a, b) => new Date(b.at) - new Date(a.at))[0];
}

function priceLogSection() {
  const lastSingle = lastOf(ui.priceLogs);
  const lastExcel = lastOf(ui.uploads);
  const logs = ui.logTab === 'excel' ? ui.uploads : ui.priceLogs;
  const empty = ui.logTab === 'excel' ? 'هنوز اکسلی بارگذاری نشده.' : 'هنوز تغییر تکی ثبت نشده.';
  const body = logs.length
    ? (ui.logTab === 'excel' ? ui.uploads.map((item) => `<tr>
        <td>${jalaliTime(item.at)}</td><td>${escape(item.who)}</td><td>${code(item.file)}</td>
        <td class="num">${fa(item.total ?? item.applied + item.errors)}</td>
        <td class="num">${fa(item.applied)}</td><td class="num">${fa(item.same || 0)}</td>
        <td class="num">${fa(item.warnings || 0)}</td><td class="num">${fa(item.errors)}</td>
      </tr>`).join('') : ui.priceLogs.map((item) => `<tr>
        <td>${jalaliTime(item.at)}</td><td>${escape(item.who)}</td><td>${escape(item.product)}</td><td>${code(item.sku)}</td>
        <td class="num">${money(item.oldFinal)}</td><td class="num">${money(item.newFinal)}</td>
        <td>${item.kind === 'percent' ? 'درصدی' : 'مبلغی'}</td>
      </tr>`).join(''))
    : stateBlock('', ui.logTab === 'excel' ? 8 : 7, empty);
  return `<section class="ux-card" role="tabpanel">
    <div class="ux-stats">
      <div><span>آخرین تغییر تکی</span><b>${lastSingle ? escape(lastSingle.who) : '—'}</b><small>${lastSingle ? jalaliTime(lastSingle.at) : 'هنوز تغییری نیست'}</small></div>
      <div><span>آخرین بارگذاری اکسل</span><b>${lastExcel ? escape(lastExcel.who) : '—'}</b><small>${lastExcel ? `${jalaliTime(lastExcel.at)} · ${escape(lastExcel.file)}` : 'هنوز فایلی نیست'}</small></div>
    </div>
    <div class="ux-tabs" role="tablist" aria-label="نوع گزارش قیمت">
      <button type="button" role="tab" aria-selected="${ui.logTab === 'single'}" class="${ui.logTab === 'single' ? 'active' : ''}" data-sup-log-tab="single">لاگ موارد تکی</button>
      <button type="button" role="tab" aria-selected="${ui.logTab === 'excel'}" class="${ui.logTab === 'excel' ? 'active' : ''}" data-sup-log-tab="excel">گزارش نتیجه اکسل</button>
    </div>
    <div class="ux-table-wrap"><table class="ux-table" aria-label="${ui.logTab === 'excel' ? 'گزارش اکسل بارگذاری‌شده' : 'لاگ تغییرات تکی قیمت'}">
      <thead>${ui.logTab === 'excel'
    ? '<tr><th scope="col">زمان</th><th scope="col">کاربر</th><th scope="col">فایل</th><th scope="col" class="num">کل ردیف</th><th scope="col" class="num">اعمال‌شده</th><th scope="col" class="num">بدون تغییر</th><th scope="col" class="num">هشدار</th><th scope="col" class="num">خطا</th></tr>'
    : '<tr><th scope="col">زمان</th><th scope="col">کاربر</th><th scope="col">کالا</th><th scope="col">SKU</th><th scope="col" class="num">قیمت قبلی</th><th scope="col" class="num">قیمت جدید</th><th scope="col">نوع تخفیف</th></tr>'}</thead>
      <tbody>${body}</tbody>
    </table></div>
  </section>`;
}

function priceDraft(row) {
  const bound = row.bound || boundsOf(row.code, row.price.final);
  return ui.edits[row.code] || {
    base: String(row.price.base),
    discount: String(row.price.discount),
    kind: row.price.kind,
    minPrice: bound.minPrice == null ? '' : String(bound.minPrice),
    maxPrice: bound.maxPrice == null ? '' : String(bound.maxPrice),
    minPct: bound.minPct == null ? '' : String(bound.minPct),
    maxPct: bound.maxPct == null ? '' : String(bound.maxPct),
  };
}

function priceRow(row) {
  const edit = priceDraft(row);
  const boundNow = boundsOf(row.code, row.price.final);
  const dirty = edit.base !== String(row.price.base) || edit.discount !== String(row.price.discount) || edit.kind !== row.price.kind
    || edit.minPrice !== (boundNow.minPrice == null ? '' : String(boundNow.minPrice))
    || edit.maxPrice !== (boundNow.maxPrice == null ? '' : String(boundNow.maxPrice))
    || edit.minPct !== (boundNow.minPct == null ? '' : String(boundNow.minPct))
    || edit.maxPct !== (boundNow.maxPct == null ? '' : String(boundNow.maxPct));
  const preview = finalPrice(num(edit.base) || 0, num(edit.discount) || 0, edit.kind);
  const boundEdit = {
    minPrice: edit.minPrice === '' ? null : num(edit.minPrice),
    maxPrice: edit.maxPrice === '' ? null : num(edit.maxPrice),
    minPct: edit.minPct === '' ? null : num(edit.minPct),
    maxPct: edit.maxPct === '' ? null : num(edit.maxPct),
  };
  const error = dirty ? priceError(row.code, num(edit.base), num(edit.discount), edit.kind, boundEdit) : '';
  const warn = !error ? priceWarn(row.code, dirty ? preview : row.price.final) : '';
  return `<tr class="${dirty ? 'is-dirty' : ''}">
    <td>${code(row.productCode)}</td><th scope="row">${code(row.code)}</th><td>${escape(row.product)}</td><td>${escape(row.category)}</td>
    <td class="num"><input class="ux-cell" inputmode="numeric" data-focus="base-${row.code}" data-sup-price="base" data-code="${row.code}" value="${escape(edit.base)}" aria-label="قیمت پایه ${escape(row.product)}" /></td>
    <td><select class="ux-cell" data-sup-price="kind" data-code="${row.code}" aria-label="نوع تخفیف ${escape(row.product)}"><option value="amount" ${edit.kind === 'amount' ? 'selected' : ''}>مبلغی</option><option value="percent" ${edit.kind === 'percent' ? 'selected' : ''}>درصدی</option></select></td>
    <td class="num"><input class="ux-cell" inputmode="numeric" data-focus="off-${row.code}" data-sup-price="discount" data-code="${row.code}" value="${escape(edit.discount)}" aria-label="تخفیف ${escape(row.product)}" ${error ? 'aria-invalid="true"' : ''} /><small class="ux-unit">${edit.kind === 'percent' ? '٪' : CURRENCY}</small></td>
    <td class="num"><input class="ux-cell" inputmode="numeric" data-focus="minp-${row.code}" data-sup-price="minPrice" data-code="${row.code}" value="${escape(edit.minPrice)}" aria-label="کف قیمت ${escape(row.product)}" /></td>
    <td class="num"><input class="ux-cell" inputmode="numeric" data-focus="maxp-${row.code}" data-sup-price="maxPrice" data-code="${row.code}" value="${escape(edit.maxPrice)}" aria-label="سقف قیمت ${escape(row.product)}" /></td>
    <td class="num"><input class="ux-cell" inputmode="numeric" data-focus="minpct-${row.code}" data-sup-price="minPct" data-code="${row.code}" value="${escape(edit.minPct)}" aria-label="کف درصد ${escape(row.product)}" /></td>
    <td class="num"><input class="ux-cell" inputmode="numeric" data-focus="maxpct-${row.code}" data-sup-price="maxPct" data-code="${row.code}" value="${escape(edit.maxPct)}" aria-label="سقف درصد ${escape(row.product)}" /></td>
    <td class="num">${error ? `<small class="ux-error">${error}</small>` : `<b>${money(dirty ? preview : row.price.final)}</b>${warn ? `<small class="ux-warn">${warn}</small>` : ''}`}</td>
    <td class="num">${fa(row.sellable)}</td>
    <td>${dirty ? `<div class="ux-row-actions"><button type="button" class="ux-btn ux-primary" data-sup-price-save="${row.code}" ${error ? 'disabled' : ''}>ذخیره</button><button type="button" class="ux-btn ux-ghost" data-sup-price-reset="${row.code}">انصراف</button></div>` : ''}</td>
  </tr>`;
}

function priceError(code, base, discount, kind, override = null) {
  if (!Number.isFinite(base) || !Number.isInteger(base) || base <= 0) return 'قیمت پایه باید عدد صحیح مثبت باشد.';
  if (!Number.isFinite(discount) || discount < 0) return 'تخفیف نمی‌تواند منفی باشد.';
  if (kind === 'percent' && discount > 100) return 'درصد باید بین ۰ تا ۱۰۰ باشد.';
  if (kind !== 'percent' && discount > base) return 'تخفیف از قیمت پایه بیشتر است.';
  const final = finalPrice(base, discount, kind);
  if (final <= 0) return 'قیمت نهایی باید بزرگ‌تر از صفر باشد.';
  const bound = boundsOf(code, base, override);
  if (bound.min && final < bound.min) return `خارج از بازه مجاز است. کف ${money(bound.min)}.`;
  if (Number.isFinite(bound.max) && final > bound.max) return `خارج از بازه مجاز است. سقف ${money(bound.max)}.`;
  return '';
}

function priceWarn(code, final) {
  const avg = monthAvg(code);
  if (avg && final < avg) return `قیمت فروش از میانگین خرید (${money(avg)}) کمتر است. بازدارنده نیست.`;
  return '';
}

function uploadDialog() {
  const up = ui.upload || { step: 1 };
  const steps = ['دانلود قالب', 'بارگذاری فایل', 'پیش‌نمایش و اعتبارسنجی', 'اعمال و نتیجه'];
  let body = '';
  if (up.step === 1) {
    body = `<p>این فایل مرجع قیمت‌گذاری است. قیمت پایه/تخفیف و بازه مجاز (کف و سقف مبلغ و درصد) را پر کنید. سلول خالی یعنی بدون تغییر. خارج از بازه اعمال نمی‌شود. تأیید مدیر و اعمال از یک ساعت آینده در این فاز نیست.</p>
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
      ${up.rows.some((row) => row.state === 'warning') ? `<label class="ux-switch"><input type="checkbox" data-sup-warn ${up.acceptWarnings ? 'checked' : ''} /> <span>ردیف‌های دارای هشدار (مثلاً قیمت کمتر از میانگین خرید) هم اعمال شوند</span></label>` : ''}
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
  if (head.length < 13 || head[0].trim() !== 'کد SKU') return { error: 'ساختار فایل با قالب یکی نیست. ستون‌ها را حذف یا جابه‌جا نکنید و دوباره از قالب استفاده کنید.' };
  if (table.length - 1 > 10_000) return { error: 'تعداد ردیف بیشتر از ۱۰٬۰۰۰ است.' };
  const seen = new Set();
  const rows = table.slice(1).map((cells) => {
    const [skuCode, , name, , , , newBase, newDiscount, newKind, newMinPrice, newMaxPrice, newMinPct, newMaxPct] = cells.map((cell) => cell.trim());
    const sku = skuByCode(skuCode);
    const base = { code: skuCode, name: name || sku?.product || '', old: null, next: null, change: null };
    if (!sku) return { ...base, state: 'error', message: 'SKU نامعتبر' };
    if (seen.has(skuCode)) return { ...base, state: 'error', message: 'ردیف تکراری' };
    seen.add(skuCode);
    const old = priceOf(skuCode);
    const currentBound = boundsOf(skuCode, old.final);
    const boundOverride = {
      minPrice: newMinPrice === '' ? currentBound.minPrice : num(newMinPrice),
      maxPrice: newMaxPrice === '' ? currentBound.maxPrice : num(newMaxPrice),
      minPct: newMinPct === '' ? currentBound.minPct : num(newMinPct),
      maxPct: newMaxPct === '' ? currentBound.maxPct : num(newMaxPct),
    };
    if (!newBase && !newDiscount && !newKind && !newMinPrice && !newMaxPrice && !newMinPct && !newMaxPct) return { ...base, old, state: 'same' };
    const kind = newKind ? (newKind === 'درصدی' || newKind === 'percent' ? 'percent' : 'amount') : old.kind;
    const b = newBase ? num(newBase) : old.base;
    const d = newDiscount ? num(newDiscount) : old.discount;
    const message = priceError(skuCode, b, d, kind, boundOverride);
    if (message) return { ...base, old, state: 'error', message };
    const next = { base: b, discount: d, kind, final: finalPrice(b, d, kind), bound: boundOverride };
    const samePrice = next.base === old.base && next.discount === old.discount && next.kind === old.kind;
    const sameBound = boundOverride.minPrice === currentBound.minPrice && boundOverride.maxPrice === currentBound.maxPrice
      && boundOverride.minPct === currentBound.minPct && boundOverride.maxPct === currentBound.maxPct;
    if (samePrice && sameBound) return { ...base, old, state: 'same' };
    const change = old.final ? Math.round(((next.final - old.final) / old.final) * 100) : 0;
    const warn = priceWarn(skuCode, next.final);
    if (warn) return { ...base, old, next, change, state: 'warning', message: warn };
    if (ui.prices[skuCode]?.at && ui.prices[skuCode].at > file.lastModified) return { ...base, old, next, change, state: 'warning', message: 'قیمت بعد از ساخت فایل تغییر کرده است.' };
    return { ...base, old, next, change, state: 'ok' };
  });
  return { rows };
}

function readSellableUpload(text) {
  const table = parseCsv(text.replace(/^\uFEFF/, ''));
  const head = (table[0] || []).map((cell) => cell.trim());
  const skuIdx = head.indexOf('کد SKU');
  const valIdx = head.findIndex((cell) => cell.includes('قابل فروش سایت'));
  if (skuIdx < 0 || valIdx < 0) return { error: 'ستون «کد SKU» و «قابل فروش سایت» لازم است. از خروجی اکسل همین صفحه استفاده کنید.' };
  const rows = table.slice(1).map((cells) => {
    const skuCode = (cells[skuIdx] || '').trim();
    const sku = skuByCode(skuCode);
    if (!sku) return { code: skuCode, state: 'error', message: 'SKU نامعتبر' };
    const qty = num(cells[valIdx]);
    if (!Number.isInteger(qty) || qty < 0) return { code: skuCode, state: 'error', message: 'قابل فروش باید عدد صحیح صفر یا بیشتر باشد.' };
    return { code: skuCode, value: qty, state: 'ok' };
  });
  return { rows };
}

/* ---------- Finance (PRD-065) ---------- */

function financePage() {
  markOverdue();
  const state = demoState();
  if (state === 'denied') return denied();
  const pending = ui.requests.filter((item) => item.status === 'pending' || item.status === 'sent').sort((a, b) => a.settle.localeCompare(b.settle));
  const done = ui.requests.filter((item) => ['approved', 'rejected', 'returned', 'received', 'cancelled', 'warehouse_changed', 'overdue'].includes(item.status));
  const list = state === 'empty' ? [] : ui.financeTab === 'pending' ? pending : done;
  const kind = state === 'loading' || state === 'error' ? state : '';
  const body = kind ? stateBlock(kind, 9) : list.length ? list.map((item) => `<tr>
    <th scope="row">${code(item.id)}</th><td>${escape(item.seller)}</td><td>${escape(item.supplier)}</td>
    <td>${item.lines.map((line) => `${escape(skuByCode(line.sku)?.product || line.sku)} × ${fa(line.qty)}`).join('<br>')}</td>
    <td class="num">${money(totals(item).total)}</td><td>${item.official ? 'بله' : 'خیر'}</td><td>${jalali(item.settle)}</td><td>${pill(item.status)}</td>
    <td><div class="ux-row-actions"><button type="button" class="ux-btn ux-ghost" data-sup-view="${item.id}">جزئیات</button>${item.status === 'pending' || item.status === 'sent' ? `<button type="button" class="ux-btn ux-primary" data-sup-fin="approve" data-id="${item.id}">تأیید</button><button type="button" class="ux-btn" data-sup-fin="return" data-id="${item.id}">برگشت برای اصلاح</button><button type="button" class="ux-btn ux-ghost ux-danger-text" data-sup-fin="reject" data-id="${item.id}">رد</button><button type="button" class="ux-btn ux-ghost ux-danger-text" data-sup-fin="cancel" data-id="${item.id}">لغو</button>` : ''}</div></td>
  </tr>`).join('') : stateBlock('', 9, ui.financeTab === 'pending' ? 'درخواستی منتظر تأیید نیست.' : 'هنوز درخواستی بررسی نشده.');
  return `<div class="ux-page">
    ${pageHead('درخواست‌های مالی · PRD-065', 'درخواست‌های مالی', `کاربر: ${FINANCE}. شناسه فاکتور با تامین و انبار یکی است. سند حسابداری در این فاز زده نمی‌شود.`,
      `<button type="button" class="ux-btn" data-sup-export="finance-pending">خروجی اکسل در صف</button><button type="button" class="ux-btn" data-sup-export="finance-done">خروجی اکسل بررسی‌شده</button>`)}
    ${depNote()}
    <div class="ux-tabs" role="tablist" aria-label="درخواست‌های مالی">
      <button type="button" role="tab" aria-selected="${ui.financeTab === 'pending'}" class="${ui.financeTab === 'pending' ? 'active' : ''}" data-sup-fin-tab="pending">در صف (${fa(pending.length)})</button>
      <button type="button" role="tab" aria-selected="${ui.financeTab === 'done'}" class="${ui.financeTab === 'done' ? 'active' : ''}" data-sup-fin-tab="done">بررسی‌شده (${fa(done.length)})</button>
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
      <div>شناسه یکتا: <b dir="ltr">${item.id}</b></div><div>تاریخ ثبت: ${jalali(item.created)}</div>
      <div>تامین‌کننده: ${escape(item.supplier)}</div><div>سینک: مالی · انبار Inbound · سفارش</div>
      <div>تاریخ تسویه: ${jalali(item.settle)}</div><div>تاریخ تحویل فاکتور: ${jalali(item.delivery)}</div>
      <div>وضعیت: ${STATUS[item.status]?.[0] || item.status}</div><div>خرید رسمی: ${item.official ? 'بله' : 'خیر'}</div>
    </div>
    <table><thead><tr><th>ردیف</th><th>کالا</th><th>SKU</th><th>تعداد</th><th>قیمت واحد (${CURRENCY})</th><th>مبلغ (${CURRENCY})</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="sum"><div>جمع خالص: ${fa(sum.net)} ${CURRENCY}</div>${item.official ? `<div>ارزش افزوده: ${fa(sum.vat)} ${CURRENCY}</div>` : ''}<div><b>مبلغ کل: ${fa(sum.total)} ${CURRENCY}</b></div></div>
    <div class="sign"><div>امضای فروشنده</div><div>تأیید مالی</div></div>
  </div><script>window.onload = () => { window.focus(); window.print(); };<\/script></body></html>`);
  win.document.close();
}

/* ---------- Public ---------- */

export function supplyContent() {
  return `${supplyPage()}${ui.dialog === 'request' ? requestDialog() : ''}${ui.dialog === 'supplier' ? supplierDialog() : ''}${ui.dialog === 'detail' ? detailDrawer() : ''}${ui.dialog === 'inbound' ? inboundDialog() : ''}${ui.dialog === 'cancel' ? confirmDialog(`لغو «${ui.target}»؟`, 'لغو فقط تا قبل از تأیید مالی ممکن است. بعد از تأیید مالی فاکتور لغو نمی‌شود.', 'cancel', 'لغو درخواست') : ''}${toast()}`;
}

export function stockContent() {
  return `${stockPage()}${ui.dialog === 'sku' ? skuDrawer() : ''}${ui.dialog === 'upload' ? uploadDialog() : ''}${toast()}<input type="file" accept=".csv,text/csv" hidden data-sup-sell-file />`;
}

export function financeContent() {
  const reason = { approve: false, reject: 'دلیل رد', return: 'توضیح برای اصلاح', cancel: 'دلیل لغو' };
  const titles = { approve: `تأیید «${ui.target}»؟`, reject: `رد «${ui.target}»؟`, return: `برگشت «${ui.target}» برای اصلاح؟`, cancel: `لغو «${ui.target}»؟` };
  const texts = { approve: 'با تأیید، فاکتور به انبار Inbound می‌رود و موجودی در راه همان SKU ساخته می‌شود. سند حسابداری در این فاز زده نمی‌شود.', reject: 'ردشده توسط مالی نهایی است و موجودی در راه نمی‌سازد.', return: 'برگشت از مالی جهت اصلاح؛ فروشنده دوباره پیش‌فاکتور را می‌فرستد.', cancel: 'لغو فقط تا قبل از تأیید مالی ممکن است.' };
  const labels = { approve: 'تأیید درخواست', reject: 'رد درخواست', return: 'برگشت برای اصلاح', cancel: 'لغو توسط مالی' };
  const dialog = ['approve', 'reject', 'return', 'cancel'].includes(ui.dialog) ? confirmDialog(titles[ui.dialog], texts[ui.dialog], ui.dialog, labels[ui.dialog], reason[ui.dialog]) : '';
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
  const text = status === 'pending' ? 'تأیید پیش‌فاکتور و ارسال برای مالی' : 'ذخیره پیش‌نویس (پیش‌فاکتور)';
  if (form.id) {
    const item = ui.requests.find((row) => row.id === form.id);
    Object.assign(item, { supplier: form.supplier, settle: form.settle, delivery: form.delivery, official: form.official, vat: num(form.vat) || 0, note: form.note, lines, status });
    item.log.push(nowLog(SELLER, text));
  } else {
    ui.seq += 1;
    ui.requests.unshift({
      id: `INV-PLZ-${String(ui.seq).padStart(5, '0')}`,
      seller: SELLER, supplier: form.supplier, settle: form.settle, delivery: form.delivery, official: form.official, vat: num(form.vat) || 0, note: form.note, lines, status,
      created: new Date().toISOString(),
      log: [nowLog(SELLER, text)],
    });
  }
  ui.toast = status === 'pending' ? 'پیش‌فاکتور برای مالی ارسال شد. تا قبل از تأیید مالی می‌توانید لغوش کنید.' : 'پیش‌نویس پیش‌فاکتور ذخیره شد.';
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

  on('[data-sup-tab]', 'click', (el) => { ui.supplyTab = el.dataset.supTab; render(); });
  on('[data-sup-supplier-new]', 'click', () => { ui.target = ''; ui.supplierForm = { name: '', status: 'active' }; ui.dialog = 'supplier'; render(); });
  on('[data-sup-supplier-edit]', 'click', (el) => { ui.target = el.dataset.supSupplierEdit; ui.dialog = 'supplier'; render(); });
  on('[data-sup-sname]', 'input', (el) => {
    const existing = ui.suppliers.find((item) => item.id === ui.target);
    if (existing) existing._draftName = el.value;
    else ui.supplierForm = { ...(ui.supplierForm || { status: 'active' }), name: el.value };
  });
  on('[data-sup-sstatus]', 'change', (el) => {
    const existing = ui.suppliers.find((item) => item.id === ui.target);
    if (existing) existing._draftStatus = el.value;
    else ui.supplierForm = { ...(ui.supplierForm || { name: '' }), status: el.value };
  });
  on('[data-sup-supplier-save]', 'click', () => {
    const existing = ui.suppliers.find((item) => item.id === ui.target);
    const name = (existing?._draftName ?? existing?.name ?? ui.supplierForm?.name ?? '').trim();
    const status = existing?._draftStatus || existing?.status || ui.supplierForm?.status || 'active';
    if (!name) { ui.toast = 'نام تامین‌کننده را وارد کنید.'; render(); return; }
    if (ui.suppliers.some((item) => item.name === name && item.id !== existing?.id)) { ui.toast = 'این نام قبلاً ثبت شده است.'; render(); return; }
    if (existing) {
      existing.name = name;
      existing.status = status;
      delete existing._draftName;
      delete existing._draftStatus;
    } else {
      ui.suppliers.push({ id: `s-${Date.now()}`, name, status });
    }
    ui.dialog = null;
    ui.supplierForm = null;
    ui.toast = 'تامین‌کننده ذخیره شد.';
    commit();
  });
  on('[data-sup-supplier-toggle]', 'click', (el) => {
    const item = ui.suppliers.find((row) => row.id === el.dataset.supSupplierToggle);
    if (!item) return;
    item.status = item.status === 'active' ? 'inactive' : 'active';
    ui.toast = item.status === 'active' ? `«${item.name}» فعال شد.` : `«${item.name}» غیرفعال شد و در درخواست جدید دیده نمی‌شود.`;
    commit();
  });
  on('[data-sup-new]', 'click', () => { ui.form = blankForm(); ui.pickQuery = ''; ui.pickCategory = ''; ui.dialog = 'request'; render(); });
  on('[data-sup-edit]', 'click', (el) => {
    const item = ui.requests.find((row) => row.id === el.dataset.supEdit);
    ui.form = { ...item, vat: String(item.vat), lines: item.lines.map((line) => ({ sku: line.sku, qty: String(line.qty), buy: String(line.buy) })), errors: {} };
    ui.dialog = 'request';
    render();
  });
  on('[data-sup-view]', 'click', (el) => { ui.target = el.dataset.supView; ui.dialog = 'detail'; render(); });
  on('[data-sup-inb]', 'click', (el) => { ui.target = el.dataset.supInb; ui.dialog = 'inbound'; render(); });
  on('[data-sup-inbound]', 'click', (el) => {
    const item = ui.requests.find((row) => row.id === ui.target);
    if (!item || !IN_TRANSIT.includes(item.status)) return;
    const early = item.delivery > iso(new Date());
    if (el.dataset.supInbound === 'match') {
      item.lines.forEach((line) => {
        const left = line.qty - received(item.id, line.sku);
        if (left > 0) ui.receipts.push({ requestId: item.id, sku: line.sku, qty: left, at: new Date().toISOString() });
      });
      item.status = 'received';
      item.log.push(nowLog(WAREHOUSE, early
        ? 'ورود زودتر از تاریخ فاکتور تأیید شد. فاکتور بسته شد و در ظرفیت کالا نشست.'
        : 'ورود به انبار مطابق سند. فاکتور بسته شد.'));
      ui.toast = early
        ? `«${item.id}» زودتر وارد شد، وضعیت ورود به انبار شد و در ظرفیت کالا نشست.`
        : `«${item.id}» وارد انبار شد و فاکتور بسته شد.`;
    } else {
      item.lines.forEach((line) => {
        const left = line.qty - received(item.id, line.sku);
        const take = left > 1 ? left - 1 : left;
        if (take > 0) ui.receipts.push({ requestId: item.id, sku: line.sku, qty: take, at: new Date().toISOString() });
      });
      item.status = 'warehouse_changed';
      item.log.push(nowLog(WAREHOUSE, 'ورود با مغایرت نسبت به سند فروشنده ثبت شد. تأیید دوباره فروشنده لازم نیست.'));
      ui.toast = `«${item.id}» با مغایرت وارد شد. تأیید دوباره فروشنده لازم نیست.`;
    }
    ui.dialog = null;
    commit();
  });
  on('[data-sup-cancel]', 'click', (el) => { ui.target = el.dataset.supCancel; ui.dialog = 'cancel'; render(); });
  on('[data-sup-pdf]', 'click', (el) => { const item = ui.requests.find((row) => row.id === el.dataset.supPdf); if (item) printRequest(item); if (ui.toast) render(); });
  on('[data-sup-req-q]', 'input', (el) => { ui.reqQuery = el.value; rerender(); });
  on('[data-sup-req-status]', 'change', (el) => { ui.reqStatus = el.value; render(); });
  on('[data-sup-clear]', 'click', () => { ui.reqQuery = ''; ui.reqStatus = ''; render(); });

  on('[data-sup-f]', 'input', (el) => { ui.form[el.dataset.supF] = el.value; });
  on('[data-sup-f]', 'change', (el) => {
    ui.form[el.dataset.supF] = el.value;
    if (el.dataset.supF === 'vat') rerender();
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
    if (action === 'cancel' && canCancel(item)) {
      item.status = 'cancelled';
      const reason = reasonField?.value.trim();
      item.log.push(nowLog(reason ? FINANCE : SELLER, reason ? `لغوشده توسط مالی: ${reason}` : 'لغو توسط فروشنده'));
      ui.toast = `«${item.id}» لغو شد.`;
    }
    if (action === 'approve' && (item.status === 'pending' || item.status === 'sent')) {
      item.status = 'approved';
      item.lines.forEach((line) => { line.saleAt = priceOf(line.sku).final; });
      item.log.push(nowLog(FINANCE, 'تأیید شد. فاکتور به انبار Inbound رفت. سند حسابداری در این فاز زده نشد.'));
      ui.toast = `«${item.id}» تأیید شد، موجودی در راه ساخته شد و به Inbound انبار وصل شد.`;
    }
    if (action === 'reject' && (item.status === 'pending' || item.status === 'sent')) {
      item.status = 'rejected';
      item.log.push(nowLog(FINANCE, `ردشده توسط مالی: ${reasonField.value.trim()}`));
      ui.toast = `«${item.id}» رد شد.`;
    }
    if (action === 'return' && (item.status === 'pending' || item.status === 'sent')) {
      item.status = 'returned';
      item.log.push(nowLog(FINANCE, `برگشت از مالی جهت اصلاح: ${reasonField.value.trim()}`));
      ui.toast = `«${item.id}» برای اصلاح به فروشنده برگشت.`;
    }
    ui.dialog = null;
    commit();
  });
  on('[data-sup-fin]', 'click', (el) => { ui.target = el.dataset.id; ui.dialog = el.dataset.supFin; render(); });
  on('[data-sup-fin-tab]', 'click', (el) => { ui.financeTab = el.dataset.supFinTab; render(); });

  on('[data-sup-stock-tab]', 'click', (el) => { ui.stockTab = el.dataset.supStockTab; render(); });
  on('[data-sup-log-tab]', 'click', (el) => { ui.logTab = el.dataset.supLogTab; render(); });
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
    ui.receipts.push({ requestId: line.requestId, sku, qty: 1, at: new Date().toISOString() });
    const request = ui.requests.find((item) => item.id === line.requestId);
    if (request && request.lines.every((entry) => received(request.id, entry.sku) >= entry.qty)) {
      request.status = 'received';
      request.log.push(nowLog(WAREHOUSE, request.delivery > iso(new Date())
        ? 'ورود زودتر از تاریخ فاکتور تأیید شد. فاکتور بسته شد و در ظرفیت کالا نشست.'
        : 'ورود کامل به انبار. فاکتور بسته شد.'));
    }
    ui.toast = 'ورود Inbound ثبت شد. در راه کم شد و در ظرفیت کالا نشست.';
    commit();
  });

  on('[data-sup-price]', 'input', (el) => {
    const row = stockRow(skuByCode(el.dataset.code));
    const edit = priceDraft(row);
    edit[el.dataset.supPrice] = el.value;
    ui.edits[el.dataset.code] = edit;
    rerender();
  });
  on('select[data-sup-price]', 'change', (el) => {
    const row = stockRow(skuByCode(el.dataset.code));
    const edit = priceDraft(row);
    edit.kind = el.value;
    ui.edits[el.dataset.code] = edit;
    render();
  });
  on('[data-sup-price-reset]', 'click', (el) => { delete ui.edits[el.dataset.supPriceReset]; render(); });
  on('[data-sup-price-save]', 'click', (el) => {
    const sku = el.dataset.supPriceSave;
    const row = stockRow(skuByCode(sku));
    const edit = ui.edits[sku];
    if (!edit) return;
    const boundEdit = {
      minPrice: edit.minPrice === '' ? null : num(edit.minPrice),
      maxPrice: edit.maxPrice === '' ? null : num(edit.maxPrice),
      minPct: edit.minPct === '' ? null : num(edit.minPct),
      maxPct: edit.maxPct === '' ? null : num(edit.maxPct),
    };
    if (priceError(sku, num(edit.base), num(edit.discount), edit.kind, boundEdit)) return;
    const old = priceOf(sku);
    const next = { base: num(edit.base), discount: num(edit.discount), kind: edit.kind, final: finalPrice(num(edit.base), num(edit.discount), edit.kind) };
    ui.prices[sku] = { ...next, at: Date.now(), source: 'تکی' };
    ui.bounds[sku] = boundEdit;
    ui.priceLogs.unshift({ at: new Date().toISOString(), who: SELLER, sku, product: skuByCode(sku)?.product || sku, oldFinal: old.final, newFinal: next.final, oldBase: old.base, newBase: next.base, oldDiscount: old.discount, newDiscount: next.discount, kind: next.kind });
    delete ui.edits[sku];
    const warn = priceWarn(sku, next.final);
    ui.toast = warn ? `قیمت ذخیره شد. ${warn}` : 'قیمت ذخیره شد. موجودی تغییری نکرد.';
    commit();
  });
  on('[data-sup-sell]', 'input', (el) => { ui.stockEdits[el.dataset.supSell] = el.value; rerender(); });
  on('[data-sup-sell-save]', 'click', (el) => {
    const sku = el.dataset.supSellSave;
    const value = num(ui.stockEdits[sku]);
    if (!Number.isInteger(value) || value < 0) { ui.toast = 'قابل فروش سایت باید عدد صحیح صفر یا بیشتر باشد.'; render(); return; }
    const computed = stockRow(skuByCode(sku)).computed;
    if (value === computed) delete ui.sellableOverride[sku];
    else ui.sellableOverride[sku] = { value, at: Date.now() };
    delete ui.stockEdits[sku];
    ui.toast = value === computed ? 'قابل فروش سایت به مقدار محاسبه‌شده برگشت.' : 'قابل فروش سایت عوض شد و باید بعداً در انبار تامین شود.';
    commit();
  });
  on('[data-sup-sell-upload]', 'click', () => document.querySelector('[data-sup-sell-file]')?.click());
  on('[data-sup-sell-file]', 'change', async (el) => {
    const file = el.files?.[0];
    el.value = '';
    if (!file) return;
    const result = readSellableUpload(await file.text());
    if (result.error) { ui.toast = result.error; render(); return; }
    let applied = 0;
    result.rows.forEach((row) => {
      if (row.state !== 'ok') return;
      const computed = stockRow(skuByCode(row.code)).computed;
      if (row.value === computed) delete ui.sellableOverride[row.code];
      else ui.sellableOverride[row.code] = { value: row.value, at: Date.now() };
      applied += 1;
    });
    ui.toast = `${fa(applied)} ردیف قابل فروش سایت از اکسل اعمال شد. اگر با فرمول فرق داشته باشد باید بعداً در انبار تامین شود.`;
    commit();
  });

  on('[data-sup-upload-open]', 'click', () => { ui.upload = { step: 1 }; ui.dialog = 'upload'; render(); });
  on('[data-sup-step]', 'click', (el) => { ui.upload = { ...ui.upload, step: Number(el.dataset.supStep), fileError: '' }; render(); });
  on('[data-sup-template]', 'click', () => {
    csv('price-template', [['کد SKU', 'کد کالا', 'نام کالا', 'دسته‌بندی', 'قیمت پایه فعلی', 'تخفیف فعلی', 'قیمت پایه جدید', 'تخفیف جدید', 'نوع تخفیف جدید (مبلغی یا درصدی)', 'کف قیمت (ریال)', 'سقف قیمت (ریال)', 'کف درصد', 'سقف درصد'],
      ...stockRows().map((row) => [row.code, row.productCode, row.product, row.category, row.price.base, row.price.kind === 'percent' ? `${row.price.discount}%` : row.price.discount, '', '', '', row.bound.minPrice ?? '', row.bound.maxPrice ?? '', row.bound.minPct ?? '', row.bound.maxPct ?? ''])]);
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
        const { bound, ...price } = row.next;
        ui.prices[row.code] = { ...price, at: Date.now(), source: 'اکسل' };
        if (bound) ui.bounds[row.code] = bound;
        applied += 1;
      }
    });
    const skipped = ui.upload.rows.filter((row) => row.state === 'error' || (row.state === 'warning' && !ui.upload.acceptWarnings)).length;
    const warnings = ui.upload.rows.filter((row) => row.state === 'warning').length;
    const same = ui.upload.rows.filter((row) => row.state === 'same').length;
    ui.uploads.unshift({ at: new Date().toISOString(), who: SELLER, file: ui.upload.file, applied, errors: skipped, warnings, same, total: ui.upload.rows.length });
    ui.upload = { step: 4, applied, skipped };
    commit();
  });

  on('[data-sup-export]', 'click', (el) => {
    const type = el.dataset.supExport;
    if (type === 'requests') {
      csv('supply-requests', [['شماره', 'تامین‌کننده', 'بوتیک', 'تعداد ردیف', 'مبلغ کل', 'خرید رسمی', 'تاریخ تسویه', 'تاریخ تحویل', 'وضعیت', 'تاریخ ثبت'],
        ...visibleRequests().map((item) => [item.id, item.supplier, item.seller, item.lines.length, totals(item).total, item.official ? 'بله' : 'خیر', jalali(item.settle), jalali(item.delivery), STATUS[item.status][0], jalali(item.created)])]);
    } else if (type === 'finance-pending' || type === 'finance-done') {
      const rows = type === 'finance-pending'
        ? ui.requests.filter((item) => item.status === 'pending' || item.status === 'sent').sort((a, b) => a.settle.localeCompare(b.settle))
        : ui.requests.filter((item) => ['approved', 'rejected', 'returned', 'received', 'cancelled', 'warehouse_changed', 'overdue'].includes(item.status));
      csv(type === 'finance-pending' ? 'finance-queue' : 'finance-reviewed', [['شماره', 'فروشنده', 'تامین‌کننده', 'کالاها', 'مبلغ کل', 'خرید رسمی', 'تاریخ تسویه', 'وضعیت', 'تاریخ ثبت'],
        ...rows.map((item) => [item.id, item.seller, item.supplier, item.lines.map((line) => `${skuByCode(line.sku)?.product || line.sku} × ${line.qty}`).join(' | '), totals(item).total, item.official ? 'بله' : 'خیر', jalali(item.settle), STATUS[item.status][0], jalali(item.created)])]);
    } else if (type === 'lines') {
      csv('supply-request-lines', [['شماره', 'تامین‌کننده', 'کالا', 'SKU', 'تعداد', 'قیمت واحد خرید', 'مبلغ ردیف', 'وضعیت'],
        ...visibleRequests().flatMap((item) => item.lines.map((line) => [item.id, item.supplier, skuByCode(line.sku)?.product || '', line.sku, line.qty, line.buy, line.qty * line.buy, STATUS[item.status][0]]))]);
    } else if (type === 'stock') {
      csv('stock-status', [['کد کالا', 'کد SKU', 'نام کالا', 'قابل فروش محاسبه‌شده', 'قابل فروش سایت', 'موجودی در راه', 'موجودی انبار', 'موجودی رزرو', 'نام تامین‌کننده کالا', 'میانگین قیمت خرید یک ماه گذشته بدون ارزش افزوده (ریال)', 'آخرین قیمت خرید (ریال)', 'قیمت فروش در آخرین تاریخ خرید (ریال)'],
        ...filteredStock().map((row) => [row.productCode, row.code, row.product, row.computed, row.sellable, row.transit, row.warehouse, row.reserved, row.supplier, row.avg ?? '', row.last ?? '', row.saleAtLast ?? ''])]);
    } else {
      csv('price-list', [['کد کالا', 'کد SKU', 'نام کالا', 'دسته‌بندی', 'قیمت پایه (ریال)', 'تخفیف کالا', 'کف قیمت (ریال)', 'سقف قیمت (ریال)', 'کف درصد', 'سقف درصد', 'قیمت فروش نهایی سایت (ریال)', 'قابل فروش سایت'],
        ...filteredStock().map((row) => [row.productCode, row.code, row.product, row.category, row.price.base, row.price.kind === 'percent' ? `${row.price.discount}%` : row.price.discount, row.bound.minPrice ?? '', row.bound.maxPrice ?? '', row.bound.minPct ?? '', row.bound.maxPct ?? '', row.price.final, row.sellable])]);
    }
  });
}
