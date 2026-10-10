import { catalog, logChange, persistCatalog } from './catalog.js';
import { pathLabel, publicLeaves } from './tree.js';

const STORAGE_KEY = 'plaza-shop-layout-v5';

export const shopLandings = [
  { id: 'landing-black-friday', title: 'بلک فرایدی', status: 'published', slug: 'black-friday' },
  { id: 'landing-gaming', title: 'جشنواره گیمینگ', status: 'published', slug: 'gaming-festival' },
  { id: 'landing-new-arrivals', title: 'تازه‌رسیده‌ها', status: 'published', slug: 'new-arrivals' },
  { id: 'landing-heating', title: 'کمپین گرمایشی زمستان', status: 'published', slug: 'heating-winter' },
  { id: 'landing-draft', title: 'لندینگ پیش‌نویس', status: 'draft', slug: 'draft-landing' },
];

const seedLayout = {
  version: 5,
  status: 'draft',
  updatedAt: new Date().toISOString(),
  publishedAt: '',
  groups: [
    {
      id: 'group-heating',
      title: 'لوازم گرمایشی',
      description: 'انتخاب سریع براساس برند، مدل یا کمپین',
      destType: 'landing',
      nodeId: '',
      landingId: 'landing-heating',
      brandId: '',
      modelId: '',
      hidden: false,
      items: [
        {
          id: 'item-barfab',
          title: 'برفاب',
          destType: 'leaf',
          nodeId: 'electric-heater',
          landingId: '',
          brandId: 'barfab',
          modelId: '',
          hidden: false,
          children: [
            {
              id: 'item-barfab-electric',
              title: 'بخاری برقی برفاب',
              destType: 'leaf',
              nodeId: 'electric-heater',
              landingId: '',
              brandId: 'barfab',
              modelId: 'QH-3000',
              hidden: false,
            },
            {
              id: 'item-barfab-gas',
              title: 'بخاری گازی برفاب',
              destType: 'leaf',
              nodeId: 'gas-heater',
              landingId: '',
              brandId: 'barfab',
              modelId: 'BF-15',
              hidden: false,
            },
          ],
        },
        {
          id: 'item-energy',
          title: 'انرژی',
          destType: 'leaf',
          nodeId: 'gas-heater',
          landingId: '',
          brandId: 'energy',
          modelId: '',
          hidden: false,
          children: [
            {
              id: 'item-energy-gas',
              title: 'بخاری گازی انرژی',
              destType: 'leaf',
              nodeId: 'gas-heater',
              landingId: '',
              brandId: 'energy',
              modelId: 'GH-0618',
              hidden: false,
            },
          ],
        },
        {
          id: 'item-campaign',
          title: 'کمپین زمستانه',
          destType: 'landing',
          nodeId: '',
          landingId: 'landing-heating',
          brandId: '',
          modelId: '',
          hidden: false,
          children: [
            {
              id: 'item-black-friday',
              title: 'بلک فرایدی گرمایشی',
              destType: 'landing',
              nodeId: '',
              landingId: 'landing-black-friday',
              brandId: '',
              modelId: '',
              hidden: false,
            },
          ],
        },
      ],
    },
  ],
};

export const shopLayoutState = {
  data: loadLayout(),
  mode: 'editor',
  device: 'desktop',
  notice: '',
};

function emptyDestination() {
  return { destType: '', nodeId: '', landingId: '', brandId: '', modelId: '' };
}

function normalizeLink(item, required = false) {
  const next = {
    ...emptyDestination(),
    ...item,
    destType: item.destType || (item.nodeId ? 'leaf' : item.landingId ? 'landing' : required ? 'leaf' : ''),
    nodeId: item.nodeId || '',
    landingId: item.landingId || '',
    brandId: item.brandId || '',
    modelId: item.modelId || '',
    hidden: !!item.hidden,
  };
  if (next.destType === 'leaf') next.landingId = '';
  if (next.destType === 'landing') {
    next.nodeId = '';
    next.brandId = '';
    next.modelId = '';
  }
  if (!next.destType) {
    next.nodeId = '';
    next.landingId = '';
    next.brandId = '';
    next.modelId = '';
  }
  return next;
}

