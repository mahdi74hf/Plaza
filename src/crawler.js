import { catalog, logChange, persistCatalog } from './catalog.js';

export const CRAWLER_KEY = 'plaza-crawler-jobs-v2';

export const SOURCES = [
  { id: 'digikala', label: 'دیجی‌کالا', domain: 'digikala.com' },
  { id: 'technolife', label: 'تکنولایف', domain: 'technolife.com' },
  { id: 'snapshop', label: 'اسنپ‌شاپ', domain: 'snappshop.ir' },
  { id: 'nx1', label: 'NX1.SHOP', domain: 'nx1.shop' },
];

export const SOURCE_CATEGORIES = {
  digikala: ['موبایل', 'لپ‌تاپ', 'تبلت', 'لوازم جانبی'],
  technolife: ['گوشی', 'لپ‌تاپ', 'ساعت هوشمند'],
  snapshop: ['موبایل و تبلت', 'کامپیوتر'],
  nx1: ['موبایل', 'لوازم خانگی دیجیتال'],
};

export const JOB_STATUS = {
  queued: 'در انتظار',
  scheduled: 'زمان‌بندی‌شده',
  running: 'در حال اجرا',
  completed: 'تکمیل‌شده',
  completed_errors: 'تکمیل‌شده با خطا',
  failed: 'ناموفق',
  cancelled: 'لغوشده',
};

export const WIZARD_MAX_STEP = 4;

export const ITEM_STATUS = {
  pending: 'در انتظار',
  crawling: 'استخراج',
  syncing: 'ساخت Draft',
  success: 'موفق',
  failed: 'ناموفق',
  duplicate: 'تکراری',
  cancelled: 'لغوشده',
};

function readJobs() {
  try {
    const raw = localStorage.getItem(CRAWLER_KEY);
    if (raw) return JSON.parse(raw);
    const legacy = localStorage.getItem('plaza-crawler-jobs-v1');
    if (legacy) {
      const jobs = JSON.parse(legacy);
      if (Array.isArray(jobs) && jobs.length) {
        if (!jobs.some((job) => job.status === 'scheduled')) jobs.unshift(scheduledDemoJob());
        localStorage.setItem(CRAWLER_KEY, JSON.stringify(jobs));
        return jobs;
      }
    }
    return seedJobs();
  } catch {
    return seedJobs();
  }
}

function scheduledDemoJob() {
  const start = new Date(Date.now() + 45 * 60 * 1000);
  start.setSeconds(0, 0);
  const local = new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  return buildJob({
    method: 'excel',
    source: 'digikala',
    categories: [],
    urls: [
      'https://www.digikala.com/product/dkp-demo-1/',
      'https://www.technolife.com/product/tl-demo-1/',
    ],
    creator: 'مهدی فرحزادی',
    run: false,
    startMode: 'scheduled',
    scheduledAt: local,
  });
}

function seedJobs() {
  const sample = buildJob({
    method: 'category',
    source: 'digikala',
    categories: ['موبایل'],
    urls: [
      'https://www.digikala.com/product/dkp-111/',
      'https://www.digikala.com/product/dkp-222/',
      'https://www.digikala.com/product/dkp-bad/',
    ],
    creator: 'مهدی فرحزادی',
    run: true,
  });
  sample.status = 'completed_errors';
  sample.finishedAt = sample.updatedAt;
  finalizeJob(sample);
  sample.items.forEach((item, index) => {
    if (item.status === 'success') item.title = `نمونه محصول کرال‌شده ${index + 1}`;
  });
  return [scheduledDemoJob(), sample];
}

export let crawlerState = {
  jobs: readJobs(),
  view: 'list',
  wizardStep: 1,
  draft: emptyWizard(),
  selectedJobId: null,
  listStatus: 'all',
  listSource: 'all',
  itemFilter: 'all',
  itemSource: 'all',
  detailTab: 'progress',
  selectedItems: new Set(),
};

function emptyWizard() {
  return {
    method: 'excel',
    source: 'digikala',
    categories: [],
    categoryQuery: '',
    excelPreview: null,
    excelFileName: '',
    startMode: 'now',
    scheduledAt: '',
  };
}

function defaultScheduleLocal() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function persistJobs() {
  localStorage.setItem(CRAWLER_KEY, JSON.stringify(crawlerState.jobs));
}

