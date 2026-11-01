// All in-game text comes from ko.json / en.json. t('a.b.c', {param}) ; arrays/objects are returned as-is.
import ko from './ko.json';
import en from './en.json';

const DICTS = { ko, en };
let lang = 'ko';
const listeners = new Set();
const get = (o, path) => path.split('.').reduce((a, k) => (a != null && a[k] !== undefined ? a[k] : undefined), o);

export function t(key, params) {
  let v = get(DICTS[lang], key);
  if (v === undefined) v = get(DICTS.ko, key);
  if (v === undefined) return key;
  if (typeof v === 'string' && params) v = v.replace(/\{(\w+)\}/g, (_, k) => (params[k] ?? ''));
  return v;
}
export function initI18n(l) { lang = DICTS[l] ? l : 'ko'; document.documentElement.lang = lang; document.title = t('meta.title'); }
export function setLang(l) {
  if (!DICTS[l] || l === lang) return;
  lang = l; document.documentElement.lang = l; document.title = t('meta.title');
  applyDom(); listeners.forEach((f) => f(l));
}
export const getLang = () => lang;
export function onLang(f) { listeners.add(f); return () => listeners.delete(f); }
export function applyDom(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
}