function normalizeGroup(group) {
  const next = {
    ...normalizeLink(group, false),
    id: group.id,
    title: group.title || '',
    description: group.description || '',
    items: (group.items || []).map((item) => ({
      ...normalizeLink(item, true),
      id: item.id,
      title: item.title || '',
      children: (item.children || []).map((child) => ({
        ...normalizeLink(child, true),
        id: child.id,
        title: child.title || '',
      })),
    })),
  };
  return next;
}

function loadLayout() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : structuredClone(seedLayout);
    return {
      ...data,
      groups: (data.groups || []).map(normalizeGroup),
    };
  } catch {
    return structuredClone(seedLayout);
  }
}

function persist() {
  shopLayoutState.data.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shopLayoutState.data));
}

function id(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

function escape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function activeLeaves() {
  return publicLeaves();
}

function fallbackLeaf() {
  return activeLeaves()[0]?.node.id || '';
}

function publishedLandings() {
  return shopLandings.filter((landing) => landing.status === 'published');
}

function fallbackLanding() {
  return publishedLandings()[0]?.id || '';
}

function findLanding(landingId) {
  return shopLandings.find((landing) => landing.id === landingId);
}

function brandName(brandId) {
  return catalog.brands.find((brand) => brand.id === brandId)?.name || brandId;
}

function modelsFor(nodeId, brandId) {
  const seen = new Map();
  catalog.products.forEach((product) => {
    if (!product.model || product.status !== 'published') return;
    if (nodeId && product.leafId !== nodeId) return;
    if (brandId && product.brandId !== brandId) return;
    if (!seen.has(product.model)) {
      seen.set(product.model, { id: product.model, title: product.title });
    }
  });
  return [...seen.values()];
}

function validLeaf(nodeId) {
  return activeLeaves().some(({ node }) => node.id === nodeId);
}

function validLanding(landingId) {
  return publishedLandings().some((landing) => landing.id === landingId);
}

function validModel(nodeId, brandId, modelId) {
  if (!modelId) return true;
  return modelsFor(nodeId, brandId).some((model) => model.id === modelId);
}

function validLink(item, required) {
  if (!item.destType) return !required;
  if (item.destType === 'leaf') {
    return validLeaf(item.nodeId) && validModel(item.nodeId, item.brandId, item.modelId);
  }
  if (item.destType === 'landing') return validLanding(item.landingId);
  return false;
}

function destTypeOptions(selected, required) {
  return `${required ? '' : '<option value="">بدون لینک</option>'}
    <option value="leaf" ${selected === 'leaf' ? 'selected' : ''}>LeafCat / PLP</option>
    <option value="landing" ${selected === 'landing' ? 'selected' : ''}>لندینگ منتشرشده</option>`;
}

function leafOptions(selected) {
  return activeLeaves().map(({ node }) => (
    `<option value="${node.id}" ${selected === node.id ? 'selected' : ''}>${escape(pathLabel(node.id))} · LeafCat</option>`
  )).join('');
}

function landingOptions(selected) {
  return publishedLandings().map((landing) => (
    `<option value="${landing.id}" ${selected === landing.id ? 'selected' : ''}>${escape(landing.title)}</option>`
  )).join('');
}

function brandOptions(selected) {
  return `<option value="">بدون Filter برند</option>${catalog.brands
    .filter((brand) => brand.status === 'active')
    .map((brand) => `<option value="${brand.id}" ${selected === brand.id ? 'selected' : ''}>${escape(brand.name)}</option>`)
    .join('')}`;
}

function modelOptions(selected, nodeId, brandId) {
  const models = modelsFor(nodeId, brandId);
  return `<option value="">بدون Filter مدل</option>${models
    .map((model) => `<option value="${escape(model.id)}" ${selected === model.id ? 'selected' : ''}>${escape(model.id)} · ${escape(model.title)}</option>`)
    .join('')}`;
}

function destinationLabel(item) {
  if (item.destType === 'landing') {
    const landing = findLanding(item.landingId);
    return landing ? `لندینگ · ${landing.title}` : 'لندینگ نامعتبر';
  }
  if (item.destType === 'leaf') {
    const filters = [
      item.brandId ? `برند ${brandName(item.brandId)}` : '',
      item.modelId ? `مدل ${item.modelId}` : '',
    ].filter(Boolean).join(' · ');
    return `${pathLabel(item.nodeId) || 'LeafCat نامعتبر'}${filters ? ` · ${filters}` : ''}`;
  }
  return 'بدون لینک';
}

function destinationKind(item) {
  if (item.destType === 'landing') return 'لندینگ';
  if (item.destType === 'leaf') return 'قابل‌کلیک · LeafCat';
  return 'بدون لینک';
}

function duplicateKey(item) {
  return [item.title.trim(), item.destType, item.nodeId, item.landingId, item.brandId || '', item.modelId || ''].join('|');
}

function validationErrors() {
  const errors = [];
  shopLayoutState.data.groups.forEach((group) => {
    if (!group.title.trim()) errors.push('عنوان یک Group خالی است.');
    if (group.destType && !validLink(group, false)) {
      errors.push(`مقصد سطح اول «${group.title || 'بدون عنوان'}» معتبر نیست.`);
    }
    const seen = new Set();
    group.items.forEach((item) => {
      const key = duplicateKey(item);
      if (seen.has(key)) errors.push(`Item تکراری در «${group.title}»: ${item.title}`);
      seen.add(key);
      if (!item.hidden && (!item.title.trim() || !validLink(item, true))) {
        errors.push(`مقصد سطح دوم «${item.title || 'بدون عنوان'}» معتبر نیست.`);
      }
      const childSeen = new Set();
      item.children.forEach((child) => {
        const childKey = duplicateKey(child);
        if (childSeen.has(childKey)) errors.push(`Item سطح سوم تکراری: ${child.title}`);
        childSeen.add(childKey);
        if (!child.hidden && (!child.title.trim() || !validLink(child, true))) {
          errors.push(`مقصد سطح سوم «${child.title || 'بدون عنوان'}» معتبر نیست.`);
        }
      });
    });
  });
  return errors;
}

function destinationFields(item, groupId, parentId = '', required = true) {
  const leaf = item.destType === 'leaf';
  const landing = item.destType === 'landing';
  const field = (name) => `data-shp-field="${name}" data-group="${groupId}" data-parent="${parentId}" data-id="${item.id}"`;
  return `
    <label class="field"><span>نوع مقصد</span><select ${field('destType')}>${destTypeOptions(item.destType, required)}</select></label>
    ${leaf ? `<label class="field"><span>LeafCat مقصد</span><select ${field('nodeId')}>${leafOptions(item.nodeId)}</select></label>
      <label class="field"><span>Filter برند</span><select ${field('brandId')}>${brandOptions(item.brandId)}</select></label>
      <label class="field"><span>Filter مدل</span><select ${field('modelId')}>${modelOptions(item.modelId, item.nodeId, item.brandId)}</select></label>` : ''}
    ${landing ? `<label class="field"><span>لندینگ منتشرشده</span><select ${field('landingId')}>${landingOptions(item.landingId)}</select></label>` : ''}
  `;
}

function linkEditor(item, level, groupId, parentId = '') {
  const invalid = !validLink(item, true);
  return `<article class="shop-layout-item level-${level} ${item.hidden ? 'is-hidden' : ''} ${invalid ? 'is-invalid' : ''}">
    <div class="shop-level-badge">سطح ${level}</div>
    <div class="shop-layout-fields ${item.destType === 'landing' ? 'is-landing' : 'is-leaf'}">
      <label class="field"><span>عنوان نمایشی</span><input data-shp-field="title" data-group="${groupId}" data-parent="${parentId}" data-id="${item.id}" value="${escape(item.title)}"/></label>
      ${destinationFields(item, groupId, parentId, true)}
    </div>
    <div class="shop-destination"><b>${invalid ? 'مقصد نامعتبر' : escape(destinationLabel(item))}</b></div>
    <div class="detail-actions">
      <button type="button" class="action-button" data-action="shp-move-up" data-group="${groupId}" data-parent="${parentId}" data-id="${item.id}">↑</button>
      <button type="button" class="action-button" data-action="shp-move-down" data-group="${groupId}" data-parent="${parentId}" data-id="${item.id}">↓</button>
      <button type="button" class="action-button" data-action="shp-toggle-item" data-group="${groupId}" data-parent="${parentId}" data-id="${item.id}">${item.hidden ? 'نمایش' : 'مخفی'}</button>
      <button type="button" class="action-button danger" data-action="shp-delete-item" data-group="${groupId}" data-parent="${parentId}" data-id="${item.id}">حذف</button>
    </div>
    ${level === 2 ? `<div class="shop-layout-children">
      ${item.children.map((child) => linkEditor(child, 3, groupId, item.id)).join('')}
      <button type="button" class="secondary" data-action="shp-add-level3" data-group="${groupId}" data-parent="${item.id}">+ افزودن عنوان سطح سوم</button>
    </div>` : ''}
  </article>`;
}

function editorView() {
  return `<div class="shop-layout-editor">
    <div class="demo-callout">
      <div><b>ساختار سه‌سطحی PRD-055 · v0.5</b><p>سطح اول می‌تواند بدون لینک باشد یا به LeafCat / لندینگ منتشرشده وصل شود. سطح دوم و سوم همیشه یکی از این دو مقصد را دارند. Filter برند و مدل فقط برای مقصد LeafCat فعال است. لندینگ‌ساز در فاز بعد اضافه می‌شود.</p></div>
      <div class="demo-callout-actions">
        <button type="button" class="secondary" data-action="shp-preview">Preview</button>
        <button type="button" class="primary" data-action="shp-publish">انتشار نسخه</button>
      </div>
    </div>
    ${shopLayoutState.notice ? `<div class="validation-box">${escape(shopLayoutState.notice)}</div>` : ''}
    ${shopLayoutState.data.groups.map((group, index) => `<section class="card shop-layout-group ${group.hidden ? 'is-hidden' : ''}">
      <header>
        <div><span class="type-pill">سطح ۱ · ${destinationKind(group)}</span><h2>${escape(group.title || 'Group بدون عنوان')}</h2><p>${escape(group.description || '')}</p></div>
        <div class="detail-actions">
          <button type="button" class="action-button" data-action="shp-group-up" data-group="${group.id}" ${index === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" class="action-button" data-action="shp-group-down" data-group="${group.id}">↓</button>
          <button type="button" class="action-button" data-action="shp-toggle-group" data-group="${group.id}">${group.hidden ? 'نمایش' : 'مخفی'}</button>
          <button type="button" class="action-button danger" data-action="shp-delete-group" data-group="${group.id}">حذف</button>
        </div>
      </header>
      <div class="shop-layout-fields group-fields ${group.destType === 'landing' ? 'is-landing' : group.destType === 'leaf' ? 'is-leaf' : 'is-empty'}">
        <label class="field"><span>عنوان Group</span><input data-shp-group-field="title" data-group="${group.id}" value="${escape(group.title)}"/></label>
        <label class="field"><span>توضیح اختیاری</span><input data-shp-group-field="description" data-group="${group.id}" value="${escape(group.description)}"/></label>
        <label class="field"><span>نوع مقصد</span><select data-shp-group-field="destType" data-group="${group.id}">${destTypeOptions(group.destType, false)}</select></label>
        ${group.destType === 'leaf' ? `<label class="field"><span>LeafCat مقصد</span><select data-shp-group-field="nodeId" data-group="${group.id}">${leafOptions(group.nodeId)}</select></label>
          <label class="field"><span>Filter برند</span><select data-shp-group-field="brandId" data-group="${group.id}">${brandOptions(group.brandId)}</select></label>
          <label class="field"><span>Filter مدل</span><select data-shp-group-field="modelId" data-group="${group.id}">${modelOptions(group.modelId, group.nodeId, group.brandId)}</select></label>` : ''}
        ${group.destType === 'landing' ? `<label class="field"><span>لندینگ منتشرشده</span><select data-shp-group-field="landingId" data-group="${group.id}">${landingOptions(group.landingId)}</select></label>` : ''}
      </div>
      <div class="shop-no-link-note">${group.destType && validLink(group, false)
        ? `این Group قابل‌کلیک است؛ مقصد: <b>${escape(destinationLabel(group))}</b>`
        : 'بدون مقصد، این سطح فقط عنوان Group است و قابل‌کلیک نیست.'}</div>
      <div class="shop-layout-level2">${group.items.map((item) => linkEditor(item, 2, group.id)).join('')}</div>
      <button type="button" class="secondary" data-action="shp-add-level2" data-group="${group.id}">+ افزودن Item سطح دوم</button>
    </section>`).join('')}
    <button type="button" class="primary" data-action="shp-add-group">+ Group سطح اول جدید</button>
  </div>`;
}

function previewAttrs(item) {
  return `data-action="shp-preview-destination" data-dest-type="${item.destType || ''}" data-node="${item.nodeId || ''}" data-landing="${item.landingId || ''}" data-destination-brand="${item.brandId || ''}" data-destination-model="${escape(item.modelId || '')}"`;
}

function previewView() {
  const groups = shopLayoutState.data.groups.filter((group) => !group.hidden && group.items.some((item) => !item.hidden && validLink(item, true)));
  return `<div class="shop-layout-preview-shell ${shopLayoutState.device}">
    <div class="toolbar">
      <button type="button" class="secondary" data-action="shp-editor">بازگشت به ویرایش</button>
      <button type="button" class="${shopLayoutState.device === 'desktop' ? 'primary' : 'secondary'}" data-action="shp-device" data-device="desktop">Desktop</button>
      <button type="button" class="${shopLayoutState.device === 'mobile' ? 'primary' : 'secondary'}" data-action="shp-device" data-device="mobile">Mobile</button>
    </div>
    ${shopLayoutState.notice ? `<div class="validation-box">${escape(shopLayoutState.notice)}</div>` : ''}
    <div class="shop-customer-preview">
      ${groups.length ? groups.map((group) => `<section class="shop-customer-group">
        <header>
          ${group.destType && validLink(group, false)
            ? `<button type="button" class="shop-level1-link" ${previewAttrs(group)}>${escape(group.title)} <span>←</span></button>`
            : `<h2>${escape(group.title)}</h2>`}
          ${group.description ? `<p>${escape(group.description)}</p>` : ''}
          <span>${group.destType && validLink(group, false) ? escape(destinationLabel(group)) : 'عنوان غیرقابل‌کلیک'}</span>
        </header>
        <div class="shop-customer-columns">
          ${group.items.filter((item) => !item.hidden && validLink(item, true)).map((item) => `<article>
            <button type="button" class="shop-level2-link" ${previewAttrs(item)}>${escape(item.title)}</button>
            <small class="shop-preview-path">${escape(destinationLabel(item))}</small>
            <div>${item.children.filter((child) => !child.hidden && validLink(child, true)).map((child) => `<button type="button" class="shop-preview-destination" ${previewAttrs(child)}><b>${escape(child.title)}</b><small>${escape(destinationLabel(child))}</small></button>`).join('')}</div>
          </article>`).join('')}
        </div>
        <p class="hint">مقصد LeafCat به PLP همان دسته با Filter برند و مدل می‌رود. مقصد لندینگ صفحه کمپین منتشرشده را باز می‌کند.</p>
      </section>`).join('') : '<div class="empty-panel"><b>Group قابل‌نمایشی وجود ندارد</b><p>حداقل یک Item معتبر سطح دوم اضافه کن.</p></div>'}
    </div>
  </div>`;
}

export function shopLayoutView() {
  return `<section class="crawler-shell">
    <div class="stats">
      <div><span>نسخه Draft</span><b>${shopLayoutState.data.version}</b></div>
      <div><span>Group سطح اول</span><b>${shopLayoutState.data.groups.length}</b></div>
      <div><span>وضعیت</span><b>${shopLayoutState.data.status === 'published' ? 'Published' : 'Draft'}</b></div>
      <div><span>خطای اعتبارسنجی</span><b>${validationErrors().length}</b></div>
    </div>
    ${shopLayoutState.mode === 'preview' ? previewView() : editorView()}
  </section>`;
}

function locate(groupId, parentId, itemId) {
  const group = shopLayoutState.data.groups.find((entry) => entry.id === groupId);
  if (!group) return {};
  if (!parentId) {
    const item = group.items.find((entry) => entry.id === itemId);
    return { group, list: group.items, item };
  }
  const parent = group.items.find((entry) => entry.id === parentId);
  const item = parent?.children.find((entry) => entry.id === itemId);
  return { group, parent, list: parent?.children, item };
}

function move(list, itemId, direction) {
  const index = list?.findIndex((item) => item.id === itemId) ?? -1;
  const next = index + direction;
  if (index < 0 || next < 0 || next >= list.length) return;
  [list[index], list[next]] = [list[next], list[index]];
}

function applyDestinationDefaults(target) {
  if (target.destType === 'leaf') {
    target.landingId = '';
    target.nodeId = validLeaf(target.nodeId) ? target.nodeId : fallbackLeaf();
    if (!validModel(target.nodeId, target.brandId, target.modelId)) target.modelId = '';
  } else if (target.destType === 'landing') {
    target.nodeId = '';
    target.brandId = '';
    target.modelId = '';
    target.landingId = validLanding(target.landingId) ? target.landingId : fallbackLanding();
  } else {
    Object.assign(target, emptyDestination(), { destType: '' });
  }
}

function createLink(title, required) {
  const item = { id: id(required ? 'item' : 'group'), title, hidden: false, ...emptyDestination(), destType: required ? 'leaf' : '' };
  applyDestinationDefaults(item);
  return item;
}

function clickNotice(host) {
  if (host.dataset.destType === 'landing') {
    const landing = findLanding(host.dataset.landing);
    shopLayoutState.notice = `کلیک ثبت شد؛ مقصد لندینگ: ${landing?.title || 'نامعتبر'}`;
    return;
  }
  const brand = host.dataset.destinationBrand ? brandName(host.dataset.destinationBrand) : '';
  const model = host.dataset.destinationModel || '';
  shopLayoutState.notice = `کلیک ثبت شد؛ مقصد PLP: ${pathLabel(host.dataset.node)}${brand ? ` · برند ${brand}` : ''}${model ? ` · مدل ${model}` : ''}`;
}

export function handleShopLayoutClick(action, host, rerender) {
  if (!action?.startsWith('shp-')) return false;
  const { group, list, item } = locate(host.dataset.group, host.dataset.parent, host.dataset.id);

  if (action === 'shp-preview') shopLayoutState.mode = 'preview';
  if (action === 'shp-editor') shopLayoutState.mode = 'editor';
  if (action === 'shp-device') shopLayoutState.device = host.dataset.device;
  if (action === 'shp-preview-destination') clickNotice(host);
  if (action === 'shp-add-group') {
    shopLayoutState.data.groups.push({ ...createLink('Group جدید', false), description: '', items: [] });
  }
  if (action === 'shp-delete-group') shopLayoutState.data.groups = shopLayoutState.data.groups.filter((entry) => entry.id !== host.dataset.group);
  if (action === 'shp-toggle-group' && group) group.hidden = !group.hidden;
  if (action === 'shp-group-up' || action === 'shp-group-down') move(shopLayoutState.data.groups, host.dataset.group, action.endsWith('up') ? -1 : 1);
  if (action === 'shp-add-level2' && group) {
    group.items.push({ ...createLink('Item سطح دوم', true), children: [] });
  }
  if (action === 'shp-add-level3' && group) {
    const parent = group.items.find((entry) => entry.id === host.dataset.parent);
    parent?.children.push(createLink('عنوان سطح سوم', true));
  }
  if (action === 'shp-delete-item' && list) list.splice(list.findIndex((entry) => entry.id === item?.id), 1);
  if (action === 'shp-toggle-item' && item) item.hidden = !item.hidden;
  if ((action === 'shp-move-up' || action === 'shp-move-down') && list) move(list, host.dataset.id, action.endsWith('up') ? -1 : 1);
  if (action === 'shp-publish') {
    const errors = validationErrors();
    if (errors.length) {
      shopLayoutState.notice = `انتشار متوقف شد: ${errors.join(' | ')}`;
    } else {
      shopLayoutState.data.status = 'published';
      shopLayoutState.data.version += 1;
      shopLayoutState.data.publishedAt = new Date().toISOString();
      shopLayoutState.notice = `نسخه ${shopLayoutState.data.version} منتشر شد؛ مقصد LeafCat و لندینگ‌های هر سه سطح معتبر هستند.`;
      logChange(`انتشار Shop Layout نسخه ${shopLayoutState.data.version}`);
      persistCatalog();
    }
  }
  persist();
  rerender();
  return true;
}

export function handleShopLayoutChange(target, rerender) {
  if (target.dataset.shpGroupField) {
    const group = shopLayoutState.data.groups.find((entry) => entry.id === target.dataset.group);
    if (group) {
      group[target.dataset.shpGroupField] = target.value;
      if (['destType', 'nodeId', 'brandId'].includes(target.dataset.shpGroupField)) applyDestinationDefaults(group);
    }
  } else if (target.dataset.shpField) {
    const { item } = locate(target.dataset.group, target.dataset.parent, target.dataset.id);
    if (item) {
      item[target.dataset.shpField] = target.value;
      if (['destType', 'nodeId', 'brandId'].includes(target.dataset.shpField)) applyDestinationDefaults(item);
    }
  } else {
    return false;
  }
  shopLayoutState.data.status = 'draft';
  shopLayoutState.notice = '';
  persist();
  rerender();
  return true;
}