function id(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function detectSource(url) {
  const host = String(url).toLowerCase();
  return SOURCES.find((source) => host.includes(source.domain)) || null;
}

function detectedJobSource(urls) {
  const ids = [...new Set(urls.map((url) => detectSource(url)?.id).filter(Boolean))];
  return ids.length === 1 ? ids[0] : 'mixed';
}

function excelSourceSummary(preview) {
  const entries = Object.entries(preview?.bySource || {});
  if (!entries.length) return '—';
  if (entries.length === 1) return entries[0][0];
  return entries.map(([name, count]) => `${name} (${count})`).join(' · ');
}

export function validateUrls(lines) {
  const seen = new Set();
  const rows = [];
  let invalid = 0;
  let duplicate = 0;
  const bySource = {};
  lines.forEach((line, index) => {
    const url = line.trim();
    if (!url) {
      invalid += 1;
      rows.push({ row: index + 2, url, ok: false, reason: 'لینک خالی' });
      return;
    }
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      invalid += 1;
      rows.push({ row: index + 2, url, ok: false, reason: 'لینک نامعتبر' });
      return;
    }
    const source = detectSource(parsed.href);
    if (!source) {
      invalid += 1;
      rows.push({ row: index + 2, url, ok: false, reason: 'سورس پشتیبانی‌نشده' });
      return;
    }
    const key = parsed.href.split('?')[0];
    if (seen.has(key)) {
      duplicate += 1;
      rows.push({ row: index + 2, url, ok: false, reason: 'تکراری در فایل' });
      return;
    }
    seen.add(key);
    bySource[source.label] = (bySource[source.label] || 0) + 1;
    rows.push({ row: index + 2, url: key, ok: true, source: source.id });
  });
  const valid = rows.filter((row) => row.ok);
  return { rows, valid, invalid, duplicate, total: rows.length, bySource };
}

function buildJob({ method, source, categories, urls, creator, run, startMode = 'now', scheduledAt = '' }) {
  const jobId = id('job');
  const now = new Date().toISOString();
  const uniqueUrls = [...new Set(urls)];
  const items = uniqueUrls.map((url) => ({
    id: id('item'),
    url,
    source: detectSource(url)?.id || source || 'unknown',
    categoryOrigin: categories?.join('، ') || '',
    title: '',
    status: 'pending',
    stage: 'queue',
    errorCode: '',
    errorMessage: '',
    draftId: '',
    cmsLink: '',
    attempts: 0,
    startedAt: '',
    finishedAt: '',
  }));
  const scheduled = startMode === 'scheduled' && scheduledAt;
  const job = {
    id: jobId,
    method,
    source: method === 'category' ? source : detectedJobSource(uniqueUrls),
    categories: categories || [],
    status: scheduled ? 'scheduled' : run ? 'running' : 'queued',
    startMode: scheduled ? 'scheduled' : 'now',
    scheduledStartAt: scheduled ? new Date(scheduledAt).toISOString() : '',
    creator,
    createdAt: now,
    updatedAt: now,
    startedAt: run && !scheduled ? now : '',
    finishedAt: '',
    items,
    stats: summarize(items),
  };
  if (run && !scheduled) simulateJob(job);
  return job;
}

export function forceStartScheduledJob(job, rerender) {
  if (!job || job.status !== 'scheduled') return false;
  job.status = 'running';
  job.startedAt = new Date().toISOString();
  job.updatedAt = job.startedAt;
  simulateJob(job);
  persistJobs();
  rerender?.();
  return true;
}

export function openCrawlerDemoView(mode = 'list') {
  crawlerState.view = mode === 'wizard' ? 'wizard' : mode === 'detail' ? 'detail' : 'list';
  crawlerState.wizardStep = 1;
  if (mode === 'detail') {
    const pick =
      crawlerState.jobs.find((job) => job.status === 'completed_errors' || job.status === 'completed') ||
      crawlerState.jobs[0];
    crawlerState.selectedJobId = pick?.id || null;
    crawlerState.detailTab = 'excel';
  } else {
    crawlerState.selectedJobId = null;
    crawlerState.detailTab = 'progress';
  }
}

