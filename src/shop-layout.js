import { catalog, logChange, persistCatalog } from './catalog.js';
import { findNode, isActivePath, pathLabel, walk } from './tree.js';

const STORAGE_KEY = 'plaza-shop-layout-v3';

const seedLayout = {
  version: 3,
  status: 'draft',
  updatedAt: new Date().toISOString(),
  publishedAt: '',
  groups: [
    {
      id: 'group-heating',
      title: 'لوازم گرمایشی',
      description: 'انتخاب سریع براساس برند یا نوع محصول',
      hidden: false,
      items: [
        {
          id: 'item-barfab',
          title: 'برفاب',
          nodeId: 'heating',
          brandId: 'barfab',
          hidden: false,
          children: [
            { id: 'item-barfab-electric', title: 'بخاری برقی برفاب', nodeId: 'electric-heater', brandId: 'barfab', hidden: false },
            { id: 'item-barfab-gas', title: 'بخاری گازی برفاب', nodeId: 'gas-heater', brandId: 'barfab', hidden: false },
          ],
        },
        {
          id: 'item-energy',
          title: 'انرژی',
          nodeId: 'gas-heater',
          brandId: 'energy',
          hidden: false,
          children: [
            { id: 'item-energy-gas', title: 'بخاری گازی انرژی', nodeId: 'gas-heater', brandId: 'energy', hidden: false },
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

function loadLayout() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : structuredClone(seedLayout);
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

function activeDestinations() {
  return walk().filter(({ node, parents }) => (
    node.type !== 'Vertical' && isActivePath(node, parents)
  ));
}

function validDestination(nodeId) {
  const found = findNode(nodeId);
  return !!found && found.node.type !== 'Vertical' && isActivePath(found.node, found.parents);
}

function destinationOptions(selected) {
  return activeDestinations().map(({ node }) => (
    `<option value="${node.id}" ${selected === node.id ? 'selected' : ''}>${escape(pathLabel(node.id))} · ${node.type}</option>`
  )).join('');
}

function brandOptions(selected) {
  return `<option value="">بدون Filter برند</option>${catalog.brands
    .filter((brand) => brand.status === 'active')
    .map((brand) => `<option value="${brand.id}" ${selected === brand.id ? 'selected' : ''}>${escape(brand.name)}</option>`)
    .join('')}`;
}

function validationErrors() {
  const errors = [];
  shopLayoutState.data.groups.forEach((group) => {
    if (!group.title.trim()) errors.push('عنوان یک Group خالی است.');
    const seen = new Set();
    group.items.forEach((item) => {
      const key = `${item.title.trim()}|${item.nodeId}|${item.brandId || ''}`;
      if (seen.has(key)) errors.push(`Item تکراری در «${group.title}»: ${item.title}`);
      seen.add(key);
      if (!item.hidden && (!item.title.trim() || !validDestination(item.nodeId))) {
        errors.push(`مقصد سطح دوم «${item.title || 'بدون عنوان'}» معتبر نیست.`);
      }
      const childSeen = new Set();
      item.children.forEach((child) => {
        const childKey = `${child.title.trim()}|${child.nodeId}|${child.brandId || ''}`;
        if (childSeen.has(childKey)) errors.push(`Item سطح سوم تکراری: ${child.title}`);
        childSeen.add(childKey);
        if (!child.hidden && (!child.title.trim() || !validDestination(child.nodeId))) {
          errors.push(`مقصد سطح سوم «${child.title || 'بدون عنوان'}» معتبر نیست.`);
        }
      });
    });
  });
  return errors;
}

function linkEditor(item, level, groupId, parentId = '') {
  const invalid = !validDestination(item.nodeId);
  return `<article class="shop-layout-item level-${level} ${item.hidden ? 'is-hidden' : ''} ${invalid ? 'is-invalid' : ''}">
    <div class="shop-level-badge">سطح ${level}</div>
    <div class="shop-layout-fields">
      <label class="field"><span>عنوان نمایشی</span><input data-shp-field="title" data-group="${groupId}" data-parent="${parentId}" data-id="${item.id}" value="${escape(item.title)}"/></label>
      <label class="field"><span>مقصد PLP از CAT Tree</span><select data-shp-field="nodeId" data-group="${groupId}" data-parent="${parentId}" data-id="${item.id}">${destinationOptions(item.nodeId)}</select></label>
      <label class="field"><span>Filter برند اختیاری</span><select data-shp-field="brandId" data-group="${groupId}" data-parent="${parentId}" data-id="${item.id}">${brandOptions(item.brandId)}</select></label>
    </div>
    <div class="shop-destination"><b>${invalid ? 'مقصد نامعتبر' : escape(pathLabel(item.nodeId))}</b><small>${item.brandId ? ` · برند ${escape(catalog.brands.find((brand) => brand.id === item.brandId)?.name || item.brandId)}` : ''}</small></div>
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
      <div><b>ساختار سه‌سطحی PRD-055</b><p>سطح اول فقط عنوان Group است و لینک ندارد. سطح دوم و سوم به PLP ساخته‌شده از CAT Tree و Filter اختیاری هدایت می‌شوند.</p></div>
      <div class="demo-callout-actions">
        <button type="button" class="secondary" data-action="shp-preview">Preview</button>
        <button type="button" class="primary" data-action="shp-publish">انتشار نسخه</button>
      </div>
    </div>
    ${shopLayoutState.notice ? `<div class="validation-box">${escape(shopLayoutState.notice)}</div>` : ''}
    ${shopLayoutState.data.groups.map((group, index) => `<section class="card shop-layout-group ${group.hidden ? 'is-hidden' : ''}">
      <header>
        <div><span class="type-pill">سطح ۱ · بدون لینک</span><h2>${escape(group.title || 'Group بدون عنوان')}</h2><p>${escape(group.description || '')}</p></div>
        <div class="detail-actions">
          <button type="button" class="action-button" data-action="shp-group-up" data-group="${group.id}" ${index === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" class="action-button" data-action="shp-group-down" data-group="${group.id}">↓</button>
          <button type="button" class="action-button" data-action="shp-toggle-group" data-group="${group.id}">${group.hidden ? 'نمایش' : 'مخفی'}</button>
          <button type="button" class="action-button danger" data-action="shp-delete-group" data-group="${group.id}">حذف</button>
        </div>
      </header>
      <div class="shop-layout-fields group-fields">
        <label class="field"><span>عنوان Group</span><input data-shp-group-field="title" data-group="${group.id}" value="${escape(group.title)}"/></label>
        <label class="field"><span>توضیح اختیاری</span><input data-shp-group-field="description" data-group="${group.id}" value="${escape(group.description)}"/></label>
      </div>
      <div class="shop-no-link-note">این سطح عمداً Destination ندارد و در Shop قابل کلیک نیست.</div>
      <div class="shop-layout-level2">${group.items.map((item) => linkEditor(item, 2, group.id)).join('')}</div>
      <button type="button" class="secondary" data-action="shp-add-level2" data-group="${group.id}">+ افزودن Item سطح دوم</button>
    </section>`).join('')}
    <button type="button" class="primary" data-action="shp-add-group">+ Group سطح اول جدید</button>
  </div>`;
}

function previewView() {
  const groups = shopLayoutState.data.groups.filter((group) => !group.hidden && group.items.some((item) => !item.hidden && validDestination(item.nodeId)));
  return `<div class="shop-layout-preview-shell ${shopLayoutState.device}">
    <div class="toolbar">
      <button type="button" class="secondary" data-action="shp-editor">بازگشت به ویرایش</button>
      <button type="button" class="${shopLayoutState.device === 'desktop' ? 'primary' : 'secondary'}" data-action="shp-device" data-device="desktop">Desktop</button>
      <button type="button" class="${shopLayoutState.device === 'mobile' ? 'primary' : 'secondary'}" data-action="shp-device" data-device="mobile">Mobile</button>
    </div>
    <div class="shop-customer-preview">
      ${groups.length ? groups.map((group) => `<section class="shop-customer-group">
        <header><h2>${escape(group.title)}</h2>${group.description ? `<p>${escape(group.description)}</p>` : ''}<span>عنوان غیرقابل‌کلیک</span></header>
        <div class="shop-customer-columns">
          ${group.items.filter((item) => !item.hidden && validDestination(item.nodeId)).map((item) => `<article>
            <div class="shop-level2-link">${escape(item.title)}</div>
            <small class="shop-preview-path">مقصد: ${escape(pathLabel(item.nodeId))}${item.brandId ? ` · برند ${escape(catalog.brands.find((brand) => brand.id === item.brandId)?.name || item.brandId)}` : ''}</small>
            <div>${item.children.filter((child) => !child.hidden && validDestination(child.nodeId)).map((child) => `<div class="shop-preview-destination"><b>${escape(child.title)}</b><small>${escape(pathLabel(child.nodeId))}${child.brandId ? ` · برند ${escape(catalog.brands.find((brand) => brand.id === child.brandId)?.name || child.brandId)}` : ''}</small></div>`).join('')}</div>
          </article>`).join('')}
        </div>
        <p class="hint">در محصول نهایی سطح دوم و سوم به PLP مقصد هدایت می‌شوند؛ شبیه‌سازی مستقل PLP از این Prototype حذف شده است.</p>
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

export function handleShopLayoutClick(action, host, rerender) {
  if (!action?.startsWith('shp-')) return false;
  const { group, list, item } = locate(host.dataset.group, host.dataset.parent, host.dataset.id);
  const fallbackNode = activeDestinations()[0]?.node.id || '';

  if (action === 'shp-preview') shopLayoutState.mode = 'preview';
  if (action === 'shp-editor') shopLayoutState.mode = 'editor';
  if (action === 'shp-device') shopLayoutState.device = host.dataset.device;
  if (action === 'shp-add-group') {
    shopLayoutState.data.groups.push({ id: id('group'), title: 'Group جدید', description: '', hidden: false, items: [] });
  }
  if (action === 'shp-delete-group') shopLayoutState.data.groups = shopLayoutState.data.groups.filter((entry) => entry.id !== host.dataset.group);
  if (action === 'shp-toggle-group' && group) group.hidden = !group.hidden;
  if (action === 'shp-group-up' || action === 'shp-group-down') move(shopLayoutState.data.groups, host.dataset.group, action.endsWith('up') ? -1 : 1);
  if (action === 'shp-add-level2' && group) {
    group.items.push({ id: id('item'), title: 'Item سطح دوم', nodeId: fallbackNode, brandId: '', hidden: false, children: [] });
  }
  if (action === 'shp-add-level3' && group) {
    const parent = group.items.find((entry) => entry.id === host.dataset.parent);
    parent?.children.push({ id: id('child'), title: 'عنوان سطح سوم', nodeId: fallbackNode, brandId: '', hidden: false });
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
      shopLayoutState.notice = `نسخه ${shopLayoutState.data.version} منتشر شد؛ سطح اول بدون لینک و مقصدهای سطح دوم/سوم معتبر هستند.`;
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
    if (group) group[target.dataset.shpGroupField] = target.value;
  } else if (target.dataset.shpField) {
    const { item } = locate(target.dataset.group, target.dataset.parent, target.dataset.id);
    if (item) item[target.dataset.shpField] = target.value;
  } else {
    return false;
  }
  shopLayoutState.data.status = 'draft';
  shopLayoutState.notice = '';
  persist();
  rerender();
  return true;
}
