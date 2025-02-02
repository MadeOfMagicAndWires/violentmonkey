import { initHooks, debounce, normalizeKeys } from '#/common';
import { objectGet, objectSet } from '#/common/object';
import { register } from './init';

const defaults = {
  isApplied: true,
  autoUpdate: true,
  // ignoreGrant: false,
  lastUpdate: 0,
  lastModified: 0,
  showBadge: 'unique', // '' | 'unique' | 'total'
  exportValues: true,
  closeAfterInstall: false,
  trackLocalFile: false,
  autoReload: false,
  features: null,
  blacklist: null,
  syncScriptStatus: true,
  sync: null,
  customCSS: null,
  importSettings: true,
  notifyUpdates: false,
  version: null,
  defaultInjectInto: 'page', // 'page' | 'auto',
  filters: {
    sort: 'exec',
  },
  editor: {
    lineWrapping: false,
    indentUnit: 2,
  },
  scriptTemplate: `\
// ==UserScript==
// @name        New script {{name}}
// @namespace   Violentmonkey Scripts
// @match       {{url}}
// @grant       none
// @version     1.0
// @author      -
// @description {{date}}
// ==/UserScript==
`,
  // Enables automatic updates to the default template with new versions of VM
  /** @type {?Boolean} this must be |null| for template-hook.js upgrade routine */
  scriptTemplateEdited: null,
};
let changes = {};
const hooks = initHooks();
const callHooksLater = debounce(callHooks, 100);

let options = {};
let ready = false;
const init = browser.storage.local.get('options')
.then(({ options: data }) => {
  if (data && typeof data === 'object') options = data;
  if (process.env.DEBUG) {
    console.log('options:', options); // eslint-disable-line no-console
  }
  if (!objectGet(options, 'version')) {
    setOption('version', 1);
  }
})
.then(() => {
  ready = true;
});
register(init);

function fireChange(keys, value) {
  objectSet(changes, keys, value);
  callHooksLater();
}

function callHooks() {
  hooks.fire(changes);
  changes = {};
}

export function getOption(key, def) {
  const keys = normalizeKeys(key);
  const mainKey = keys[0];
  let value = options[mainKey];
  if (value == null) value = defaults[mainKey];
  if (value == null) value = def;
  return keys.length > 1 ? objectGet(value, keys.slice(1), def) : value;
}

export function getDefaultOption(key) {
  return objectGet(defaults, key);
}

export function setOption(key, value) {
  if (!ready) {
    init.then(() => {
      setOption(key, value);
    });
    return;
  }
  const keys = normalizeKeys(key);
  const optionKey = keys.join('.');
  let optionValue = value;
  const mainKey = keys[0];
  if (mainKey in defaults) {
    if (keys.length > 1) {
      optionValue = objectSet(getOption(mainKey), keys.slice(1), value);
    }
    options[mainKey] = optionValue;
    browser.storage.local.set({ options });
    fireChange(keys, value);
    if (process.env.DEBUG) {
      console.log('Options updated:', optionKey, value, options); // eslint-disable-line no-console
    }
  }
}

export function getAllOptions() {
  return Object.keys(defaults).reduce((res, key) => {
    res[key] = getOption(key);
    return res;
  }, {});
}

export const hookOptions = hooks.hook;