export function processDueScheduledJobs() {
  const now = Date.now();
  let changed = false;
  crawlerState.jobs.forEach((job) => {
    if (job.status !== 'scheduled' || !job.scheduledStartAt) return;
    if (new Date(job.scheduledStartAt).getTime() > now) return;
    job.status = 'running';
    job.startedAt = new Date().toISOString();
    job.updatedAt = job.startedAt;
    simulateJob(job);
    changed = true;
  });
  if (changed) persistJobs();
}

function summarize(items) {
  const stats = { total: items.length, pending: 0, running: 0, success: 0, failed: 0, duplicate: 0, cancelled: 0 };
  items.forEach((item) => {
    if (item.status === 'pending') stats.pending += 1;
    else if (['crawling', 'syncing'].includes(item.status)) stats.running += 1;
    else if (item.status === 'success') stats.success += 1;
    else if (item.status === 'failed') stats.failed += 1;
    else if (item.status === 'duplicate') stats.duplicate += 1;
    else if (item.status === 'cancelled') stats.cancelled += 1;
  });
  return stats;
}

function finalizeJob(job) {
  job.stats = summarize(job.items);
  job.updatedAt = new Date().toISOString();
  if (job.stats.running || job.stats.pending) job.status = 'running';
  else if (job.stats.failed && job.stats.success) job.status = 'completed_errors';
  else if (job.stats.failed && !job.stats.success) job.status = 'failed';
  else if (job.stats.cancelled && !job.stats.success) job.status = 'cancelled';
  else job.status = 'completed';
  if (!job.stats.running && !job.stats.pending) job.finishedAt = job.updatedAt;
}

function productBySourceUrl(url) {
  return catalog.products.find((item) => item.sourceUrl === url);
}

function createDraftFromCrawl(item) {
  const existing = productBySourceUrl(item.url);
  if (existing) {
    item.status = 'duplicate';
    item.stage = 'dedupe';
    item.draftId = existing.id;
    item.cmsLink = `#product/${existing.id}`;
    item.errorMessage = 'محصول متناظر از قبل وجود دارد';
    return;
  }
  const source = SOURCES.find((entry) => entry.id === item.source);
  const draftId = `crawl-${Date.now().toString(36)}`;
  const title = item.title || `محصول کرال‌شده ${source?.label || ''}`.trim();
  catalog.products.push({
    id: draftId,
    title,
    titleEn: '',
    model: '',
    description: `پیش‌نویس ساخته‌شده از کرالر PRD-066.\nمنبع: ${item.url}`,
    image: title,
    leafId: 'phone',
    brandId: null,
    status: 'draft',
    publishedAt: '',
    sales: 0,
    attributes: {},
    skus: [],
    links: [],
    sourceUrl: item.url,
    crawlSource: item.source,
    seo: { slug: draftId, title: '', description: '', index: false, redirects: [] },
  });
  logChange(`کرالر: Draft ${title}`);
  persistCatalog();
  item.status = 'success';
  item.stage = 'cms';
  item.draftId = draftId;
  item.cmsLink = `#product/${draftId}`;
}

function simulateJob(job) {
  job.items.forEach((item, index) => {
    item.startedAt = new Date().toISOString();
    item.attempts += 1;
    item.status = 'crawling';
    item.stage = 'crawl';
    const source = SOURCES.find((entry) => entry.id === item.source);
    item.title = `${source?.label || 'محصول'} نمونه ${index + 1}`;
    if (item.url.includes('bad') || item.url.includes('invalid')) {
      item.status = 'failed';
      item.stage = 'crawl';
      item.errorCode = 'PAGE_NOT_FOUND';
      item.errorMessage = 'صفحه محصول پیدا نشد';
      item.finishedAt = new Date().toISOString();
      return;
    }
    if (item.url.includes('p-102')) {
      item.status = 'failed';
      item.stage = 'parser';
      item.errorCode = 'PARSER_CHANGED';
      item.errorMessage = 'ساختار صفحه سورس تغییر کرده است';
      item.finishedAt = new Date().toISOString();
      return;
    }
    item.status = 'syncing';
    item.stage = 'cms';
    createDraftFromCrawl(item);
    item.finishedAt = new Date().toISOString();
  });
  finalizeJob(job);
}

export function selectedJob() {
  return crawlerState.jobs.find((job) => job.id === crawlerState.selectedJobId) || null;
}

