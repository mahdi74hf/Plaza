import { catalog, fa, toman } from './catalog.js';

const KEY = 'plaza-supply-flow-v1';

const suppliers = ['پارس موبایل', 'دیجی‌تامین', 'برفاب تجارت'];

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

const saved = load();

const ui = {
  tab: 'request',
  role: 'seller',
  notice: '',
  requests: saved.requests || [],
  receipts: saved.receipts || [],
  prices: saved.prices || {},
  seq: saved.seq || 100,
  form: blankForm(),
  priceEdit: '',
};

function blankForm() {
  return {
    supplier: suppliers[0],
    settle: iso(addDays(new Date(), 14)),
    delivery: iso(addDays(new Date(), 1)),
    pickup: false,
    official: false,
    vat: 10,
    sku: '',
    qty: '2',
    buy: '',
    lines: [],
  };
}

function persist() {
  localStorage.setItem(KEY, JSON.stringify({
    requests: ui.requests,
    receipts: ui.receipts,
    prices: ui.prices,
    seq: ui.seq,
  }));
}

function iso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

function skus() {
  return catalog.products
    .filter((item) => item.status === 'published')
    .flatMap((item) => (item.skus || []).map((sku) => ({
      code: sku.code,
      product: item.title,
      productId: item.id,
      price: sku.price,
      warehouse: Number(sku.stock || 0),
      reserved: Number(sku.reserved || 0),
    })));
}

function skuByCode(code) {
  return skus().find((item) => item.code === code);
}

function priceOf(code) {
  const sku = skuByCode(code);
  const savedPrice = ui.prices[code] || {};
  const base = Number(savedPrice.base ?? sku?.price ?? 0);
  const discount = Number(savedPrice.discount ?? 0);
  const kind = savedPrice.kind || 'amount';
  const off = kind === 'percent' ? Math.round(base * discount / 100) : discount;
  return { base, discount, kind, final: Math.max(0, base - off) };
}

function inTransit(code) {
  return ui.requests
    .filter((item) => item.status === 'approved' || item.status === 'partial')
    .flatMap((item) => item.lines.filter((line) => line.sku === code).map((line) => ({
      ...line,
      requestId: item.id,
      delivery: item.delivery,
      left: line.qty - received(item.id, line.sku),
    })))
    .filter((line) => line.left > 0);
}

function received(requestId, sku) {
  return ui.receipts.filter((item) => item.requestId === requestId && item.sku === sku).reduce((sum, item) => sum + item.qty, 0);
}

function stockRow(sku) {
  const lines = inTransit(sku.code);
  const transit = lines.reduce((sum, line) => sum + line.left, 0);
  const limit = iso(addDays(new Date(), 1));
  const near = lines.filter((line) => line.delivery <= limit).reduce((sum, line) => sum + line.left, 0);
  const arrived = ui.receipts.filter((item) => item.sku === sku.code).reduce((sum, item) => sum + item.qty, 0);
  const warehouse = sku.warehouse + arrived;
  const raw = near + warehouse - sku.reserved;
  return { ...sku, transit, near, warehouse, sellable: Math.max(0, raw), short: raw < 0, price: priceOf(sku.code) };
}

function rows() {
  return skus().map(stockRow);
}

function money(value) {
  return toman(Math.round(Number(value) || 0));
}

