import {
  CANONICAL_HOST,
  REDIRECT_CODES,
  catalog,
  fa,
  fullUrl,
  isRedirectCode,
  logChange,
  persistCatalog,
  redirectMeta,
  resolveRequest,
  upsertRedirect,
} from './catalog.js';

export const seoUi = {
  query: '',
  code: 'all',
  lookup: '/product/iphone-14',
  result: null,
  form: { source: '', destination: '', code: '301' },
  editingId: null,
  error: '',
};

export function redirectsView() {
  const rows = filteredRows();
  const needsDest = isRedirectCode(seoUi.form.code);
  return `<div class="workspace seo-shell">
    <section class="card detail-card">
      <div class="card-head"><div><h2>بررسی URL</h2><p>ببین این آدرس چه کد HTTPای می‌دهد. صفحه حذف محصول نیست.</p></div></div>
      <label class="field"><span>آدرس کامل یا مسیر</span><input id="seo-lookup" value="${escape(seoUi.lookup)}" placeholder="${escape(CANONICAL_HOST)}/p/iphone" dir="ltr" /></label>
      <div class="detail-actions spread">
        <button class="primary" data-action="seo-lookup">بررسی پاسخ</button>
        <button class="ghost" data-action="seo-lookup-sample" data-url="/product/iphone-14">نمونه ووکامرس</button>
        <button class="ghost" data-action="seo-lookup-sample" data-url="/p/nokia-3310">نمونه ۴۱۰</button>
      </div>
      ${seoUi.result ? lookupCard(seoUi.result) : '<p class="form-note">مثلاً /product/iphone-14 را بزن؛ باید ۳۰۱ به /p/iphone بدهد.</p>'}
    </section>
    <section class="card detail-card">
      <div class="card-head"><div><h2>${seoUi.editingId ? 'ویرایش ردیف' : 'ردیف جدید'}</h2><p>مبدأ می‌تواند URL ووکامرس باشد. ۴۰۴ و ۴۱۰ انتقال نیستند.</p></div></div>
      <label class="field"><span>آدرس مبدأ (Source URL)</span><input id="seo-source" value="${escape(seoUi.form.source)}" placeholder="${escape(CANONICAL_HOST)}/product/old-slug" dir="ltr" /></label>
      <label class="field"><span>نوع / کد وضعیت</span><select id="seo-code">${REDIRECT_CODES.map((item) => `<option value="${item.code}" ${seoUi.form.code === item.code ? 'selected' : ''}>${item.label}</option>`).join('')}</select></label>
      <label class="field"><span>آدرس مقصد (Destination URL)</span><input id="seo-destination" value="${escape(seoUi.form.destination)}" placeholder="${escape(CANONICAL_HOST)}/p/new-slug" dir="ltr" ${needsDest ? '' : 'disabled'} /></label>
      ${needsDest ? '<p class="form-note">۳۰۱ و ۳۰۸ دائمی، ۳۰۲ و ۳۰۷ موقت.</p>' : '<p class="form-note">۴۰۴ و ۴۱۰ کد وضعیت‌اند نه Redirect؛ مقصد ذخیره نمی‌شود.</p>'}
      <p class="form-error" id="form-error">${escape(seoUi.error)}</p>
      <div class="detail-actions spread">
        <button class="primary" data-action="seo-save-row">${seoUi.editingId ? 'ذخیره ردیف' : 'افزودن به رجیستری'}</button>
        ${seoUi.editingId ? '<button class="ghost" data-action="seo-cancel-edit">انصراف ویرایش</button>' : ''}
      </div>
    </section>
    <section class="card tree-card seo-table-card">
      <div class="card-head"><div><h2>رجیستری سراسری</h2><p>${fa(catalog.redirects.length)} ردیف · سقف تعداد در محصول نیست.</p></div></div>
      <div class="toolbar">
        <label class="field-inline"><span>جست‌وجو</span><input id="seo-filter-q" value="${escape(seoUi.query)}" placeholder="مبدأ یا مقصد" /></label>
        <label class="field-inline"><span>کد</span><select id="seo-filter-code"><option value="all">همه</option>${REDIRECT_CODES.map((item) => `<option value="${item.code}" ${seoUi.code === item.code ? 'selected' : ''}>${item.code}</option>`).join('')}</select></label>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>مبدأ</th><th>مقصد</th><th>کد</th><th></th></tr></thead>
          <tbody>${rows.map(redirectRow).join('') || '<tr><td colspan="4">ردیفی با این فیلتر نیست.</td></tr>'}</tbody>
        </table>
      </div>
    </section>
  </div>`;
}

function filteredRows() {
  const term = seoUi.query.trim().toLowerCase();
  return (catalog.redirects || []).filter((row) => {
    if (seoUi.code !== 'all' && row.code !== seoUi.code) return false;
    if (!term) return true;
    return [row.source, row.destination, row.code].join(' ').toLowerCase().includes(term);
  });
}

function redirectRow(row) {
  const meta = redirectMeta(row.code);
  return `<tr>
    <td class="url">${escape(fullUrl(row.source))}</td>
    <td class="url">${isRedirectCode(row.code) ? escape(fullUrl(row.destination)) : '—'}</td>
    <td><em class="status-code code-${row.code}">${row.code} · ${escape(meta?.label?.replace(/^\S+\s/, '') || '')}</em></td>
    <td class="row-actions"><button class="action-button" data-action="seo-edit-row" data-id="${row.id}">ویرایش</button><button class="action-button danger" data-action="seo-drop-row" data-id="${row.id}">حذف ردیف</button></td>
  </tr>`;
}