export function filteredItems(job) {
  return job.items.filter((item) => {
    if (crawlerState.itemFilter !== 'all' && item.status !== crawlerState.itemFilter) return false;
    if (crawlerState.itemSource !== 'all' && item.source !== crawlerState.itemSource) return false;
    return true;
  });
}

function escape(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function fmtDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function sourceLabel(id) {
  return SOURCES.find((item) => item.id === id)?.label || id;
}

export function crawlerHeading() {
  if (crawlerState.view === 'wizard') return 'Job جدید کرال';
  if (crawlerState.view === 'detail') return 'جزئیات Job کرال';
  return 'پنل کرالر محصولات';
}

export function crawlerSubhead() {
  if (crawlerState.view === 'wizard') return 'Excel یا دسته‌بندی سورس را انتخاب کن؛ اعتبارسنجی قبل از اجرا نمایش داده می‌شود.';
  if (crawlerState.view === 'detail') return 'پیشرفت Job، وضعیت هر لینک، Draft ساخته‌شده و گزارش Excel در همین صفحه است.';
  return 'PRD-066 — دیجی‌کالا، تکنولایف، اسنپ‌شاپ و NX1.SHOP؛ فقط Draft در CMS نمونه.';
}

export function crawlerView(icon) {
  processDueScheduledJobs();
  if (crawlerState.view === 'wizard') return wizardView(icon);
  if (crawlerState.view === 'detail') return detailView(icon);
  return listView(icon);
}

export function jobReportRows(job) {
  return job.items.map((item) => ({
    source: sourceLabel(item.source),
    categoryOrigin: item.categoryOrigin || '—',
    url: item.url,
    title: item.title || '—',
    status: ITEM_STATUS[item.status] || item.status,
    stage: item.stage,
    errorCode: item.errorCode || '—',
    errorMessage: item.errorMessage || '—',
    draftId: item.draftId || '—',
    attempts: item.attempts,
    startedAt: fmtDate(item.startedAt),
    finishedAt: fmtDate(item.finishedAt),
  }));
}

function listView(icon) {
  const status = crawlerState.listStatus;
  const source = crawlerState.listSource;
  const jobs = crawlerState.jobs.filter((job) => {
    if (status !== 'all' && job.status !== status) return false;
    if (source !== 'all' && job.source !== source && !(job.method === 'excel' && source === 'mixed')) return false;
    return true;
  });
  return `<section class="crawler-shell">
    <div class="demo-callout">
      <div><b>راهنمای دمو PRD-066</b><p>Job تکمیل‌شده با خطا + Job زمان‌بندی‌شده از قبل در فهرست است. Wizard چهار مرحله‌ای: ورودی → زمان‌بندی → تأیید.</p></div>
      <div class="demo-callout-actions">
        <button type="button" class="secondary" data-action="crawler-demo-report">نمایش گزارش Excel</button>
        <button type="button" class="secondary" data-action="crawler-demo-wizard">Job جدید (Wizard)</button>
        <button type="button" class="secondary" data-action="crawler-demo-scheduled">Job زمان‌بندی‌شده</button>
      </div>
    </div>
    <div class="toolbar">
      <button type="button" class="primary" data-action="crawler-new">Job جدید</button>
      <label class="field-inline">وضعیت<select id="crawler-filter-status" data-crawler-filter="status">
        <option value="all">همه</option>${Object.entries(JOB_STATUS).map(([key, label]) => `<option value="${key}" ${status === key ? 'selected' : ''}>${label}</option>`).join('')}
      </select></label>
      <label class="field-inline">سورس<select id="crawler-filter-source" data-crawler-filter="source">
        <option value="all">همه</option>${SOURCES.map((item) => `<option value="${item.id}" ${source === item.id ? 'selected' : ''}>${item.label}</option>`).join('')}
      </select></label>
    </div>
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>شناسه</th><th>روش</th><th>سورس</th><th>وضعیت</th><th>شروع</th><th>آمار</th><th>سازنده</th><th></th></tr></thead>
      <tbody>${jobs.length ? jobs.map((job) => `<tr>
        <td><code>${escape(job.id.slice(-8))}</code></td>
        <td>${job.method === 'excel' ? 'Excel' : 'دسته‌بندی'}</td>
        <td>${job.source === 'mixed' ? 'ترکیبی' : sourceLabel(job.source)}</td>
        <td><span class="status-pill ${job.status}">${JOB_STATUS[job.status] || job.status}</span></td>
        <td>${job.status === 'scheduled' ? fmtDate(job.scheduledStartAt) : fmtDate(job.startedAt || job.createdAt)}</td>
        <td>${job.stats.success} موفق · ${job.stats.failed} ناموفق · ${job.stats.duplicate} تکراری</td>
        <td>${escape(job.creator)}</td>
        <td><button type="button" class="secondary" data-action="crawler-open" data-id="${job.id}">مشاهده</button></td>
      </tr>`).join('') : '<tr><td colspan="8">هنوز Jobی ثبت نشده است.</td></tr>'}</tbody>
    </table></div>
  </section>`;
}

function wizardView(icon) {
  const w = crawlerState.draft;
  const step = crawlerState.wizardStep;
  const cats = SOURCE_CATEGORIES[w.source] || [];
  const filteredCats = cats.filter((name) => !w.categoryQuery || name.includes(w.categoryQuery));
  const preview = w.excelPreview;
  const scheduleValue = w.scheduledAt || defaultScheduleLocal();
  return `<section class="crawler-shell wizard">
    <div class="wizard-steps">${[1, 2, 3, 4].map((n) => `<span class="${step >= n ? 'active' : ''}">${n}. ${n === 1 ? 'روش ورودی' : n === 2 ? 'ورودی' : n === 3 ? 'زمان‌بندی' : 'تأیید'}</span>`).join('')}</div>
    ${step === 1 ? `<div class="card-grid two">
      <button type="button" class="choice-card ${w.method === 'excel' ? 'active' : ''}" data-action="crawler-method" data-method="excel"><b>فایل Excel</b><small>ستون product_url</small></button>
      <button type="button" class="choice-card ${w.method === 'category' ? 'active' : ''}" data-action="crawler-method" data-method="category"><b>دسته‌بندی سورس</b><small>کشف لینک محصولات</small></button>
    </div>` : ''}
    ${step === 2 && w.method === 'excel' ? `<div class="card form-card">
      <button type="button" class="secondary" data-action="crawler-template">دانلود Template (.csv)</button>
      <label class="field">بارگذاری فایل<input type="file" id="crawler-file" accept=".xlsx,.csv,.txt"/></label>
      <p class="hint">در Prototype فایل CSV/TXT با یک URL در هر خط هم پذیرفته می‌شود.</p>
      ${preview ? `<div class="validation-box">
        <b>نتیجه اعتبارسنجی — ${escape(w.excelFileName)}</b>
        <p><b>سورس:</b> ${escape(excelSourceSummary(preview))}</p>
        <p>کل ${preview.total} · معتبر ${preview.valid.length} · نامعتبر ${preview.invalid} · تکراری ${preview.duplicate}</p>
        <ul class="compact">${preview.rows.slice(0, 6).map((row) => `<li>${row.ok ? '✓' : '✕'} ردیف ${row.row}: ${escape(row.reason || row.url)}</li>`).join('')}${preview.rows.length > 6 ? '<li>…</li>' : ''}</ul>
      </div>` : ''}
    </div>` : ''}
    ${step === 2 && w.method === 'category' ? `<div class="card form-card">
      <label class="field">سورس<select id="crawler-source">${SOURCES.map((item) => `<option value="${item.id}" ${w.source === item.id ? 'selected' : ''}>${item.label}</option>`).join('')}</select></label>
      <label class="field">جست‌وجوی دسته<input id="crawler-cat-q" value="${escape(w.categoryQuery)}" placeholder="نام دسته"/></label>
      <div class="chip-grid">${filteredCats.map((name) => `<label class="chip-check"><input type="checkbox" data-crawler-cat value="${escape(name)}" ${w.categories.includes(name) ? 'checked' : ''}/><span>${escape(name)}</span></label>`).join('')}</div>
    </div>` : ''}
    ${step === 3 ? `<div class="card form-card">
      <div class="card-grid two">
        <button type="button" class="choice-card ${w.startMode === 'now' ? 'active' : ''}" data-action="crawler-start-mode" data-mode="now"><b>شروع فوری</b><small>بلافاصله بعد از تأیید</small></button>
        <button type="button" class="choice-card ${w.startMode === 'scheduled' ? 'active' : ''}" data-action="crawler-start-mode" data-mode="scheduled"><b>زمان‌بندی</b><small>تاریخ و ساعت شروع</small></button>
      </div>
      ${w.startMode === 'scheduled' ? `<label class="field">زمان شروع<input type="datetime-local" id="crawler-scheduled-at" value="${escape(scheduleValue)}"/></label>` : '<p class="hint">Job بلافاصله پس از تأیید نهایی وارد صف اجرا می‌شود.</p>'}
    </div>` : ''}
    ${step === 4 ? `<div class="card confirm-card">
      <p><b>روش:</b> ${w.method === 'excel' ? 'Excel' : 'دسته‌بندی'}</p>
      ${w.method === 'excel' && preview ? `<p><b>سورس:</b> ${escape(excelSourceSummary(preview))}</p><p><b>لینک معتبر:</b> ${preview.valid.length}</p>` : ''}
      ${w.method === 'category' ? `<p><b>سورس:</b> ${sourceLabel(w.source)}</p><p><b>دسته‌ها:</b> ${w.categories.join('، ') || '—'}</p><p><b>تخمین لینک:</b> ${Math.max(3, w.categories.length * 4)}</p>` : ''}
      <p><b>شروع:</b> ${w.startMode === 'scheduled' ? `زمان‌بندی — ${fmtDate(new Date(scheduleValue).toISOString())}` : 'فوری'}</p>
      <p class="hint">محصولات موفق فقط به‌صورت Draft در تب محصول همین Prototype ساخته می‌شوند.</p>
    </div>` : ''}
    <div class="wizard-actions">
      <button type="button" class="secondary" data-action="crawler-back-list">انصراف</button>
      ${step > 1 ? `<button type="button" class="secondary" data-action="crawler-prev">مرحله قبل</button>` : ''}
      ${step < WIZARD_MAX_STEP ? `<button type="button" class="primary" data-action="crawler-next">مرحله بعد</button>` : `<button type="button" class="primary" data-action="crawler-run">${w.startMode === 'scheduled' ? 'ثبت زمان‌بندی' : 'شروع Job'}</button>`}
    </div>
  </section>`;
}

function detailView(icon) {
  const job = selectedJob();
  if (!job) return listView(icon);
  const tab = crawlerState.detailTab;
  const items = filteredItems(job);
  const progress = job.stats.total ? Math.round(((job.stats.success + job.stats.failed + job.stats.duplicate + job.stats.cancelled) / job.stats.total) * 100) : 0;
  const report = jobReportRows(job);
  const scheduleLine = job.status === 'scheduled' && job.scheduledStartAt
    ? `شروع برنامه‌ریزی‌شده: ${fmtDate(job.scheduledStartAt)}`
    : `شروع: ${fmtDate(job.startedAt)} · پایان: ${fmtDate(job.finishedAt)}`;
  return `<section class="crawler-shell detail">
    <div class="detail-head">
      <button type="button" class="secondary" data-action="crawler-back-list">← فهرست Job</button>
      <div><span class="status-pill ${job.status}">${JOB_STATUS[job.status]}</span><code>${escape(job.id)}</code></div>
      <div class="toolbar">
        <button type="button" class="secondary" data-action="crawler-export">دانلود Excel</button>
        ${job.status === 'running' || job.stats.failed ? `<button type="button" class="secondary" data-action="crawler-retry-failed">Retry ناموفق‌ها</button>` : ''}
        ${job.status === 'scheduled' ? `<button type="button" class="primary" data-action="crawler-force-start">شروع فوری (دمو)</button>` : ''}
        ${job.status === 'scheduled' || job.status === 'running' || job.stats.pending ? `<button type="button" class="secondary" data-action="crawler-cancel">لغو Job</button>` : ''}
      </div>
    </div>
    <div class="detail-tabs">
      <button type="button" class="${tab === 'progress' ? 'active' : ''}" data-action="crawler-detail-tab" data-tab="progress">پیشرفت Job</button>
      <button type="button" class="${tab === 'excel' ? 'active' : ''}" data-action="crawler-detail-tab" data-tab="excel">نتیجه Excel</button>
    </div>
    ${tab === 'progress' ? `<div class="stat-grid">
      <article><small>کل</small><b>${job.stats.total}</b></article>
      <article><small>موفق</small><b>${job.stats.success}</b></article>
      <article><small>ناموفق</small><b>${job.stats.failed}</b></article>
      <article><small>تکراری</small><b>${job.stats.duplicate}</b></article>
      <article><small>پیشرفت</small><b>${progress}%</b></article>
    </div>
    <p class="meta-line">${scheduleLine} · به‌روزرسانی: ${fmtDate(job.updatedAt)}</p>
    <div class="progress"><span style="width:${progress}%"></span></div>
    <div class="toolbar">
      <label class="field-inline">وضعیت آیتم<select id="crawler-item-status" data-crawler-item-filter="status">
        <option value="all">همه</option>${Object.entries(ITEM_STATUS).map(([key, label]) => `<option value="${key}" ${crawlerState.itemFilter === key ? 'selected' : ''}>${label}</option>`).join('')}
      </select></label>
      <label class="field-inline">سورس<select id="crawler-item-source" data-crawler-item-filter="source">
        <option value="all">همه</option>${SOURCES.map((item) => `<option value="${item.id}" ${crawlerState.itemSource === item.id ? 'selected' : ''}>${item.label}</option>`).join('')}
      </select></label>
    </div>
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th></th><th>عنوان</th><th>سورس</th><th>URL</th><th>مرحله</th><th>وضعیت</th><th>Draft</th><th>خطا</th></tr></thead>
      <tbody>${items.map((item) => `<tr>
        <td>${item.status === 'failed' ? `<input type="checkbox" data-crawler-pick value="${item.id}"/>` : ''}</td>
        <td>${escape(item.title || '—')}</td>
        <td>${sourceLabel(item.source)}</td>
        <td class="url">${escape(item.url)}</td>
        <td>${escape(item.stage)}</td>
        <td><span class="status-pill ${item.status}">${ITEM_STATUS[item.status] || item.status}</span></td>
        <td>${item.draftId ? `<button type="button" class="linkish" data-action="crawler-open-draft" data-id="${item.draftId}">${escape(item.draftId)}</button>` : '—'}</td>
        <td>${escape(item.errorMessage || '—')}</td>
      </tr>`).join('')}</tbody>
    </table></div>` : `<div class="excel-panel">
      <div class="excel-toolbar"><b>گزارش نتیجه کرال</b><span>${report.length} ردیف · موفق ${job.stats.success} · ناموفق ${job.stats.failed} · تکراری ${job.stats.duplicate}</span></div>
      <div class="table-wrap excel-sheet"><table class="data-table excel-table">
        <thead><tr><th>سورس</th><th>دسته مبدأ</th><th>URL</th><th>عنوان</th><th>وضعیت</th><th>مرحله</th><th>کد خطا</th><th>پیام خطا</th><th>Draft</th><th>تلاش</th></tr></thead>
        <tbody>${report.map((row) => `<tr>
          <td>${escape(row.source)}</td>
          <td>${escape(row.categoryOrigin)}</td>
          <td class="url">${escape(row.url)}</td>
          <td>${escape(row.title)}</td>
          <td>${escape(row.status)}</td>
          <td>${escape(row.stage)}</td>
          <td>${escape(row.errorCode)}</td>
          <td>${escape(row.errorMessage)}</td>
          <td>${escape(row.draftId)}</td>
          <td>${row.attempts}</td>
        </tr>`).join('')}</tbody>
      </table></div>
      <p class="hint">این نما همان ساختار فایل Excel خروجی است؛ برای فایل `.xlsx` از «دانلود Excel» استفاده کن.</p>
    </div>`}
  </section>`;
}

export function downloadTemplate() {
  const csv = 'product_url\nhttps://www.digikala.com/product/dkp-sample/\n';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'plaza-crawler-template.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

export function exportJobCsv(job) {
  const header = ['source', 'category_origin', 'url', 'title', 'status', 'stage', 'error_code', 'error_message', 'draft_id', 'attempts', 'started_at', 'finished_at'];
  const lines = [header.join(',')];
  job.items.forEach((item) => {
    lines.push([
      item.source,
      item.categoryOrigin,
      item.url,
      item.title,
      item.status,
      item.stage,
      item.errorCode,
      item.errorMessage,
      item.draftId,
      item.attempts,
      item.startedAt,
      item.finishedAt,
    ].map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','));
  });
  lines.push(`summary,success=${job.stats.success},failed=${job.stats.failed},duplicate=${job.stats.duplicate},cancelled=${job.stats.cancelled}`);
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${job.id}-report.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function handleCrawlerFile(file, rerender) {
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || '');
    const lines = text.split(/\r?\n/).slice(1).filter(Boolean);
    if (!lines.length && text.trim()) lines.push(...text.split(/\r?\n/).filter(Boolean));
    crawlerState.draft.excelFileName = file.name;
    crawlerState.draft.excelPreview = validateUrls(lines.length ? lines : text.split(/\r?\n/));
    rerender();
  };
  reader.readAsText(file);
}