function escape(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function download(name, rowsToSave) {
  const csv = rowsToSave.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
}

function requestTotal(form) {
  const net = form.lines.reduce((sum, line) => sum + line.qty * line.buy, 0);
  const vat = form.official ? Math.round(net * Number(form.vat || 0) / 100) : 0;
  return { net, vat, total: net + vat };
}

function header() {
  return `<div class="flow-head">
    <div><span class="eyebrow">BOUTIQUE · PRD-065 / 066 / 067</span><h1>تامین، موجودی و قیمت</h1><p>تأیید مالی، موجودی در راه می‌سازد. موجودی، عدد قابل فروش را به لیست قیمت می‌دهد.</p></div>
    <label class="srch-login">نقش <select data-flow-role><option value="seller" ${ui.role === 'seller' ? 'selected' : ''}>فروشنده بوتیک</option><option value="finance" ${ui.role === 'finance' ? 'selected' : ''}>کارشناس مالی</option></select></label>
  </div>
  <div class="prd-tabs">
    <button type="button" class="${ui.tab === 'request' ? 'active' : ''}" data-flow-tab="request">۱. درخواست تامین<small>PRD-065</small></button>
    <button type="button" class="${ui.tab === 'stock' ? 'active' : ''}" data-flow-tab="stock">۲. وضعیت موجودی<small>PRD-066</small></button>
    <button type="button" class="${ui.tab === 'price' ? 'active' : ''}" data-flow-tab="price">۳. قیمت<small>PRD-067</small></button>
  </div>
  ${ui.notice ? `<p class="srch-fix">${escape(ui.notice)}</p>` : ''}`;
}

function requestView() {
  const totals = requestTotal(ui.form);
  const skuOptions = skus().map((item) => `<option value="${item.code}" ${ui.form.sku === item.code ? 'selected' : ''}>${escape(item.product)} · ${item.code}</option>`).join('');
  return `<section class="flow-grid">
    <article class="srch-map">
      <h2>درخواست جدید</h2>
      <div class="flow-form">
        <label>تامین‌کننده<select data-flow-field="supplier">${suppliers.map((item) => `<option ${ui.form.supplier === item ? 'selected' : ''}>${item}</option>`).join('')}</select></label>
        <label>تاریخ تسویه<input type="date" data-flow-field="settle" value="${ui.form.settle}" /></label>
        <label>تاریخ تحویل<input type="date" data-flow-field="delivery" value="${ui.form.delivery}" /></label>
        <label>نوع تحویل<select data-flow-field="pickup"><option value="0" ${ui.form.pickup ? '' : 'selected'}>ارسال توسط تامین‌کننده</option><option value="1" ${ui.form.pickup ? 'selected' : ''}>جمع‌آوری توسط لجستیک</option></select></label>
        <label class="srch-login"><input type="checkbox" data-flow-official ${ui.form.official ? 'checked' : ''} /> خرید رسمی</label>
        ${ui.form.official ? `<label>ارزش افزوده ٪<input data-flow-field="vat" value="${ui.form.vat}" /></label>` : ''}
      </div>
      <div class="flow-form">
        <label>کالا<select data-flow-field="sku"><option value="">انتخاب SKU</option>${skuOptions}</select></label>
        <label>تعداد<input data-flow-field="qty" value="${escape(ui.form.qty)}" /></label>
        <label>قیمت خرید<input data-flow-field="buy" value="${escape(ui.form.buy)}" placeholder="بدون ارزش افزوده" /></label>
        <button type="button" class="primary" data-flow-add>افزودن ردیف</button>
      </div>
      ${ui.form.lines.map((line, index) => `<p>${escape(skuByCode(line.sku)?.product || line.sku)} · ${fa(line.qty)} × ${money(line.buy)} <button type="button" data-flow-line-del="${index}">حذف</button></p>`).join('') || '<p>هنوز ردیفی نیست.</p>'}
      <p>خالص ${money(totals.net)}${ui.form.official ? ` · ارزش افزوده ${money(totals.vat)}` : ''} · کل ${money(totals.total)}</p>
      <div class="flow-actions"><button type="button" data-flow-save="draft">پیش‌نویس</button><button type="button" class="primary" data-flow-save="pending">ارسال برای مالی</button></div>
    </article>
    <article class="srch-map">
      <div class="srch-top"><h2>درخواست‌ها</h2><button type="button" data-flow-export="requests">خروجی اکسل</button></div>
      ${ui.requests.map(requestCard).join('') || '<p>درخواستی ثبت نشده.</p>'}
    </article>
  </section>`;
}

function requestCard(item) {
  const labels = { draft: 'پیش‌نویس', pending: 'منتظر تأیید مالی', approved: 'تأییدشده', rejected: 'ردشده' };
  const canFinance = ui.role === 'finance' && item.status === 'pending';
  return `<div class="flow-card"><b>${item.id}</b> ${escape(item.supplier)} <em>${labels[item.status]}</em><p>${faDate(item.delivery)} · ${money(item.total)} · ${fa(item.lines.length)} ردیف</p>${canFinance ? `<div class="flow-actions"><button type="button" class="primary" data-flow-approve="${item.id}">تأیید و ساخت موجودی در راه</button><button type="button" data-flow-reject="${item.id}">رد</button></div>` : ''}</div>`;
}

function stockView() {
  return `<section class="srch-map">
    <div class="srch-top"><div><h2>وضعیت موجودی</h2><p>قابل فروش = در راهِ تا فردا + موجودی انبار − رزرو. این عدد در تب قیمت قفل است.</p></div><button type="button" data-flow-export="stock">خروجی اکسل</button></div>
    <div class="flow-table">${rows().map((row) => `<article>
      <b>${escape(row.product)}</b><small>${row.code}</small>
      <strong class="${row.short ? '' : 'ok'}">قابل فروش ${fa(row.sellable)}</strong>
      <p>در راه ${fa(row.transit)} · تا فردا ${fa(row.near)} · انبار ${fa(row.warehouse)} · رزرو ${fa(row.reserved)}</p>
      <p>آخرین قیمت خرید ${row.transit || receivedOf(row.code) ? money(lastBuy(row.code)) : '—'}</p>
      ${row.transit ? `<button type="button" data-flow-receive="${row.code}">ورود یک عدد به انبار</button>` : ''}
    </article>`).join('')}</div>
  </section>`;
}

function receivedOf(code) {
  return ui.receipts.some((item) => item.sku === code);
}

function lastBuy(code) {
  const approved = ui.requests.filter((item) => item.status === 'approved' || item.status === 'partial');
  const line = approved.flatMap((item) => item.lines).reverse().find((item) => item.sku === code);
  return line?.buy || 0;
}

function priceView() {
  return `<section class="srch-map">
    <div class="srch-top"><div><h2>لیست قیمت</h2><p>قیمت را تکی یا با اکسل عوض کن. موجودی از وضعیت موجودی می‌آید و اینجا عوض نمی‌شود.</p></div><div class="flow-actions"><button type="button" data-flow-export="prices">خروجی اکسل</button><button type="button" data-flow-template>دانلود قالب قیمت</button><label class="flow-upload">آپلود اکسل<input type="file" data-flow-upload accept=".csv,text/csv" /></label></div></div>
    <div class="flow-table">${rows().map(priceCard).join('')}</div>
  </section>`;
}

function priceCard(row) {
  const editing = ui.priceEdit === row.code;
  if (!editing) {
    return `<article><b>${escape(row.product)}</b><small>${row.code}</small><strong>${money(row.price.final)}</strong><p>پایه ${money(row.price.base)} · تخفیف ${row.price.kind === 'percent' ? `${fa(row.price.discount)}٪` : money(row.price.discount)}</p><p>قابل فروش ${fa(row.sellable)} · انبار ${fa(row.warehouse)}</p><button type="button" data-flow-price="${row.code}">ویرایش تکی</button></article>`;
  }
  const price = row.price;
  return `<article class="is-edit"><b>${escape(row.product)}</b>
    <label>قیمت پایه<input data-flow-base value="${price.base}" /></label>
    <label>تخفیف<input data-flow-off value="${price.discount}" /></label>
    <label>نوع<select data-flow-kind><option value="amount" ${price.kind === 'amount' ? 'selected' : ''}>مبلغ</option><option value="percent" ${price.kind === 'percent' ? 'selected' : ''}>درصد</option></select></label>
    <p>قابل فروش ${fa(row.sellable)} · فقط‌خواندنی</p>
    <div class="flow-actions"><button type="button" class="primary" data-flow-price-save="${row.code}">ذخیره</button><button type="button" data-flow-price-cancel>انصراف</button></div>
  </article>`;
}

export function supplyContent() {
  return `<div class="srch flow-shell">${header()}${ui.tab === 'stock' ? stockView() : ui.tab === 'price' ? priceView() : requestView()}</div>`;
}

function saveRequest(status) {
  if (!ui.form.lines.length) {
    ui.notice = 'حداقل یک ردیف کالا لازم است.';
    return;
  }
  const totals = requestTotal(ui.form);
  ui.seq += 1;
  ui.requests.unshift({
    id: `SUP-${ui.seq}`,
    supplier: ui.form.supplier,
    settle: ui.form.settle,
    delivery: ui.form.delivery,
    pickup: ui.form.pickup,
    official: ui.form.official,
    vat: Number(ui.form.vat || 0),
    lines: ui.form.lines.map((line) => ({ ...line })),
    total: totals.total,
    status,
  });
  ui.form = blankForm();
  ui.notice = status === 'pending' ? 'برای مالی ارسال شد. نقش را روی کارشناس مالی بگذار و تأیید کن تا موجودی در راه ساخته شود.' : 'پیش‌نویس ذخیره شد.';
  persist();
}

function applyPrice(code, base, discount, kind) {
  const baseNum = Number(base);
  const offNum = Number(discount);
  if (!Number.isFinite(baseNum) || baseNum <= 0) return 'قیمت پایه باید بزرگ‌تر از صفر باشد.';
  if (!Number.isFinite(offNum) || offNum < 0) return 'تخفیف نامعتبر است.';
  if (kind === 'percent' && offNum > 100) return 'درصد تخفیف بیشتر از ۱۰۰ است.';
  if (kind === 'amount' && offNum >= baseNum) return 'تخفیف از قیمت پایه بیشتر است.';
  ui.prices[code] = { base: baseNum, discount: offNum, kind };
  return '';
}

export function bindSupply(render) {
  const paint = () => { persist(); render(); };
  document.querySelectorAll('[data-flow-tab]').forEach((button) => button.addEventListener('click', () => { ui.tab = button.dataset.flowTab; ui.notice = ''; render(); }));
  document.querySelector('[data-flow-role]')?.addEventListener('change', (event) => { ui.role = event.target.value; render(); });
  document.querySelectorAll('[data-flow-field]').forEach((field) => field.addEventListener('change', () => {
    const key = field.dataset.flowField;
    ui.form[key] = key === 'pickup' ? field.value === '1' : field.value;
  }));
  document.querySelector('[data-flow-official]')?.addEventListener('change', (event) => { ui.form.official = event.target.checked; render(); });
  document.querySelector('[data-flow-add]')?.addEventListener('click', () => {
    const sku = document.querySelector('[data-flow-field="sku"]')?.value;
    const qty = Number(document.querySelector('[data-flow-field="qty"]')?.value);
    const buy = Number(document.querySelector('[data-flow-field="buy"]')?.value);
    ui.form.sku = sku;
    ui.form.qty = String(document.querySelector('[data-flow-field="qty"]')?.value || '');
    ui.form.buy = String(document.querySelector('[data-flow-field="buy"]')?.value || '');
    if (!sku || !Number.isInteger(qty) || qty < 1 || !Number.isFinite(buy) || buy <= 0) {
      ui.notice = 'SKU، تعداد صحیح و قیمت خرید لازم است.';
      render();
      return;
    }
    if (ui.form.lines.some((line) => line.sku === sku)) {
      ui.notice = 'این SKU یک بار در درخواست می‌آید.';
      render();
      return;
    }
    ui.form.lines.push({ sku, qty, buy });
    ui.notice = '';
    render();
  });
  document.querySelectorAll('[data-flow-line-del]').forEach((button) => button.addEventListener('click', () => { ui.form.lines.splice(Number(button.dataset.flowLineDel), 1); render(); }));
  document.querySelectorAll('[data-flow-save]').forEach((button) => button.addEventListener('click', () => { saveRequest(button.dataset.flowSave); paint(); }));
  document.querySelectorAll('[data-flow-approve]').forEach((button) => button.addEventListener('click', () => {
    const request = ui.requests.find((item) => item.id === button.dataset.flowApprove);
    if (request) request.status = 'approved';
    ui.tab = 'stock';
    ui.notice = `${request?.id} تأیید شد. موجودی در راه در وضعیت موجودی دیده می‌شود و اگر تحویل تا فردا باشد در قابل فروش می‌آید.`;
    paint();
  }));
  document.querySelectorAll('[data-flow-reject]').forEach((button) => button.addEventListener('click', () => {
    const request = ui.requests.find((item) => item.id === button.dataset.flowReject);
    if (request) request.status = 'rejected';
    ui.notice = 'درخواست رد شد و موجودی در راه نساخت.';
    paint();
  }));
  document.querySelectorAll('[data-flow-receive]').forEach((button) => button.addEventListener('click', () => {
    const line = inTransit(button.dataset.flowReceive)[0];
    if (!line) return;
    ui.receipts.push({ requestId: line.requestId, sku: line.sku, qty: 1 });
    ui.notice = 'یک عدد از در راه به موجودی انبار رفت. قابل فروش در همین صفحه و در تب قیمت به‌روز شد.';
    paint();
  }));
  document.querySelectorAll('[data-flow-price]').forEach((button) => button.addEventListener('click', () => { ui.priceEdit = button.dataset.flowPrice; render(); }));
  document.querySelector('[data-flow-price-cancel]')?.addEventListener('click', () => { ui.priceEdit = ''; render(); });
  document.querySelector('[data-flow-price-save]')?.addEventListener('click', (event) => {
    const code = event.target.dataset.flowPriceSave;
    const error = applyPrice(code, document.querySelector('[data-flow-base]')?.value, document.querySelector('[data-flow-off]')?.value, document.querySelector('[data-flow-kind]')?.value);
    ui.notice = error || 'قیمت تکی ذخیره شد. موجودی تغییری نکرد.';
    if (!error) ui.priceEdit = '';
    paint();
  });
  document.querySelectorAll('[data-flow-export]').forEach((button) => button.addEventListener('click', () => {
    if (button.dataset.flowExport === 'requests') {
      download('supply-requests.csv', [['شماره', 'تامین‌کننده', 'تحویل', 'مبلغ', 'وضعیت'], ...ui.requests.map((item) => [item.id, item.supplier, item.delivery, item.total, item.status])]);
    } else if (button.dataset.flowExport === 'stock') {
      download('stock-status.csv', [['SKU', 'کالا', 'قابل فروش', 'در راه', 'انبار', 'رزرو'], ...rows().map((row) => [row.code, row.product, row.sellable, row.transit, row.warehouse, row.reserved])]);
    } else {
      download('price-list.csv', [['SKU', 'کالا', 'قیمت نهایی', 'قابل فروش', 'انبار'], ...rows().map((row) => [row.code, row.product, row.price.final, row.sellable, row.warehouse])]);
    }
  }));
  document.querySelector('[data-flow-template]')?.addEventListener('click', () => {
    download('price-template.csv', [['SKU', 'قیمت پایه جدید', 'تخفیف جدید', 'نوع تخفیف'], ...rows().map((row) => [row.code, row.price.base, row.price.discount, row.price.kind])]);
  });
  document.querySelector('[data-flow-upload]')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).slice(1).filter(Boolean);
    const errors = [];
    let applied = 0;
    lines.forEach((line) => {
      const [code, base, discount, kind] = line.split(',').map((cell) => cell.replaceAll('"', '').trim());
      if (!skuByCode(code)) { errors.push(code || 'بدون کد'); return; }
      const error = applyPrice(code, base, discount, kind === 'percent' ? 'percent' : 'amount');
      if (error) errors.push(`${code}: ${error}`);
      else applied += 1;
    });
    ui.notice = errors.length ? `${fa(applied)} ردیف اعمال شد. خطا: ${errors.slice(0, 3).join(' | ')}` : `${fa(applied)} قیمت از اکسل اعمال شد. موجودی دست نخورد.`;
    paint();
  });
}