function lookupCard(result) {
  const robots = result.kind === 'product' || result.kind === 'category'
    ? `robots: ${result.index === false ? 'noindex' : 'index'}, ${result.follow === false ? 'nofollow' : 'follow'}`
    : '';
  const canonical = result.canonical ? `canonical: ${result.canonical}` : result.location ? `Location: ${result.location}` : '';
  return `<div class="lookup-card status-${result.status}">
    <div><span>پاسخ</span><b>${fa(result.status)}</b></div>
    <p>${escape(result.note || '')}</p>
    ${canonical ? `<small dir="ltr">${escape(canonical)}</small>` : ''}
    ${robots ? `<small>${escape(robots)}</small>` : ''}
  </div>`;
}

export function handleSeoClick(action, host, rerender) {
  if (action === 'seo-lookup') {
    readForm();
    seoUi.lookup = document.querySelector('#seo-lookup')?.value.trim() || seoUi.lookup;
    seoUi.result = resolveRequest(seoUi.lookup);
    rerender();
    return true;
  }
  if (action === 'seo-lookup-sample') {
    seoUi.lookup = host.dataset.url;
    seoUi.result = resolveRequest(seoUi.lookup);
    rerender();
    return true;
  }
  if (action === 'seo-save-row') {
    readForm();
    const saved = upsertRedirect({
      source: seoUi.form.source,
      destination: seoUi.form.destination,
      code: seoUi.form.code,
      exceptId: seoUi.editingId,
    });
    if (saved.error) {
      seoUi.error = saved.error;
      const node = document.querySelector('#form-error');
      if (node) node.textContent = saved.error;
      else rerender();
      return true;
    }
    logChange(`Redirect ${saved.row.code} برای ${saved.row.source}`);
    persistCatalog();
    seoUi.form = { source: '', destination: '', code: '301' };
    seoUi.editingId = null;
    seoUi.error = '';
    seoUi.toast = true;
    rerender();
    return true;
  }
  if (action === 'seo-edit-row') {
    const row = catalog.redirects.find((item) => item.id === host.dataset.id);
    if (!row) return true;
    seoUi.editingId = row.id;
    seoUi.form = { source: fullUrl(row.source), destination: row.destination ? fullUrl(row.destination) : '', code: row.code };
    seoUi.error = '';
    rerender();
    return true;
  }
  if (action === 'seo-drop-row') {
    catalog.redirects = catalog.redirects.filter((item) => item.id !== host.dataset.id);
    if (seoUi.editingId === host.dataset.id) {
      seoUi.editingId = null;
      seoUi.form = { source: '', destination: '', code: '301' };
    }
    logChange('حذف ردیف Redirect');
    persistCatalog();
    rerender();
    return true;
  }
  if (action === 'seo-cancel-edit') {
    seoUi.editingId = null;
    seoUi.form = { source: '', destination: '', code: '301' };
    seoUi.error = '';
    rerender();
    return true;
  }
  return false;
}

export function handleSeoChange(target, rerender) {
  if (target.id === 'seo-filter-code') {
    seoUi.code = target.value;
    rerender();
    return true;
  }
  if (target.id === 'seo-code') {
    seoUi.form.code = target.value;
    seoUi.form.source = document.querySelector('#seo-source')?.value || seoUi.form.source;
    seoUi.form.destination = document.querySelector('#seo-destination')?.value || seoUi.form.destination;
    rerender();
    return true;
  }
  return false;
}

export function handleSeoInput(target) {
  if (target.id === 'seo-filter-q') {
    seoUi.query = target.value;
    const tbody = document.querySelector('.seo-table-card tbody');
    if (tbody) tbody.innerHTML = filteredRows().map(redirectRow).join('') || '<tr><td colspan="4">ردیفی با این فیلتر نیست.</td></tr>';
    return true;
  }
  if (target.id === 'seo-source' || target.id === 'seo-destination' || target.id === 'seo-lookup') {
    if (target.id === 'seo-source') seoUi.form.source = target.value;
    if (target.id === 'seo-destination') seoUi.form.destination = target.value;
    if (target.id === 'seo-lookup') seoUi.lookup = target.value;
    return true;
  }
  return false;
}

export function addSlugRedirect(fromPath, toPath) {
  if (!fromPath || fromPath === toPath) return;
  const exists = catalog.redirects.some((row) => row.source === fromPath);
  if (exists) return;
  catalog.redirects.unshift({
    id: `r-slug-${Date.now().toString(36)}`,
    source: fromPath,
    destination: toPath,
    code: '301',
  });
}

export function followField(checked) {
  return `<label class="ux-switch seo-follow"><input id="seo-follow" type="checkbox" role="switch" ${checked ? 'checked' : ''}/><span>دنبال‌کردن لینک‌های صفحه توسط موتورهای جست‌وجو</span><em>${checked ? 'follow' : 'nofollow'}</em></label>`;
}

export function canonicalField(defaultUrl, current) {
  return `<label class="field"><span>آدرس کنونیکال</span><input id="seo-canonical" dir="ltr" value="${escape(current || '')}" placeholder="${escape(defaultUrl)}" /><small class="canonical-hint">پیش‌فرض: <b dir="ltr">${escape(defaultUrl)}</b> — خالی بماند تا همین مقدار استفاده شود.</small></label>`;
}

function readForm() {
  seoUi.form.source = document.querySelector('#seo-source')?.value || seoUi.form.source;
  seoUi.form.destination = document.querySelector('#seo-destination')?.value || seoUi.form.destination;
  seoUi.form.code = document.querySelector('#seo-code')?.value || seoUi.form.code;
  seoUi.lookup = document.querySelector('#seo-lookup')?.value || seoUi.lookup;
}

function escape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
