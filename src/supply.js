import { catalog, fa, toman } from './catalog.js';
import { pathLabel } from './tree.js';

const KEY = 'plaza-supply-flow-v1';
const SELLER = 'سارا محمدی';
const suppliers = ['پارس موبایل', 'دیجی‌تامین', 'برفاب تجارت'];

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
const saved = load();
const ui = {
  area: 'stock',
  notice: '',
  query: '',
  category: '',
  picked: '',
  requests: saved.requests || [],
  receipts: saved.receipts || [],
  prices: saved.prices || {},
  seq: saved.seq || 100,
  form: blank(),
};

function blank() {
  return { supplier: suppliers[0], settle: iso(addDays(new Date(), 14)), delivery: iso(addDays(new Date(), 1)), official: false, vat: '10', qty: '1', buy: '', lines: [] };
}
function persist() {
  localStorage.setItem(KEY, JSON.stringify({ requests: ui.requests, receipts: ui.receipts, prices: ui.prices, seq: ui.seq }));
}
function iso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
function faDate(value) {
  if (!value) return '—';
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fa-IR');
}
function escape(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}
function money(value) {
  return toman(Math.round(Number(value) || 0));
}

function skus() {
  return catalog.products.filter((item) => item.status === 'published').flatMap((item) => (item.skus || []).map((sku) => ({
    code: sku.code,
    product: item.title,
    category: pathLabel(item.leafId) || item.leafId,
    price: sku.price,
    warehouse: Number(sku.stock || 0),
    reserved: Number(sku.reserved || 0),
  })));
}
function skuByCode(code) { return skus().find((item) => item.code === code); }
function categories() { return [...new Set(skus().map((item) => item.category))]; }

function priceOf(code) {
  const sku = skuByCode(code);
  const savedPrice = ui.prices[code] || {};
  const base = Number(savedPrice.base ?? sku?.price ?? 0);
  const discount = Number(savedPrice.discount ?? 0);
  const kind = savedPrice.kind || 'amount';
  const off = kind === 'percent' ? Math.round(base * discount / 100) : discount;
  return { base, discount, kind, final: Math.max(0, base - off) };
}
function received(requestId, sku) {
  return ui.receipts.filter((item) => item.requestId === requestId && item.sku === sku).reduce((sum, item) => sum + item.qty, 0);
}
function inTransit(code) {
  return ui.requests.filter((item) => item.status === 'approved').flatMap((item) => item.lines.filter((line) => line.sku === code).map((line) => ({
    ...line, delivery: item.delivery, left: line.qty - received(item.id, line.sku), requestId: item.id,
  }))).filter((line) => line.left > 0);
}
function stockRow(sku) {
  const lines = inTransit(sku.code);
  const transit = lines.reduce((sum, line) => sum + line.left, 0);
  const limit = iso(addDays(new Date(), 1));
  const near = lines.filter((line) => line.delivery <= limit).reduce((sum, line) => sum + line.left, 0);
  const arrived = ui.receipts.filter((item) => item.sku === sku.code).reduce((sum, item) => sum + item.qty, 0);
  const warehouse = sku.warehouse + arrived;
  return { ...sku, transit, near, warehouse, sellable: Math.max(0, near + warehouse - sku.reserved), price: priceOf(sku.code) };
}
function rows() { return skus().map(stockRow); }
function requestTotal(form) {
  const net = form.lines.reduce((sum, line) => sum + line.qty * line.buy, 0);
  const vat = form.official ? Math.round(net * Number(form.vat || 0) / 100) : 0;
  return { net, vat, total: net + vat };
}
function statusLabel(status) {
  return { draft: 'پیش‌نویس', pending: 'ارسال‌شده', approved: 'تأیید مالی', rejected: 'ردشده', cancelled: 'لغوشده' }[status] || status;
}

function download(name, data) {
  const csv = data.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  link.download = name;
  link.click();
}

