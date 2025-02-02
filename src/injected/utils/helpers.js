// cache native properties to avoid being overridden, see violentmonkey/violentmonkey#151
// Firefox sucks: `isFinite` is not defined on `window`, see violentmonkey/violentmonkey#300
// eslint-disable-next-line no-restricted-properties
export const {
  // types
  Blob, Boolean, Error, Promise, Uint8Array,
  // props and methods
  atob, console, isFinite, setTimeout,
} = global;

export const {
  filter, forEach, includes, indexOf, join, map, push,
  // arraySlice, // to differentiate from String::slice which we use much more often
} = Array.prototype;

export const { keys: objectKeys, defineProperty, defineProperties } = Object;
export const { charCodeAt, match, slice } = String.prototype;
export const { toString: objectToString } = Object.prototype;
const { toString: numberToString } = Number.prototype;
const { replace } = String.prototype;
export const { fromCharCode } = String;
export const { warn } = console;
export const { addEventListener } = EventTarget.prototype;
export const { append, setAttribute } = Element.prototype;
export const { createElement } = Document.prototype;

export const isArray = obj => (
  // ES3 way, not reliable if prototype is modified
  // Object.prototype.toString.call(obj) === '[object Array]'
  // #565 steamcommunity.com has overridden `Array.prototype`
  // support duck typing
  obj && typeof obj.length === 'number' && typeof obj.splice === 'function'
);

export function noop() {}

/**
 * http://www.webtoolkit.info/javascript-utf8.html
 */
export function utf8decode(utftext) {
  /* eslint-disable no-bitwise */
  let string = '';
  let i = 0;
  let c1 = 0;
  let c2 = 0;
  let c3 = 0;
  while (i < utftext.length) {
    c1 = utftext::charCodeAt(i);
    if (c1 < 128) {
      string += fromCharCode(c1);
      i += 1;
    } else if (c1 > 191 && c1 < 224) {
      c2 = utftext::charCodeAt(i + 1);
      string += fromCharCode(((c1 & 31) << 6) | (c2 & 63));
      i += 2;
    } else {
      c2 = utftext::charCodeAt(i + 1);
      c3 = utftext::charCodeAt(i + 2);
      string += fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
      i += 3;
    }
  }
  return string;
  /* eslint-enable no-bitwise */
}

// Reference: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/JSON#Polyfill
const escMap = {
  '"': '\\"',
  '\\': '\\\\',
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
};
const escRE = /[\\"\u0000-\u001F\u2028\u2029]/g; // eslint-disable-line no-control-regex
const escFunc = m => escMap[m] || `\\u${(m::charCodeAt(0) + 0x10000)::numberToString(16)::slice(1)}`;
export const jsonLoad = JSON.parse;
let jsonDumpFunction = jsonDumpSafe;
// When running in the page context we must beware of sites that override Array#toJSON
// leading to an invalid result, which is why our jsonDumpSafe() ignores toJSON.
// Thus, we use the native JSON.stringify() only in the content script context and only until
// a userscript is injected into this context (due to `@inject-into` and/or a CSP problem).
export function setJsonDump({ native }) {
  jsonDumpFunction = native ? JSON.stringify : jsonDumpSafe;
}
export function jsonDump(value) {
  return jsonDumpFunction(value);
}
function jsonDumpSafe(value) {
  if (value == null) return 'null';
  const type = typeof value;
  if (type === 'number') return isFinite(value) ? `${value}` : 'null';
  if (type === 'boolean') return `${value}`;
  if (type === 'object') {
    if (isArray(value)) {
      return `[${value::map(jsonDumpSafe)::join(',')}]`;
    }
    if (value::objectToString() === '[object Object]') {
      const res = objectKeys(value)::map((key) => {
        const v = value[key];
        return v !== undefined && `${jsonDumpSafe(key)}:${jsonDumpSafe(v)}`;
      });
      // JSON.stringify skips undefined in objects i.e. {foo: undefined} produces {}
      return `{${res::filter(Boolean)::join(',')}}`;
    }
  }
  return `"${value::replace(escRE, escFunc)}"`;
}
