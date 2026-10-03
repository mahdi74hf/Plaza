export const STORAGE_KEY = 'plaza-category-tree-v1';

export const defaultTree = [
  { id: 'it', name: 'فناوری اطلاعات', type: 'Vertical', status: 'active', children: [
    { id: 'digital', name: 'کالای دیجیتال', type: 'Category', status: 'active', children: [
      { id: 'mobile', name: 'موبایل و تبلت', type: 'SubCategory', status: 'active', children: [
        { id: 'phone', name: 'گوشی موبایل', type: 'LeafCat', status: 'active' },
        { id: 'tablet', name: 'تبلت', type: 'LeafCat', status: 'active' },
      ]},
      { id: 'computer', name: 'لپ‌تاپ و کامپیوتر', type: 'SubCategory', status: 'active', children: [
        { id: 'laptop', name: 'لپ‌تاپ', type: 'LeafCat', status: 'active' },
      ]},
    ]},
    { id: 'network', name: 'تجهیزات شبکه', type: 'Category', status: 'active', children: [
      { id: 'router', name: 'مودم و روتر', type: 'LeafCat', status: 'active' },
    ]},
  ]},
  { id: 'home', name: 'خانه و آشپزخانه', type: 'Vertical', status: 'active', children: [
    { id: 'appliance', name: 'لوازم خانگی', type: 'Category', status: 'active', children: [
      { id: 'heating', name: 'لوازم گرمایشی', type: 'SubCategory', status: 'active', children: [
        { id: 'electric-heater', name: 'بخاری برقی', type: 'LeafCat', status: 'active' },
        { id: 'gas-heater', name: 'بخاری گازی', type: 'LeafCat', status: 'active' },
      ]},
    ]},
  ]},
];

export let tree = loadTree();

export function loadTree() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const data = saved ? JSON.parse(saved) : structuredClone(defaultTree);
    ensureShopDemoNodes(data);
    return data;
  } catch {
    return structuredClone(defaultTree);
  }
}

function ensureShopDemoNodes(nodes) {
  const home = nodes.find((node) => node.id === 'home');
  if (!home) return;
  home.children ||= [];
  let appliance = home.children.find((node) => node.id === 'appliance');
  if (!appliance) {
    appliance = { id: 'appliance', name: 'لوازم خانگی', type: 'Category', status: 'active', children: [] };
    home.children.push(appliance);
  }
  appliance.children ||= [];
  if (appliance.children.some((node) => node.id === 'heating')) return;
  appliance.children.push({
    id: 'heating',
    name: 'لوازم گرمایشی',
    type: 'SubCategory',
    status: 'active',
    children: [
      { id: 'electric-heater', name: 'بخاری برقی', type: 'LeafCat', status: 'active' },
      { id: 'gas-heater', name: 'بخاری گازی', type: 'LeafCat', status: 'active' },
    ],
  });
}

export function persistTree() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tree));
}

export function reloadTree() {
  tree = loadTree();
  return tree;
}

export function findNode(id, nodes = tree, parents = []) {
  for (const node of nodes) {
    if (node.id === id) return { node, parents };
    if (node.children) {
      const found = findNode(id, node.children, [...parents, node]);
      if (found) return found;
    }
  }
}

export function getSiblings(parentId) {
  if (!parentId) return tree;
  const parent = findNode(parentId)?.node;
  if (!parent.children) parent.children = [];
  return parent.children;
}

export function removeNode(id, nodes = tree) {
  const index = nodes.findIndex((node) => node.id === id);
  if (index >= 0) {
    nodes.splice(index, 1);
    return true;
  }
  return nodes.some((node) => node.children && removeNode(id, node.children));
}

export function countNodes(nodes = tree) {
  return nodes.reduce((sum, node) => sum + 1 + countNodes(node.children || []), 0);
}

export function countType(type, nodes = tree) {
  return nodes.reduce((sum, node) => sum + (node.type === type ? 1 : 0) + countType(type, node.children || []), 0);
}

export function countActiveType(type, nodes = tree) {
  return nodes.reduce((sum, node) => (
    sum + (node.type === type && node.status !== 'inactive' ? 1 : 0) + countActiveType(type, node.children || [])
  ), 0);
}

export function isActivePath(node, parents) {
  return node.status !== 'inactive' && parents.every((item) => item.status !== 'inactive');
}

export function walk(nodes = tree, parents = [], acc = []) {
  for (const node of nodes) {
    acc.push({ node, parents });
    if (node.children) walk(node.children, [...parents, node], acc);
  }
  return acc;
}

export function pathLabel(id) {
  const found = findNode(id);
  if (!found) return '';
  return [...found.parents, found.node].map((item) => item.name).join(' / ');
}

export function publicLeaves(underId) {
  return walk().filter(({ node, parents }) => {
    if (node.type !== 'LeafCat' || !isActivePath(node, parents)) return false;
    if (!underId || underId === node.id) return !underId || underId === node.id;
    return parents.some((item) => item.id === underId);
  });
}
