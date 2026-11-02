import {
  activeLeaves,
  brandAllowed,
  brandById,
  brandsForLeaf,
  catalog,
  logChange,
  persistCatalog,
  schemaOf,
  slugFromTitle,
  uniqueProductSlug,
  variantAxes,
} from './catalog.js';
import { pathLabel } from './tree.js';

const JOB_KEY = 'plaza-bulk-jobs-v1';
const WARRANTIES = ['۱۸ ماه گارانتی شرکتی', '۲۴ ماه گارانتی شرکتی', 'سلامت و اصالت فیزیکی'];
const STEPS = ['LeafCat', 'قالب', 'بارگذاری', 'پیش‌نمایش'];

export const bulkState = {
  open: false,
  step: 1,
  leafId: 'phone',
  images: {},
  preview: null,
  jobs: readJobs(),
  toast: '',
};

function readJobs() {
  try {
    return JSON.parse(localStorage.getItem(JOB_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveJobs() {
  localStorage.setItem(JOB_KEY, JSON.stringify(bulkState.jobs.slice(0, 12)));
}

function escape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function fa(value) {
  return new Intl.NumberFormat('fa-IR').format(value);
}

function basename(value) {
  return String(value || '').trim().replace(/\\/g, '/').split('/').pop();
}

function leaf() {
  return activeLeaves().find((item) => item.node.id === bulkState.leafId) || activeLeaves()[0];
}

function productFields(leafId) {
  const attrs = schemaOf(leafId).filter((field) => field.active && !field.variant);
  return [
    { key: 'code', label: 'کد محصول', locked: false },
    { key: 'title', label: 'عنوان فارسی', locked: false },
    { key: 'titleEn', label: 'عنوان انگلیسی', locked: false },
    { key: 'brand', label: 'برند', locked: false },
    { key: 'description', label: 'توضیحات', locked: false },
    { key: 'image', label: 'تصویر اصلی', locked: false },
    { key: 'gallery', label: 'گالری', locked: false },
    ...attrs.map((field) => ({ key: `attr:${field.key}`, label: `${field.label}${field.required ? ' *' : ''}`, locked: false, field })),
  ];
}

function skuFields(leafId) {
  const axes = variantAxes(leafId);
  const color = axes.some((axis) => axis.key === 'color');
  return [
    { key: 'code', label: 'کد محصول' },
    ...axes.map((axis) => ({ key: `axis:${axis.key}`, label: axis.label, axis })),
    { key: 'warranty', label: 'گارانتی' },
    ...(color ? [{ key: 'colorImage', label: 'تصویر رنگ' }] : []),
  ];
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const raw = String(text || '').replace(/^\uFEFF/, '');
  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];
    if (quoted) {
      if (char === '"' && raw[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (char === ',') { row.push(cell.trim()); cell = ''; continue; }
    if (char === '\n') {
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    if (char !== '\r') cell += char;
  }
  if (cell || row.length) {
    row.push(cell.trim());
    if (row.some(Boolean)) rows.push(row);
  }
  return rows;
}

function splitWorkbook(text) {
  const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/);
  let current = 'products';
  const buckets = { products: [], skus: [] };
  for (const line of lines) {
    const mark = line.trim();
    if (/^#\s*کدهای کالا/.test(mark) || /^#\s*skus?/i.test(mark)) { current = 'skus'; continue; }
    if (/^#\s*محصولات/.test(mark) || /^#\s*products?/i.test(mark)) { current = 'products'; continue; }
    buckets[current].push(line);
  }
  return {
    products: parseCsv(buckets.products.join('\n')),
    skus: parseCsv(buckets.skus.join('\n')),
  };
}

function rowsToObjects(table, fields) {
  if (!table.length) return [];
  const header = table[0].map((cell) => cell.trim());
  return table.slice(1).map((row) => {
    const item = {};
    fields.forEach((field, index) => {
      const at = header.indexOf(field.label) >= 0 ? header.indexOf(field.label) : index;
      item[field.key] = row[at] || '';
    });
    return item;
  }).filter((item) => Object.values(item).some(Boolean));
}

function objectsToCsv(rows, fields) {
  const header = fields.map((field) => csvEscape(field.label)).join(',');
  const body = rows.map((row) => fields.map((field) => csvEscape(row[field.key] || '')).join(',')).join('\n');
  return `\uFEFF${header}\n${body}\n`;
}

function downloadText(name, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

function allowedOptions(leafId) {
  const schema = schemaOf(leafId);
  const brands = brandsForLeaf(leafId).map((brand) => brand.name);
  const axes = variantAxes(leafId);
  return [
    ['برند', brands],
    ['گارانتی', WARRANTIES],
    ...schema.filter((field) => field.options?.length).map((field) => [field.label, field.options]),
    ...axes.map((axis) => [axis.label, axis.options]),
  ];
}

function resolveImage(cell, images) {
  const raw = String(cell || '').trim();
  if (!raw) return { kind: 'empty', name: '', src: '' };
  if (/^https?:\/\//i.test(raw)) return { kind: 'url', name: raw, src: raw };
  const key = basename(raw).toLowerCase();
  const found = images[key];
  if (!found) return { kind: 'missing', name: raw, src: '' };
  return { kind: 'file', name: found.name, src: found.src };
}

function splitList(value) {
  return String(value || '').split(/[|;،]/).map((part) => part.trim()).filter(Boolean);
}

function existingCodes() {
  return new Set(catalog.products.flatMap((item) => [item.id, item.code, item.model].filter(Boolean).map((value) => String(value).trim())));
}

function brandNameToId(leafId, name) {
  if (!name) return null;
  const found = brandsForLeaf(leafId).find((brand) => brand.name === name || brand.nameEn === name || brand.id === name);
  return found?.id || null;
}

function swatch(label, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 240;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 240, 240);
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  ctx.fillRect(0, 170, 240, 70);
  ctx.fillStyle = '#fff';
  ctx.font = '700 18px Vazirmatn, Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, 120, 210);
  return canvas.toDataURL('image/jpeg', 0.72);
}

export function openBulkWizard() {
  bulkState.open = true;
  bulkState.step = 1;
  bulkState.preview = null;
  if (!activeLeaves().some((item) => item.node.id === bulkState.leafId)) {
    bulkState.leafId = activeLeaves()[0]?.node.id || '';
  }
}

export function closeBulkWizard() {
  bulkState.open = false;
  bulkState.step = 1;
  bulkState.preview = null;
}

export function bulkHeading() {
  return 'ورود گروهی محصول';
}

export function bulkSubhead() {
  return 'قالب اکسل به‌ازای LeafCat، تصویر با نام فایل، نتیجه فقط پیش‌نویس';
}

function readDomRows(kind, fields) {
  return [...document.querySelectorAll(`[data-bulk-${kind}]`)].map((row) => {
    const item = {};
    fields.forEach((field) => {
      item[field.key] = row.querySelector(`[data-col="${field.key}"]`)?.value.trim() || '';
    });
    return item;
  }).filter((item) => Object.values(item).some(Boolean));
}

function captureRows() {
  const leafId = bulkState.leafId;
  return {
    products: readDomRows('product', productFields(leafId)),
    skus: readDomRows('sku', skuFields(leafId)),
  };
}

function validate(products, skus, images) {
  const leafId = bulkState.leafId;
  const axes = variantAxes(leafId);
  const attrs = schemaOf(leafId).filter((field) => field.active && !field.variant);
  const known = existingCodes();
  const inFile = new Set();
  const errors = [];
  const warnings = [];
  const ready = [];
  const grouped = new Map();

  products.forEach((row, index) => {
    const line = index + 2;
    const code = row.code.trim();
    if (!code) {
      errors.push({ line: `محصول ${fa(line)}`, message: 'کد محصول خالی است.' });
      return;
    }
    if (inFile.has(code) || known.has(code)) {
      errors.push({ line: `محصول ${code}`, message: 'کد محصول تکراری است.' });
      return;
    }
    inFile.add(code);
    if (!row.title.trim()) {
      errors.push({ line: `محصول ${code}`, message: 'عنوان فارسی لازم است.' });
      return;
    }
    let brandId = null;
    if (row.brand) {
      brandId = brandNameToId(leafId, row.brand);
      if (!brandId || !brandAllowed(brandById(brandId), leafId)) {
        errors.push({ line: `محصول ${code}`, message: `برند «${row.brand}» برای این LeafCat مجاز نیست.` });
        return;
      }
    }
    const attributes = {};
    for (const field of attrs) {
      const value = row[`attr:${field.key}`]?.trim() || '';
      if (field.dataType === 'boolean') attributes[field.key] = value === 'بله' || value === 'true';
      else if (field.dataType === 'multi') attributes[field.key] = splitList(value);
      else if (field.dataType === 'number') {
        if (value && Number.isNaN(Number(value))) {
          errors.push({ line: `محصول ${code}`, message: `«${field.label}» باید عدد باشد.` });
          return;
        }
        attributes[field.key] = value;
      } else if ((field.dataType === 'single') && value && field.options?.length && !field.options.includes(value)) {
        errors.push({ line: `محصول ${code}`, message: `مقدار «${field.label}» خارج از گزینه‌های مجاز است.` });
        return;
      } else attributes[field.key] = value;
      if (field.required && !value) warnings.push({ line: `محصول ${code}`, message: `ویژگی اجباری «${field.label}» خالی است؛ Draft ساخته می‌شود.` });
    }
    const main = resolveImage(row.image, images);
    if (main.kind === 'missing') errors.push({ line: `محصول ${code}`, message: `تصویر اصلی «${main.name}» در فایل‌ها نیست.` });
    if (main.kind === 'empty') warnings.push({ line: `محصول ${code}`, message: 'تصویر اصلی خالی است؛ انتشار بعدی آن را می‌خواهد.' });
    const gallery = [];
    for (const name of splitList(row.gallery)) {
      const item = resolveImage(name, images);
      if (item.kind === 'missing') errors.push({ line: `محصول ${code}`, message: `تصویر گالری «${item.name}» در فایل‌ها نیست.` });
      else gallery.push({ name: item.name, src: item.src });
    }
    grouped.set(code, {
      code,
      title: row.title.trim(),
      titleEn: row.titleEn.trim(),
      brandId,
      description: row.description.trim(),
      main,
      gallery,
      attributes,
      skus: [],
      colorImages: {},
    });
  });

  skus.forEach((row, index) => {
    const line = index + 2;
    const code = row.code.trim();
    const parent = grouped.get(code);
    if (!parent) {
      errors.push({ line: `SKU ${fa(line)}`, message: `کد محصول «${code || 'خالی'}» در شیت محصولات نیست.` });
      return;
    }
    const combo = {};
    for (const axis of axes) {
      const value = row[`axis:${axis.key}`]?.trim() || '';
      if (!value) {
        errors.push({ line: `SKU ${code}`, message: `مقدار «${axis.label}» لازم است.` });
        return;
      }
      if (!axis.options.includes(value)) {
        errors.push({ line: `SKU ${code}`, message: `«${value}» در ${axis.label} مجاز نیست.` });
        return;
      }
      combo[axis.key] = value;
    }
    const identity = Object.entries(combo).map(([key, value]) => `${key}:${value}`).sort().join('|');
    if (parent.skus.some((entry) => entry.identity === identity)) {
      errors.push({ line: `SKU ${code}`, message: 'ترکیب تنوع تکراری است.' });
      return;
    }
    const warranty = row.warranty.trim() || 'سلامت و اصالت فیزیکی';
    if (row.warranty && !WARRANTIES.includes(warranty)) {
      errors.push({ line: `SKU ${code}`, message: `گارانتی «${row.warranty}» مجاز نیست.` });
      return;
    }
    if (row.colorImage !== undefined) {
      const color = combo.color;
      const pic = resolveImage(row.colorImage, images);
      if (pic.kind === 'missing') errors.push({ line: `SKU ${code}`, message: `تصویر رنگ «${pic.name}» در فایل‌ها نیست.` });
      if (pic.kind !== 'empty' && color) {
        const previous = parent.colorImages[color];
        if (previous && previous.name !== pic.name) {
          errors.push({ line: `SKU ${code}`, message: `رنگ ${color} دو تصویر متفاوت دارد.` });
          return;
        }
        parent.colorImages[color] = { name: pic.name, src: pic.src };
      }
    }
    parent.skus.push({ identity, combo, warranty });
  });

  grouped.forEach((item) => {
    if (!item.skus.length) {
      errors.push({ line: `محصول ${item.code}`, message: 'حداقل یک ردیف SKU لازم است.' });
      return;
    }
    if (item.main.kind === 'missing') return;
    const id = `prd-${item.code}`;
    let slug = uniqueProductSlug(slugFromTitle(item.title) || item.code, id);
    while (ready.some((entry) => entry.seo.slug === slug)) slug = `${slug}-2`;
    ready.push({
      id,
      code: item.code,
      title: item.title,
      titleEn: item.titleEn,
      model: item.code,
      description: item.description || 'واردشده از اکسل گروهی.',
      image: item.main.src || '',
      imageName: item.main.name || '',
      gallery: item.gallery,
      colorImages: item.colorImages,
      leafId,
      brandId: item.brandId,
      status: 'draft',
      publishedAt: '',
      sales: 0,
      attributes: item.attributes,
      source: 'excel',
      tags: [],
      links: [],
      aiCrossSell: [],
      seo: { slug, title: '', description: '', index: true, follow: true, canonical: '', redirects: [] },
      skus: item.skus.map((entry, index) => ({
        code: `PLAZA-${item.code}-${index + 1}`,
        combo: entry.combo,
        price: 0,
        compareAt: null,
        stock: 0,
        reserved: 0,
        warranty: entry.warranty,
        shipping: '۲ تا ۴ روز کاری',
        pickup: false,
        installment: null,
        active: true,
        incompatible: false,
        barcode: '',
      })),
    });
  });

  return {
    products: products.length,
    skus: skus.length,
    ready,
    errors,
    warnings,
    created: ready.length,
    noImage: ready.filter((item) => !item.image).length,
  };
}

export function downloadTemplate() {
  const current = leaf();
  const leafId = current.node.id;
  const pFields = productFields(leafId);
  const sFields = skuFields(leafId);
  const sampleP = Object.fromEntries(pFields.map((field) => [field.key, '']));
  sampleP.code = '20001';
  sampleP.title = 'نمونه عنوان فارسی';
  const sampleS = Object.fromEntries(sFields.map((field) => [field.key, '']));
  sampleS.code = '20001';
  const allowed = allowedOptions(leafId).map(([label, values]) => `${csvEscape(label)},${values.map(csvEscape).join(',')}`).join('\n');
  const guide = [
    '# محصولات',
    objectsToCsv([sampleP], pFields).replace(/^\uFEFF/, '').trim(),
    '',
    '# کدهای کالا',
    objectsToCsv([sampleS], sFields).replace(/^\uFEFF/, '').trim(),
    '',
    '# مقادیر مجاز',
    allowed,
    '',
    '# تصویر',
    'تصویر داخل سلول نگذار. نام فایل یا URL بنویس.',
    'اصلی: {کد}-main.jpg',
    'گالری: {کد}-g01.jpg|{کد}-g02.jpg',
    'رنگ: {کد}-meshki.jpg روی شیت کدهای کالا',
  ].join('\n');
  downloadText(`plaza-bulk-${leafId}.csv`, `\uFEFF${guide}\n`);
}

export function downloadExisting() {
  const leafId = bulkState.leafId;
  const pFields = productFields(leafId);
  const sFields = skuFields(leafId);
  const products = catalog.products.filter((item) => item.leafId === leafId).map((item) => {
    const row = {
      code: item.code || item.id,
      title: item.title,
      titleEn: item.titleEn,
      brand: brandById(item.brandId)?.name || '',
      description: item.description || '',
      image: item.imageName || (item.image?.startsWith('data:') ? '' : item.image),
      gallery: (item.gallery || []).map((pic) => pic.name || pic).join('|'),
    };
    schemaOf(leafId).filter((field) => field.active && !field.variant).forEach((field) => {
      const value = item.attributes?.[field.key];
      row[`attr:${field.key}`] = Array.isArray(value) ? value.join('|') : (value ?? '');
    });
    return row;
  });
  const skus = catalog.products.filter((item) => item.leafId === leafId).flatMap((item) => item.skus.map((sku) => {
    const row = { code: item.code || item.id, warranty: sku.warranty || '' };
    variantAxes(leafId).forEach((axis) => { row[`axis:${axis.key}`] = sku.combo?.[axis.key] || ''; });
    if (sku.combo?.color) row.colorImage = item.colorImages?.[sku.combo.color]?.name || '';
    return row;
  }));
  const body = ['# محصولات', objectsToCsv(products, pFields).replace(/^\uFEFF/, '').trim(), '', '# کدهای کالا', objectsToCsv(skus, sFields).replace(/^\uFEFF/, '').trim()].join('\n');
  downloadText(`plaza-bulk-export-${leafId}.csv`, `\uFEFF${body}\n`);
}

function nextSampleCode() {
  const known = existingCodes();
  let n = 20001;
  while (known.has(String(n))) n += 1;
  return String(n);
}

function fillSample() {
  bulkState.leafId = 'phone';
  const code = nextSampleCode();
  const images = {
    [`${code}-main.jpg`]: { name: `${code}-main.jpg`, src: swatch('اصلی S24', '#1f3b4d') },
    [`${code}-g01.jpg`]: { name: `${code}-g01.jpg`, src: swatch('گالری ۱', '#34586c') },
    [`${code}-g02.jpg`]: { name: `${code}-g02.jpg`, src: swatch('گالری ۲', '#4a7186') },
    [`${code}-meshki.jpg`]: { name: `${code}-meshki.jpg`, src: swatch('مشکی', '#111111') },
    [`${code}-noghrei.jpg`]: { name: `${code}-noghrei.jpg`, src: swatch('نقره‌ای', '#8a93a0') },
  };
  bulkState.images = images;
  const products = [{
    code,
    title: 'گوشی سامسونگ گلکسی S24',
    titleEn: 'Samsung Galaxy S24',
    brand: 'سامسونگ',
    description: 'نمونه ورود گروهی با تصویر اصلی، گالری و تصویر رنگ.',
    image: `${code}-main.jpg`,
    gallery: `${code}-g01.jpg|${code}-g02.jpg`,
  }];
  const skus = [
    { code, 'axis:color': 'مشکی', 'axis:storage': '۲۵۶ گیگابایت', warranty: '۱۸ ماه گارانتی شرکتی', colorImage: `${code}-meshki.jpg` },
    { code, 'axis:color': 'مشکی', 'axis:storage': '۵۱۲ گیگابایت', warranty: '۱۸ ماه گارانتی شرکتی', colorImage: `${code}-meshki.jpg` },
    { code, 'axis:color': 'نقره‌ای', 'axis:storage': '۲۵۶ گیگابایت', warranty: '۲۴ ماه گارانتی شرکتی', colorImage: `${code}-noghrei.jpg` },
    { code, 'axis:color': 'سفید', 'axis:storage': '۱۲۸ گیگابایت', warranty: 'سلامت و اصالت فیزیکی', colorImage: '' },
  ];
  bulkState.preview = validate(products, skus, images);
  bulkState.preview.sampleRows = { products, skus };
  bulkState.step = 4;
}

function applyPreview() {
  const preview = bulkState.preview;
  if (!preview?.ready.length) return 'ردیفی برای ساخت نیست.';
  preview.ready.forEach((item) => catalog.products.unshift(item));
  try {
    persistCatalog();
  } catch {
    preview.ready.forEach((item) => {
      const at = catalog.products.findIndex((row) => row.id === item.id);
      if (at >= 0) catalog.products.splice(at, 1);
    });
    return 'ذخیره تصویر در این مرورگر ممکن نشد. فایل سبک‌تری انتخاب کن.';
  }
  logChange(`ورود گروهی ${preview.ready.length} پیش‌نویس از اکسل`);
  bulkState.jobs.unshift({
    id: `bulk-${Date.now().toString(36)}`,
    at: new Date().toISOString(),
    leafId: bulkState.leafId,
    created: preview.ready.length,
    warnings: preview.warnings.length,
    errors: preview.errors.length,
    codes: preview.ready.map((item) => item.code),
  });
  saveJobs();
  return null;
}

function sheet(kind, fields, rows) {
  const starter = rows?.length ? rows : [{}];
  while (starter.length < 3) starter.push({});
  return `<div class="excel-panel"><div class="table-wrap excel-sheet"><table class="data-table excel-table">
    <thead><tr>${fields.map((field) => `<th>${escape(field.label)}</th>`).join('')}</tr></thead>
    <tbody>${starter.map((row) => `<tr data-bulk-${kind}>${fields.map((field) => `<td><input data-col="${field.key}" value="${escape(row[field.key] || '')}" /></td>`).join('')}</tr>`).join('')}</tbody>
  </table></div></div>`;
}

export function bulkView() {
  const current = leaf();
  const leafId = current?.node.id;
  bulkState.leafId = leafId;
  const step = bulkState.step;
  const preview = bulkState.preview;
  const pFields = productFields(leafId);
  const sFields = skuFields(leafId);
  const sample = preview?.sampleRows;
  return `<div class="workspace bulk-wrap">
    <div class="wizard-steps">${STEPS.map((label, index) => `<span class="${step === index + 1 ? 'active' : ''}">${fa(index + 1)}. ${label}</span>`).join('')}</div>
    ${step === 1 ? `<section class="card form-card">
      <h2>یک LeafCat فعال انتخاب کن</h2>
      <p class="hint">هر فایل فقط برای یک دستهٔ نهایی است. ستون ویژگی و تنوع از Schema همین دسته می‌آید.</p>
      <label class="field"><span>LeafCat</span><select id="bulk-leaf">${activeLeaves().map(({ node }) => `<option value="${node.id}" ${node.id === leafId ? 'selected' : ''}>${escape(pathLabel(node.id))}</option>`).join('')}</select></label>
      <p class="meta-line">${escape(pathLabel(leafId))} · ${fa(schemaOf(leafId).filter((field) => field.active && !field.variant).length)} ویژگی · ${fa(variantAxes(leafId).length)} محور تنوع</p>
    </section>` : ''}
    ${step === 2 ? `<section class="card form-card">
      <h2>قالب ${escape(current.node.name)}</h2>
      <p class="hint">اکسل فقط ارجاع تصویر است. خود فایل را جدا انتخاب می‌کنی.</p>
      <div class="choice-grid">
        <article class="choice-card"><b>تصویر اصلی</b><small>ستون «تصویر اصلی» در شیت محصولات. یک فایل مثل 20001-main.jpg</small></article>
        <article class="choice-card"><b>گالری</b><small>همان شیت، چند نام با | مثل 20001-g01.jpg|20001-g02.jpg</small></article>
        <article class="choice-card"><b>تصویر رنگ</b><small>شیت کدهای کالا، روی ردیف همان رنگ. دو SKU مشکی = یک فایل</small></article>
      </div>
      <div class="wizard-actions" style="justify-content:flex-start;margin-top:12px">
        <button type="button" class="secondary" data-action="bulk-template">دانلود قالب CSV</button>
        <button type="button" class="secondary" data-action="bulk-export">خروجی محصولات این دسته</button>
      </div>
      <div class="validation-box"><b>مقادیر مجاز</b><ul class="compact">${allowedOptions(leafId).map(([label, values]) => `<li>${escape(label)}: ${escape(values.join('، '))}</li>`).join('')}</ul></div>
    </section>` : ''}
    ${step === 3 ? `<section class="card form-card">
      <h2>پر کردن قالب و عکس‌ها</h2>
      <p class="hint">CSV را بارگذاری کن یا جدول را دستی پر کن. چند تصویر را با هم انتخاب کن؛ نام فایل باید با سلول یکی باشد. زیپ در این پروتوتایپ به انتخاب چند فایل تبدیل شده است.</p>
      <div class="wizard-actions" style="justify-content:flex-start">
        <label class="secondary">فایل اکسل / CSV<input type="file" id="bulk-csv" accept=".csv,.txt,.xlsx" hidden /></label>
        <label class="secondary">تصویرها<input type="file" id="bulk-images" accept="image/*" multiple hidden /></label>
        <button type="button" class="primary" data-action="bulk-sample">نمونه گلکسی S24</button>
      </div>
      <p class="meta-line">${fa(Object.keys(bulkState.images).length)} تصویر انتخاب‌شده${Object.keys(bulkState.images).length ? `: ${escape(Object.keys(bulkState.images).join('، '))}` : ''}</p>
      <h3>شیت محصولات</h3>
      ${sheet('product', pFields, sample?.products)}
      <h3>شیت کدهای کالا</h3>
      ${sheet('sku', sFields, sample?.skus)}
    </section>` : ''}
    ${step === 4 && preview ? `<section class="card form-card">
      <h2>پیش‌نمایش بارگذاری</h2>
      <div class="stat-grid">
        <article><small>ردیف محصول</small><b>${fa(preview.products)}</b></article>
        <article><small>قابل ایجاد</small><b>${fa(preview.created)}</b></article>
        <article><small>هشدار</small><b>${fa(preview.warnings.length)}</b></article>
        <article><small>خطا</small><b>${fa(preview.errors.length)}</b></article>
        <article><small>بدون تصویر اصلی</small><b>${fa(preview.noImage)}</b></article>
      </div>
      ${preview.ready.map((item) => `<article class="bulk-preview">
        <div class="bulk-photos">
          ${item.image ? `<figure><img src="${item.image}" alt="اصلی"/><figcaption>اصلی</figcaption></figure>` : '<figure class="empty"><span>بدون اصلی</span></figure>'}
          ${(item.gallery || []).map((pic) => `<figure><img src="${pic.src}" alt=""/><figcaption>گالری</figcaption></figure>`).join('')}
          ${Object.entries(item.colorImages || {}).map(([color, pic]) => `<figure><img src="${pic.src}" alt=""/><figcaption>${escape(color)}</figcaption></figure>`).join('')}
        </div>
        <div><b>${escape(item.title)}</b><small>کد ${escape(item.code)} · ${fa(item.skus.length)} SKU · Draft</small>
          <p>${item.skus.map((sku) => escape(Object.values(sku.combo).join(' · ') || 'پایه')).join(' | ')}</p>
          ${item.skus.some((sku) => sku.combo.color === 'سفید') && !item.colorImages?.سفید ? '<p class="hint">رنگ سفید تصویر ندارد؛ در سایت از تصویر اصلی استفاده می‌شود.</p>' : ''}
        </div>
      </article>`).join('')}
      ${preview.errors.length ? `<div class="delete-warning blocked"><b>خطا؛ این ردیف‌ها ساخته نمی‌شوند</b><ul class="compact">${preview.errors.map((row) => `<li>${escape(row.line)} — ${escape(row.message)}</li>`).join('')}</ul></div>` : ''}
      ${preview.warnings.length ? `<div class="delete-warning"><b>هشدار</b><ul class="compact">${preview.warnings.map((row) => `<li>${escape(row.line)} — ${escape(row.message)}</li>`).join('')}</ul></div>` : ''}
    </section>` : ''}
    <div class="wizard-actions">
      <button type="button" class="ghost" data-action="bulk-close">بازگشت به فهرست</button>
      ${step > 1 ? '<button type="button" class="secondary" data-action="bulk-prev">قبلی</button>' : ''}
      ${step < 4 ? '<button type="button" class="primary" data-action="bulk-next">بعدی</button>' : ''}
      ${step === 4 ? `<button type="button" class="primary" data-action="bulk-apply"${preview?.ready.length ? '' : ' disabled'}>ساخت پیش‌نویس‌های معتبر</button>` : ''}
    </div>
    ${bulkState.jobs.length ? `<section class="card form-card"><h2>تاریخچه بارگذاری</h2>
      <div class="sku-table">${bulkState.jobs.map((job) => `<article><div><b>${fa(job.created)} پیش‌نویس</b><small>${escape((job.codes || []).join('، '))} · ${new Date(job.at).toLocaleString('fa-IR')}</small></div><em>${fa(job.errors)} خطا</em></article>`).join('')}</div>
    </section>` : ''}
  </div>`;
}

function fileToThumb(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 240;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      const scale = Math.max(240 / image.width, 240 / image.height);
      const w = image.width * scale;
      const h = image.height * scale;
      ctx.drawImage(image, (240 - w) / 2, (240 - h) / 2, w, h);
      URL.revokeObjectURL(url);
      resolve({ name: file.name, src: canvas.toDataURL('image/jpeg', 0.72) });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ name: file.name, src: '' });
    };
    image.src = url;
  });
}

export function handleBulkClick(action, rerender) {
  if (action === 'bulk-open') { openBulkWizard(); rerender(); return true; }
  if (action === 'bulk-close') { closeBulkWizard(); rerender(); return true; }
  if (action === 'bulk-template') { downloadTemplate(); return true; }
  if (action === 'bulk-export') { downloadExisting(); return true; }
  if (action === 'bulk-sample') { fillSample(); rerender(); return true; }
  if (action === 'bulk-prev') {
    bulkState.step = Math.max(1, bulkState.step - 1);
    rerender();
    return true;
  }
  if (action === 'bulk-next') {
    if (bulkState.step === 3) {
      const rows = captureRows();
      bulkState.preview = validate(rows.products, rows.skus, bulkState.images);
      bulkState.preview.sampleRows = rows;
    }
    bulkState.step = Math.min(4, bulkState.step + 1);
    rerender();
    return true;
  }
  if (action === 'bulk-apply') {
    const error = applyPreview();
    if (error) return error;
    const first = bulkState.preview.ready[0];
    closeBulkWizard();
    return { toast: `${bulkState.jobs[0].created} پیش‌نویس ساخته شد`, productId: first?.id };
  }
  return false;
}

export async function handleBulkChange(target, rerender) {
  if (target.id === 'bulk-leaf') {
    bulkState.leafId = target.value;
    bulkState.preview = null;
    rerender();
    return true;
  }
  if (target.id === 'bulk-csv' && target.files?.[0]) {
    const file = target.files[0];
    if (file.name.endsWith('.xlsx')) {
      bulkState.toast = 'در این پروتوتایپ CSV را بارگذاری کن؛ قالب دانلودشده CSV است.';
      rerender();
      return true;
    }
    const text = await file.text();
    const book = splitWorkbook(text);
    const products = rowsToObjects(book.products, productFields(bulkState.leafId));
    const skus = rowsToObjects(book.skus.length ? book.skus : [], skuFields(bulkState.leafId));
    bulkState.preview = { sampleRows: { products, skus } };
    rerender();
    return true;
  }
  if (target.id === 'bulk-images' && target.files?.length) {
    const files = [...target.files];
    const thumbs = await Promise.all(files.map(fileToThumb));
    thumbs.forEach((item) => { bulkState.images[item.name.toLowerCase()] = item; });
    rerender();
    return true;
  }
  return false;
}