function matches(item) {
  const query = ui.query.trim();
  const text = `${item.product} ${item.code} ${item.category}`;
  return (!ui.category || item.category === ui.category) && (!query || text.includes(query));
}

function sellerPage() {
  const found = skus().filter(matches);
  const totals = requestTotal(ui.form);
  return `<div class="sheet">
    <header class="sheet-title"><span class="eyebrow">فروشنده بوتیک · ${SELLER}</span><h1>درخواست تامین</h1></header>
    ${ui.notice ? `<p class="srch-fix">${escape(ui.notice)}</p>` : ''}
    <section class="sheet-card">
      <div class="sheet-fields">
        <label>تامین‌کننده<select data-sup-field="supplier">${suppliers.map((item) => `<option ${ui.form.supplier === item ? 'selected' : ''}>${escape(item)}</option>`).join('')}</select></label>
        <label>تاریخ تسویه<input type="date" data-sup-field="settle" value="${ui.form.settle}" /></label>
        <label>تاریخ تحویل به انبار<input type="date" data-sup-field="delivery" value="${ui.form.delivery}" /></label>
        <label class="sheet-check"><input type="checkbox" data-sup-official ${ui.form.official ? 'checked' : ''} /> خرید رسمی${ui.form.official ? ` · ارزش افزوده ${escape(ui.form.vat)}٪` : ''}</label>
      </div>
      <div class="sheet-fields">
        <label>جست‌وجوی محصول<input data-sup-query value="${escape(ui.query)}" placeholder="نام کالا یا کد SKU" /></label>
        <label>دسته‌بندی<select data-sup-category><option value="">همه دسته‌ها</option>${categories().map((item) => `<option ${ui.category === item ? 'selected' : ''}>${escape(item)}</option>`).join('')}</select></label>
      </div>
      <div class="table-wrap"><table class="sheet-table">
        <thead><tr><th></th><th>کالا</th><th>دسته‌بندی</th><th>SKU</th></tr></thead>
        <tbody>${found.slice(0, 6).map((item) => `<tr><td><input type="radio" name="sku" data-sup-pick="${item.code}" ${ui.picked === item.code ? 'checked' : ''} /></td><td>${escape(item.product)}</td><td>${escape(item.category)}</td><td>${item.code}</td></tr>`).join('') || '<tr><td colspan="4">کالایی با این جست‌وجو نیست.</td></tr>'}</tbody>
      </table></div>
      <div class="sheet-fields">
        <label>تعداد<input data-sup-field="qty" value="${escape(ui.form.qty)}" /></label>
        <label>قیمت خرید واحد<input data-sup-field="buy" value="${escape(ui.form.buy)}" placeholder="بدون ارزش افزوده" /></label>
        <button type="button" class="primary" data-sup-add>افزودن به درخواست</button>
      </div>
      <div class="table-wrap"><table class="sheet-table">
        <thead><tr><th>کالا</th><th>تعداد</th><th>قیمت خرید</th><th>مبلغ</th><th></th></tr></thead>
        <tbody>${ui.form.lines.map((line, index) => `<tr><td>${escape(skuByCode(line.sku)?.product || line.sku)}</td><td>${fa(line.qty)}</td><td>${money(line.buy)}</td><td>${money(line.qty * line.buy)}</td><td><button type="button" data-sup-line="${index}">حذف</button></td></tr>`).join('') || '<tr><td colspan="5">ردیفی اضافه نشده.</td></tr>'}</tbody>
      </table></div>
      <p class="sheet-total">خالص ${money(totals.net)}${ui.form.official ? ` · ارزش افزوده ${money(totals.vat)}` : ''} · مبلغ کل ${money(totals.total)}</p>
      <div class="sheet-actions"><button type="button" data-sup-save="draft">ذخیره پیش‌نویس</button><button type="button" class="primary" data-sup-save="pending">ارسال برای مالی</button></div>
    </section>
    <section class="sheet-card">
      <h2>درخواست‌های ارسال‌شده من</h2>
      <div class="table-wrap"><table class="sheet-table">
        <thead><tr><th>شماره</th><th>تامین‌کننده</th><th>تحویل</th><th>مبلغ</th><th>وضعیت</th><th></th></tr></thead>
        <tbody>${ui.requests.map((item) => `<tr>
          <td>${item.id}</td><td>${escape(item.supplier)}</td><td>${faDate(item.delivery)}</td><td>${money(item.total)}</td><td>${statusLabel(item.status)}</td>
          <td class="sheet-actions">${item.status === 'draft' || item.status === 'pending' ? `<button type="button" data-sup-cancel="${item.id}">لغو</button>` : ''}<button type="button" data-sup-pdf="${item.id}">خروجی PDF</button></td>
        </tr>`).join('') || '<tr><td colspan="6">هنوز درخواستی نفرستاده‌ای.</td></tr>'}</tbody>
      </table></div>
    </section>
    <section class="sheet-card">
      <div class="prd-tabs">
        <button type="button" class="${ui.area === 'stock' ? 'active' : ''}" data-sup-area="stock">وضعیت موجودی<small>PRD-066</small></button>
        <button type="button" class="${ui.area === 'price' ? 'active' : ''}" data-sup-area="price">لیست قیمت<small>PRD-067</small></button>
      </div>
      ${ui.area === 'price' ? priceTable() : stockTable()}
    </section>
  </div>`;
}

