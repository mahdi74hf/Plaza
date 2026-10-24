import { catalog } from './catalog.js';
import { pathLabel } from './tree.js';

const STORAGE_KEY = 'plaza-inventory-v1';

const state = load();

function load() {
  const blank = { rows: {}, blocked: {}, reserveMinutes: 60, log: [], result: [], notice: '', editing: '', leafId: '', percent: '5' };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...blank, ...JSON.parse(raw) } : blank;
  } catch {
    return blank;
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    rows: state.rows,
    blocked: state.blocked,
    reserveMinutes: state.reserveMinutes,
    log: state.log,
    result: state.result,
  }));
}

function escape(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function money(value) {
  return `${new Intl.NumberFormat('fa-IR').format(Math.round(Number(value) || 0))} تومان`;
}

function skuRows() {
  return catalog.products.flatMap((product) => (product.skus || []).map((item) => ({ product, item, record: recordOf(item) })));
}

function recordOf(item) {
  const saved = state.rows[item.code];
  if (saved) return saved;
  const compare = Number(item.compareAt) || 0;
  const price = Number(item.price) || 0;
  const hasDiscount = compare > price && price > 0;
  return {
    price: hasDiscount ? compare : price,
    discountType: hasDiscount ? 'amount' : 'none',
    discountValue: hasDiscount ? compare - price : 0,
    statistical: '',
    nonStatistical: item.stock ?? 0,
  };
}

function qty(value) {
  if (value === '' || value === null || value === undefined) return 0;
  return Math.max(0, Number(value) || 0);
}

function totalOf(record) {
  return qty(record.statistical) + qty(record.nonStatistical);
}

function salePrice(record) {
  const base = Number(record.price) || 0;
  if (record.discountType === 'percent') return Math.max(0, base - (base * Number(record.discountValue || 0)) / 100);
  if (record.discountType === 'amount') return Math.max(0, base - Number(record.discountValue || 0));
  return base;
}

function availability(product, record) {
  if (state.blocked[product.leafId]) return 'ناموجود';
  if (!(Number(record.price) > 0)) return 'ناموجود';
  return totalOf(record) > 0 ? 'موجود' : 'ناموجود';
}

function logChange(summary, detail) {
  state.log.unshift({ at: new Date().toISOString(), summary, detail });
  state.log = state.log.slice(0, 40);
}

function leaves() {
  const ids = [...new Set(skuRows().map(({ product }) => product.leafId))];
  return ids.map((id) => ({ id, label: pathLabel(id) || id }));
}

export function inventoryView() {
  const rows = skuRows();
  const unavailable = rows.filter(({ product, record }) => availability(product, record) === 'ناموجود').length;
  const editing = rows.find(({ item }) => item.code === state.editing);
  return `<section class="crawler-shell inv-shell">
    <div class="stats">
      <div><span>SKU</span><b>${rows.length}</b></div>
      <div><span>ناموجود</span><b>${unavailable}</b></div>
      <div><span>LeafCat ناموجودشده</span><b>${Object.values(state.blocked).filter(Boolean).length}</b></div>
      <div><span>مهلت رزرو</span><b>${state.reserveMinutes} دقیقه</b></div>
    </div>
    <div class="demo-callout">
      <div><b>موجودی آماری و غیرآماری</b><p>آماری تعداد فروشی است که هنوز به یک واحد مشخص در قفسه انبار وصل نیست. غیرآماری موجودی فیزیکی انبار است. خالی برابر صفر است. اگر مجموع صفر باشد کالا ناموجود است و اگر یکی از دو فیلد عدد داشته باشد همان در مجموع می‌آید.</p></div>
    </div>
    ${state.notice ? `<div class="validation-box">${escape(state.notice)}</div>` : ''}
    ${leafTools()}
    ${editing ? editCard(editing) : ''}
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>SKU</th><th>محصول</th><th>LeafCat</th><th>قیمت فروش</th><th>آماری</th><th>غیرآماری</th><th>مجموع</th><th>وضعیت</th><th></th></tr></thead>
      <tbody>${rows.map(({ product, item, record }) => `<tr>
        <td dir="ltr">${escape(item.code)}</td>
        <td>${escape(product.title)}<br><small>${escape(Object.values(item.combo || {}).join(' / '))}</small></td>
        <td>${escape(pathLabel(product.leafId) || product.leafId)}</td>
        <td>${money(salePrice(record))}</td>
        <td>${record.statistical === '' ? 'خالی' : record.statistical}</td>
        <td>${record.nonStatistical === '' ? 'خالی' : record.nonStatistical}</td>
        <td>${totalOf(record)}</td>
        <td><span class="type-pill">${availability(product, record)}</span></td>
        <td><button type="button" class="action-button" data-action="inv-edit" data-sku="${escape(item.code)}">ویرایش</button></td>
      </tr>`).join('')}</tbody>
    </table></div>
    ${excelPanel()}
    ${historyPanel()}
  </section>`;
}

function leafTools() {
  const options = leaves().map((leaf) => `<option value="${leaf.id}" ${state.leafId === leaf.id ? 'selected' : ''}>${escape(leaf.label)}</option>`).join('');
  const blocked = state.leafId && state.blocked[state.leafId];
  return `<section class="card inv-tools">
    <div class="inv-grid">
      <label class="field"><span>LeafCat</span><select data-inv-field="leafId">${options}</select></label>
      <label class="field"><span>درصد قیمت</span><input type="text" data-inv-field="percent" value="${escape(state.percent)}"/></label>
      <label class="field"><span>مهلت رزرو</span><input type="text" data-inv-field="reserveMinutes" value="${escape(state.reserveMinutes)}"/><small>دقیقه، پیش‌فرض ۶۰</small></label>
    </div>
    <div class="inv-actions">
      <button type="button" class="primary" data-action="inv-percent">اعمال درصد</button>
      <button type="button" class="secondary" data-action="inv-block">${blocked ? 'برداشتن ناموجودی LeafCat' : 'ناموجود کردن LeafCat'}</button>
      <button type="button" class="secondary" data-action="inv-download">دانلود اکسل</button>
    </div>
  </section>`;
}

function editCard({ product, item, record }) {
  return `<section class="card">
    <header><div><span class="type-pill">${escape(item.code)}</span><h2>${escape(product.title)}</h2><p>${escape(pathLabel(product.leafId) || '')}</p></div></header>
    <div class="inv-grid">
      <label class="field"><span>قیمت پایه</span><input type="text" data-inv-edit="price" value="${escape(record.price)}"/></label>
      <label class="field"><span>نوع تخفیف</span><select data-inv-edit="discountType">
        <option value="none" ${record.discountType === 'none' ? 'selected' : ''}>بدون تخفیف</option>
        <option value="percent" ${record.discountType === 'percent' ? 'selected' : ''}>درصد</option>
        <option value="amount" ${record.discountType === 'amount' ? 'selected' : ''}>مبلغ</option>
      </select></label>
      <label class="field"><span>مقدار تخفیف</span><input type="text" data-inv-edit="discountValue" value="${escape(record.discountValue)}"/></label>
      <label class="field"><span>قیمت فروش</span><output>${money(salePrice(record))}</output></label>
      <label class="field"><span>موجودی آماری</span><input type="text" data-inv-edit="statistical" value="${escape(record.statistical)}" placeholder="خالی یا صفر"/></label>
      <label class="field"><span>موجودی غیرآماری</span><input type="text" data-inv-edit="nonStatistical" value="${escape(record.nonStatistical)}" placeholder="خالی یا صفر"/></label>
      <label class="field"><span>مجموع</span><output>${totalOf(record)}</output></label>
      <label class="field"><span>وضعیت</span><output>${availability(product, record)}</output></label>
    </div>
    <div class="inv-actions"><button type="button" class="primary" data-action="inv-save" data-sku="${escape(item.code)}">ذخیره SKU</button></div>
  </section>`;
}

function excelPanel() {
  const result = state.result || [];
  return `<section class="card">
    <header><div><h2>آپلود اکسل</h2><p>ستون‌ها: sku، price، discountType، discountValue، statistical، nonStatistical</p></div></header>
    <label class="field"><span>فایل CSV</span><input type="file" accept=".csv,text/csv" data-inv-file="1"/></label>
    ${result.length ? `<div class="detail-actions"><button type="button" class="secondary" data-action="inv-result">دانلود نتیجه</button></div>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>SKU</th><th>نتیجه</th><th>دلیل</th></tr></thead><tbody>
      ${result.map((row) => `<tr><td dir="ltr">${escape(row.sku)}</td><td>${row.ok ? 'اعمال‌شده' : 'اعمال‌نشده'}</td><td>${escape(row.reason)}</td></tr>`).join('')}
      </tbody></table></div>` : ''}
  </section>`;
}

function historyPanel() {
  return `<section class="card">
    <header><div><h2>تاریخچه بوتیک</h2><p>همین رخدادها در پروتوتایپ نقش لاگ بک‌اند را هم نشان می‌دهند.</p></div></header>
    ${state.log.length ? `<ul class="inv-log">${state.log.map((entry) => `<li><b>${escape(entry.summary)}</b><small>${escape(new Date(entry.at).toLocaleString('fa-IR'))}</small><p>${escape(entry.detail)}</p></li>`).join('')}</ul>` : '<p>هنوز تغییری ثبت نشده است.</p>'}
  </section>`;
}

function saveEdit(code) {
  const found = skuRows().find(({ item }) => item.code === code);
  if (!found) return;
  const read = (name) => document.querySelector(`[data-inv-edit="${name}"]`)?.value ?? '';
  const next = {
    price: Number(read('price')) || 0,
    discountType: read('discountType') || 'none',
    discountValue: Number(read('discountValue')) || 0,
    statistical: read('statistical').trim(),
    nonStatistical: read('nonStatistical').trim(),
  };
  if (next.price < 0 || next.discountValue < 0 || qty(next.statistical) < 0 || qty(next.nonStatistical) < 0) {
    state.notice = 'عدد منفی پذیرفته نمی‌شود.';
    return;
  }
  if (salePrice(next) < 0 || (next.discountType === 'percent' && next.discountValue > 100)) {
    state.notice = 'تخفیف از قیمت پایه بیشتر است.';
    return;
  }
  state.rows[code] = next;
  logChange('ویرایش تکی', `${code} · قیمت فروش ${money(salePrice(next))} · مجموع ${totalOf(next)}`);
  state.notice = `${code} ذخیره شد. وضعیت: ${availability(found.product, next)}`;
  persist();
}

function applyPercent() {
  const leafId = state.leafId || leaves()[0]?.id;
  const percent = Number(state.percent);
  if (!leafId || Number.isNaN(percent)) {
    state.notice = 'LeafCat و درصد را مشخص کن.';
    return;
  }
  const targets = skuRows().filter(({ product }) => product.leafId === leafId);
  targets.forEach(({ item }) => {
    const current = { ...recordOf(item) };
    current.price = Math.max(0, Math.round(Number(current.price) * (1 + percent / 100)));
    state.rows[item.code] = current;
  });
  logChange('تغییر درصدی LeafCat', `${pathLabel(leafId)} · ${percent}٪ · ${targets.length} SKU`);
  state.notice = `قیمت پایه ${targets.length} SKU در «${pathLabel(leafId)}» ${percent} درصد تغییر کرد.`;
  persist();
}

function toggleLeaf() {
  const leafId = state.leafId || leaves()[0]?.id;
  if (!leafId) return;
  state.blocked[leafId] = !state.blocked[leafId];
  const on = state.blocked[leafId];
  logChange(on ? 'ناموجود کردن LeafCat' : 'برگشت موجودی LeafCat', pathLabel(leafId) || leafId);
  state.notice = on ? `«${pathLabel(leafId)}» ناموجود شد. اعداد موجودی پاک نشدند.` : `ناموجودی «${pathLabel(leafId)}» برداشته شد.`;
  persist();
}

function csvOf(lines) {
  return `\uFEFF${lines.map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')}`;
}

function download(name, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

function downloadSheet() {
  const lines = [['sku', 'product', 'leaf', 'price', 'discountType', 'discountValue', 'statistical', 'nonStatistical']];
  skuRows().forEach(({ product, item, record }) => lines.push([
    item.code, product.title, product.leafId, record.price, record.discountType, record.discountValue, record.statistical, record.nonStatistical,
  ]));
  download('plaza-price-inventory.csv', csvOf(lines));
}

function downloadResult() {
  const lines = [['sku', 'result', 'reason'], ...state.result.map((row) => [row.sku, row.ok ? 'applied' : 'rejected', row.reason])];
  download('plaza-price-inventory-result.csv', csvOf(lines));
}

function upload(file, rerender) {
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || '').replace(/^\uFEFF/, '');
    const table = text.split(/\r?\n/).filter((line) => line.trim()).map((line) => {
      const cells = [];
      let current = '';
      let quoted = false;
      for (const char of line) {
        if (char === '"') { quoted = !quoted; continue; }
        if (char === ',' && !quoted) { cells.push(current); current = ''; continue; }
        current += char;
      }
      cells.push(current);
      return cells;
    });
    const records = table.slice(1);
    const known = new Map(skuRows().map(({ item }) => [item.code, item]));
    state.result = records.map((cells) => {
      const [sku, , , price, discountType, discountValue, statistical, nonStatistical] = cells;
      if (!known.has(sku)) return { sku, ok: false, reason: 'SKU پیدا نشد' };
      const next = {
        price: Number(price),
        discountType: ['none', 'percent', 'amount'].includes(discountType) ? discountType : 'none',
        discountValue: Number(discountValue) || 0,
        statistical: statistical ?? '',
        nonStatistical: nonStatistical ?? '',
      };
      if (Number.isNaN(next.price) || next.price < 0 || next.discountValue < 0) return { sku, ok: false, reason: 'عدد نامعتبر' };
      if (salePrice(next) < 0) return { sku, ok: false, reason: 'تخفیف بیشتر از قیمت' };
      state.rows[sku] = next;
      return { sku, ok: true, reason: '' };
    });
    const applied = state.result.filter((row) => row.ok).length;
    logChange('آپلود اکسل', `${file.name} · اعمال‌شده ${applied} · ردشده ${state.result.length - applied}`);
    state.notice = `آپلود تمام شد. ${applied} ردیف اعمال شد.`;
    persist();
    rerender();
  };
  reader.readAsText(file);
}

export function handleInventoryClick(action, host, rerender) {
  if (!action?.startsWith('inv-')) return false;
  if (action === 'inv-edit') state.editing = host.dataset.sku;
  if (action === 'inv-save') saveEdit(host.dataset.sku);
  if (action === 'inv-percent') applyPercent();
  if (action === 'inv-block') toggleLeaf();
  if (action === 'inv-download') downloadSheet();
  if (action === 'inv-result') downloadResult();
  if (action !== 'inv-download' && action !== 'inv-result') rerender();
  return true;
}

export function handleInventoryChange(target, rerender) {
  if (target.dataset.invFile) {
    const file = target.files?.[0];
    if (file) upload(file, rerender);
    return true;
  }
  if (!target.dataset.invField) return false;
  state[target.dataset.invField] = target.dataset.invField === 'reserveMinutes' ? Math.max(1, Number(target.value) || 60) : target.value;
  if (target.dataset.invField === 'reserveMinutes') {
    logChange('تنظیم مهلت رزرو', `${state.reserveMinutes} دقیقه`);
    persist();
    rerender();
  }
  return true;
}