export function runWizardJob(rerender, onOpenProduct) {
  const w = crawlerState.draft;
  let urls = [];
  if (w.method === 'excel') {
    if (!w.excelPreview?.valid.length) return { error: 'حداقل یک لینک معتبر لازم است.' };
    urls = w.excelPreview.valid.map((row) => row.url);
  } else {
    if (!w.categories.length) return { error: 'حداقل یک دسته‌بندی انتخاب کن.' };
    urls = w.categories.flatMap((cat, index) => [
      `https://www.${w.source === 'snapshop' ? 'snappshop.ir' : `${w.source}.com`}/category/${index + 1}/p-101/`,
      `https://www.${w.source === 'snapshop' ? 'snappshop.ir' : `${w.source}.com`}/category/${index + 1}/p-102/`,
      `https://www.${w.source === 'snapshop' ? 'snappshop.ir' : `${w.source}.com`}/category/${index + 1}/p-bad/`,
    ]);
  }
  const startMode = w.startMode || 'now';
  const scheduledAt = w.scheduledAt || defaultScheduleLocal();
  if (startMode === 'scheduled') {
    const when = new Date(scheduledAt).getTime();
    if (!when || Number.isNaN(when)) return { error: 'زمان شروع معتبر نیست.' };
    if (when <= Date.now()) return { error: 'زمان شروع باید در آینده باشد.' };
  }
  const job = buildJob({
    method: w.method,
    source: w.source,
    categories: w.categories,
    urls,
    creator: 'مهدی فرحزادی',
    run: startMode !== 'scheduled',
    startMode,
    scheduledAt: startMode === 'scheduled' ? scheduledAt : '',
  });
  crawlerState.jobs.unshift(job);
  persistJobs();
  crawlerState.view = 'detail';
  crawlerState.selectedJobId = job.id;
  crawlerState.detailTab = job.status === 'scheduled' ? 'progress' : 'progress';
  crawlerState.draft = emptyWizard();
  crawlerState.wizardStep = 1;
  rerender();
  return { scheduled: job.status === 'scheduled' };
}