function stockTable() {
  return `<div class="sheet-actions"><h2>وضعیت موجودی</h2><button type="button" data-sup-xlsx="stock">خروجی اکسل</button></div>
  <p>قابل فروش = در راهِ تا فردا + انبار − رزرو. این عدد در تب قیمت فقط خوانده می‌شود.</p>
  <div class="table-wrap"><table class="sheet-table">
    <thead><tr><th>کالا</th><th>SKU</th><th>قابل فروش</th><th>در راه</th><th>تا فردا</th><th>انبار</th><th>رزرو</th><th>آخرین قیمت خرید</th><th></th></tr></thead>
    <tbody>${rows().map((row) => `<tr>
      <td>${escape(row.product)}</td><td>${row.code}</td><td>${fa(row.sellable)}</td><td>${fa(row.transit)}</td><td>${fa(row.near)}</td><td>${fa(row.warehouse)}</td><td>${fa(row.reserved)}</td>
      <td>${lastBuy(row.code) ? money(lastBuy(row.code)) : '—'}</td>
      <td>${row.transit ? `<button type="button" data-sup-receive="${row.code}">ورود ۱ عدد</button>` : ''}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}
function lastBuy(code) {
  return [...ui.requests].filter((item) => item.status === 'approved').flatMap((item) => item.lines).reverse().find((line) => line.sku === code)?.buy || 0;
}
function priceTable() {
  return `<div class="sheet-actions"><h2>لیست قیمت</h2><button type="button" data-sup-xlsx="prices">خروجی اکسل</button><button type="button" data-sup-template>قالب اکسل</button><label class="flow-upload">آپلود اکسل<input type="file" data-sup-upload accept=".csv,text/csv" /></label></div>
  <p>تخفیف یا مبلغ است یا درصد. موجودی از تب وضعیت موجودی می‌آید.</p>
  <div class="table-wrap"><table class="sheet-table">
    <thead><tr><th>کالا</th><th>SKU</th><th>قیمت پایه</th><th>نوع تخفیف</th><th>مقدار تخفیف</th><th>قیمت نهایی</th><th>قابل فروش</th><th>انبار</th><th></th></tr></thead>
    <tbody>${rows().map((row) => `<tr>
      <td>${escape(row.product)}</td><td>${row.code}</td>
      <td><input data-price-base="${row.code}" value="${row.price.base}" /></td>
      <td><select data-price-kind="${row.code}"><option value="amount" ${row.price.kind === 'amount' ? 'selected' : ''}>مبلغی</option><option value="percent" ${row.price.kind === 'percent' ? 'selected' : ''}>درصدی</option></select></td>
      <td><input data-price-off="${row.code}" value="${row.price.discount}" /></td>
      <td>${money(row.price.final)}</td><td>${fa(row.sellable)}</td><td>${fa(row.warehouse)}</td>
      <td><button type="button" data-price-save="${row.code}">ذخیره</button></td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

export function financeContent() {
  const waiting = ui.requests.filter((item) => item.status === 'pending');
  return `<div class="sheet">
    <header class="sheet-title"><span class="eyebrow">دسترسی مالی</span><h1>صف تأیید درخواست تامین</h1><p>این صفحه از پنل فروشنده جداست. تا تأیید نشود موجودی در راه ساخته نمی‌شود.</p></header>
    ${ui.notice ? `<p class="srch-fix">${escape(ui.notice)}</p>` : ''}
    <section class="sheet-card"><div class="table-wrap"><table class="sheet-table">
      <thead><tr><th>شماره</th><th>فروشنده</th><th>تامین‌کننده</th><th>تحویل</th><th>مبلغ</th><th>ردیف‌ها</th><th></th></tr></thead>
      <tbody>${waiting.map((item) => `<tr>
        <td>${item.id}</td><td>${SELLER}</td><td>${escape(item.supplier)}</td><td>${faDate(item.delivery)}</td><td>${money(item.total)}</td>
        <td>${item.lines.map((line) => `${escape(skuByCode(line.sku)?.product || line.sku)} × ${fa(line.qty)}`).join('<br>')}</td>
        <td class="sheet-actions"><button type="button" class="primary" data-fin-approve="${item.id}">تأیید</button><button type="button" data-fin-reject="${item.id}">رد</button></td>
      </tr>`).join('') || '<tr><td colspan="7">درخواست منتظری نیست.</td></tr>'}</tbody>
    </table></div></section>
  </div>`;
}

export function supplyContent() { return sellerPage(); }

function saveRequest(status) {
  if (!ui.form.lines.length) { ui.notice = 'حداقل یک کالا به درخواست اضافه کن.'; return; }
  ui.seq += 1;
  const totals = requestTotal(ui.form);
  ui.requests.unshift({ id: `SUP-${ui.seq}`, seller: SELLER, supplier: ui.form.supplier, settle: ui.form.settle, delivery: ui.form.delivery, official: ui.form.official, vat: Number(ui.form.vat || 0), lines: ui.form.lines.map((line) => ({ ...line })), total: totals.total, status });
  ui.form = blank();
  ui.picked = '';
  ui.notice = status === 'pending' ? 'درخواست در لیست ارسال‌شده‌ها نشست. تا مالی تأیید نکند می‌توانی لغوش کنی.' : 'پیش‌نویس ذخیره شد.';
}

function applyPrice(code, base, discount, kind) {
  const baseNum = Number(base);
  const offNum = Number(discount);
  if (!Number.isFinite(baseNum) || baseNum <= 0) return 'قیمت پایه باید بزرگ‌تر از صفر باشد.';
  if (!Number.isFinite(offNum) || offNum < 0) return 'تخفیف نامعتبر است.';
  if (kind === 'percent' && offNum > 100) return 'درصد بیشتر از ۱۰۰ است.';
  if (kind !== 'percent' && offNum >= baseNum) return 'مبلغ تخفیف از قیمت پایه بیشتر است.';
  ui.prices[code] = { base: baseNum, discount: offNum, kind: kind === 'percent' ? 'percent' : 'amount' };
  return '';
}

function printRequest(item) {
  const lines = item.lines.map((line) => `<tr><td>${skuByCode(line.sku)?.product || line.sku}</td><td>${line.sku}</td><td>${line.qty}</td><td>${Math.round(line.buy).toLocaleString('fa-IR')}</td><td>${Math.round(line.qty * line.buy).toLocaleString('fa-IR')}</td></tr>`).join('');
  const popup = window.open('', '_blank', 'noopener,width=800,height=900');
  if (!popup) { ui.notice = 'پنجره خروجی باز نشد.'; return; }
  popup.document.write(`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>${item.id}</title>
    <style>body{font-family:Tahoma,sans-serif;margin:32px;color:#161616}h1,h2{text-align:center;margin:0 0 8px}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{border:1px solid #161616;padding:8px;text-align:right}p{margin:4px 0}</style></head>
    <body><h1>رایانه پایتخت ویراست</h1><h2>سند درخواست تامین</h2><p>فروشنده: ${item.seller || SELLER}</p><p>شماره: ${item.id}</p><p>تامین‌کننده: ${item.supplier}</p><p>تاریخ تحویل: ${item.delivery}</p>
    <table><thead><tr><th>کالا</th><th>SKU</th><th>تعداد</th><th>قیمت خرید</th><th>مبلغ</th></tr></thead><tbody>${lines}</tbody></table>
    <p>مبلغ کل: ${Math.round(item.total).toLocaleString('fa-IR')} تومان</p></body></html>`);
  popup.document.close();
  popup.focus();
  popup.print();
}

export function bindSupply(render) {
  const paint = () => { persist(); render(); };
  document.querySelector('[data-sup-query]')?.addEventListener('input', (event) => { ui.query = event.target.value; render(); const next = document.querySelector('[data-sup-query]'); next?.focus(); next?.setSelectionRange(next.value.length, next.value.length); });
  document.querySelector('[data-sup-category]')?.addEventListener('change', (event) => { ui.category = event.target.value; render(); });
  document.querySelectorAll('[data-sup-field]').forEach((field) => field.addEventListener('change', () => { ui.form[field.dataset.supField] = field.value; }));
  document.querySelector('[data-sup-official]')?.addEventListener('change', (event) => { ui.form.official = event.target.checked; render(); });
  document.querySelectorAll('[data-sup-pick]').forEach((field) => field.addEventListener('change', () => { ui.picked = field.dataset.supPick; }));
  document.querySelector('[data-sup-add]')?.addEventListener('click', () => {
    const qty = Number(document.querySelector('[data-sup-field="qty"]')?.value);
    const buy = Number(document.querySelector('[data-sup-field="buy"]')?.value);
    ui.form.qty = String(document.querySelector('[data-sup-field="qty"]')?.value || '');
    ui.form.buy = String(document.querySelector('[data-sup-field="buy"]')?.value || '');
    if (!ui.picked || !Number.isInteger(qty) || qty < 1 || !(buy > 0)) { ui.notice = 'کالا را از جدول انتخاب کن و تعداد و قیمت خرید را بنویس.'; render(); return; }
    if (ui.form.lines.some((line) => line.sku === ui.picked)) { ui.notice = 'این کالا یک بار در درخواست می‌آید.'; render(); return; }
    ui.form.lines.push({ sku: ui.picked, qty, buy });
    ui.notice = '';
    render();
  });
  document.querySelectorAll('[data-sup-line]').forEach((button) => button.addEventListener('click', () => { ui.form.lines.splice(Number(button.dataset.supLine), 1); render(); }));
  document.querySelectorAll('[data-sup-save]').forEach((button) => button.addEventListener('click', () => { saveRequest(button.dataset.supSave); paint(); }));
  document.querySelectorAll('[data-sup-cancel]').forEach((button) => button.addEventListener('click', () => {
    const request = ui.requests.find((item) => item.id === button.dataset.supCancel);
    if (request && (request.status === 'draft' || request.status === 'pending')) request.status = 'cancelled';
    ui.notice = 'درخواست لغو شد. بعد از تأیید مالی دیگر از اینجا لغو نمی‌شود.';
    paint();
  }));
  document.querySelectorAll('[data-sup-pdf]').forEach((button) => button.addEventListener('click', () => {
    const request = ui.requests.find((item) => item.id === button.dataset.supPdf);
    if (request) printRequest(request);
  }));
  document.querySelectorAll('[data-sup-area]').forEach((button) => button.addEventListener('click', () => { ui.area = button.dataset.supArea; render(); }));
  document.querySelectorAll('[data-sup-receive]').forEach((button) => button.addEventListener('click', () => {
    const line = inTransit(button.dataset.supReceive)[0];
    if (!line) return;
    ui.receipts.push({ requestId: line.requestId, sku: line.sku, qty: 1 });
    ui.notice = 'یک عدد از در راه به انبار منتقل شد. عدد قابل فروش در هر دو تب یکی است.';
    paint();
  }));
  document.querySelectorAll('[data-price-save]').forEach((button) => button.addEventListener('click', () => {
    const code = button.dataset.priceSave;
    const error = applyPrice(code, document.querySelector(`[data-price-base="${code}"]`)?.value, document.querySelector(`[data-price-off="${code}"]`)?.value, document.querySelector(`[data-price-kind="${code}"]`)?.value);
    ui.notice = error || 'قیمت همین ردیف ذخیره شد. موجودی عوض نشد.';
    paint();
  }));
  document.querySelector('[data-sup-xlsx="stock"]')?.addEventListener('click', () => download('stock.xlsx.csv', [['کالا', 'SKU', 'قابل فروش', 'در راه', 'انبار', 'رزرو'], ...rows().map((row) => [row.product, row.code, row.sellable, row.transit, row.warehouse, row.reserved])]));
  document.querySelector('[data-sup-xlsx="prices"]')?.addEventListener('click', () => download('prices.xlsx.csv', [['SKU', 'کالا', 'قیمت نهایی', 'قابل فروش', 'انبار'], ...rows().map((row) => [row.code, row.product, row.price.final, row.sellable, row.warehouse])]));
  document.querySelector('[data-sup-template]')?.addEventListener('click', () => download('price-template.csv', [['SKU', 'قیمت پایه جدید', 'تخفیف جدید', 'نوع تخفیف amount یا percent'], ...rows().map((row) => [row.code, row.price.base, row.price.discount, row.price.kind])]));
  document.querySelector('[data-sup-upload]')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const lines = (await file.text()).replace(/^\uFEFF/, '').split(/\r?\n/).slice(1).filter(Boolean);
    const errors = [];
    let applied = 0;
    lines.forEach((line) => {
      const [code, base, discount, kind] = line.split(',').map((cell) => cell.replaceAll('"', '').trim());
      if (!skuByCode(code)) { errors.push(code || 'بدون کد'); return; }
      const error = applyPrice(code, base, discount, kind);
      if (error) errors.push(`${code}: ${error}`); else applied += 1;
    });
    ui.notice = errors.length ? `${fa(applied)} ردیف اعمال شد. ${errors.slice(0, 2).join(' | ')}` : `${fa(applied)} قیمت از اکسل اعمال شد.`;
    paint();
  });
  document.querySelectorAll('[data-fin-approve]').forEach((button) => button.addEventListener('click', () => {
    const request = ui.requests.find((item) => item.id === button.dataset.finApprove);
    if (request?.status === 'pending') request.status = 'approved';
    ui.notice = `${request?.id || ''} تأیید شد و موجودی در راه برای فروشنده ساخته شد.`;
    paint();
  }));
  document.querySelectorAll('[data-fin-reject]').forEach((button) => button.addEventListener('click', () => {
    const request = ui.requests.find((item) => item.id === button.dataset.finReject);
    if (request?.status === 'pending') request.status = 'rejected';
    ui.notice = 'درخواست رد شد و موجودی در راه نساخت.';
    paint();
  }));
}