export function retryFailed(job, ids, rerender) {
  const pick = ids?.length ? ids : job.items.filter((item) => item.status === 'failed' && item.errorCode !== 'PAGE_NOT_FOUND').map((item) => item.id);
  pick.forEach((itemId) => {
    const item = job.items.find((entry) => entry.id === itemId);
    if (!item || item.errorCode === 'PAGE_NOT_FOUND') return;
    item.attempts += 1;
    item.status = 'syncing';
    item.stage = 'cms-retry';
    item.errorCode = '';
    item.errorMessage = '';
    if (item.title) createDraftFromCrawl(item);
    else {
      item.status = 'failed';
      item.errorCode = 'RETRY_NO_DATA';
      item.errorMessage = 'داده ذخیره‌شده برای Retry کافی نیست';
    }
  });
  finalizeJob(job);
  persistJobs();
  rerender();
}

export function cancelJob(job, rerender) {
  if (job.status === 'scheduled') {
    job.status = 'cancelled';
    job.updatedAt = new Date().toISOString();
    persistJobs();
    rerender();
    return;
  }
  job.items.forEach((item) => {
    if (item.status === 'pending') item.status = 'cancelled';
  });
  finalizeJob(job);
  persistJobs();
  rerender();
}

export function persistCrawlerUi() {
  persistJobs();
}
