'use strict';

export const r2gSmokeTest = function () {
  // r2g command line app uses this exported function
  return true;
};

export const stringify = (v: object | boolean | number): string => {
  const cache = new Set<any>();
  return JSON.stringify(v, function (key, val) {
    if (val && typeof val === 'object') {
      if (cache.has(val)) {
        // Circular reference found, discard key
        try {
          // If this value does not reference a parent it can be deduped
          return JSON.parse(JSON.stringify(val));
        }
        catch (err) {
          // discard key if value cannot be deduped
          return;
        }
      }
      // Store value in our map
      cache.add(val);
    }
    return val;
  });
};

const mapper = (cache: Set<any>, key: any, val: any): any => {

  if (val && typeof val === 'object') {

    if (cache.has(val)) {

      if (val instanceof Buffer) {
        return {
          type: 'Buffer',
          val: Array.from(<Buffer>val)
            .map((v, i) => mapper(cache, i, v))
        }
      }

      if (val instanceof Map) {
        return {
          type: 'Map',
          val: Array.from(<Map<any, any>>val)
            .map((v, i) => mapper(cache, i, v))
        }
      }

      if (val instanceof Set) {
        return {
          type: 'Set',
          val: Array.from(<Set<any>>val)
            .map((v, i) => mapper(cache, i, v))
        }
      }

      if (val instanceof RegExp) {
        return {
          type: 'RegExp',
          val: String(<RegExp>val)
        }
      }

      if (Array.isArray(val)) {
        return (<Array<any>>val)
          .map((v, i) => mapper(cache, i, v))
      }

      // Circular reference found, discard key
      try {
        // If this value does not reference a parent it can be deduped
        return JSON.parse(JSON.stringify(val));
      }
      catch (err) {
        // discard key if value cannot be deduped
        return;
      }
    }
    // Store value in our map
    cache.add(val);
  }

  return val;
};

export const stringifyAll = (v: object | boolean | number): string => {
  const cache = new Set<any>();
  return JSON.stringify(v, (key, val) => {
    return mapper(cache, key, val);
  });
};

const parentSym = Symbol('parent');
const cacheSym = Symbol('cache');

const copyInner = (parent: any, key: string, val: any, copyParent: any) => {

  if (!(val && typeof val === 'object')) {
    return copyParent[key] = val;
  }

  const cache = copyParent[cacheSym];

  // FIX: Wrap toJSON call in try-catch to handle malformed Date objects
  if (typeof val['toJSON'] === 'function') {
    try {
      val = val.toJSON();
    } catch (err) {
      // If toJSON fails, handle different object types appropriately
      if (val.constructor?.name?.includes('Date')) {
        // For malformed Date objects, try to convert to ISO string or fallback to null
        try {
          val = new Date(val).toISOString();
        } catch (dateErr) {
          val = null; // If even conversion fails, set to null
        }
      } else {
        // For other objects with broken toJSON, try to stringify directly or set to null
        try {
          val = JSON.parse(JSON.stringify(val));
        } catch (jsonErr) {
          val = null;
        }
      }
    }
  }

  if (cache.has(val)) {
    try {
      return copyParent[key] = JSON.parse(JSON.stringify(cache.get(val)));
    }
    catch (err) {
      return copyParent[key] = null;
    }
  }

  if (val === parent.__proto__) {
    return;
  }

  if (val === Object.getPrototypeOf(parent)) {
    return;
  }

  const copyVal: any = Array.isArray(val) ? [] : {};
  copyVal[parentSym] = copyParent;
  copyParent[key] = copyVal;

  cache.set(val, copyVal);
  copyVal[cacheSym] = new Map(cache);

  let keys: any = null;

  if (Array.isArray(val)) {
    keys = val.keys();
  }
  else {
    keys = Object.keys(val);
  }

  for (const k of keys) {
    copyInner(val, k, val[k], copyVal);
  }

};

const copyOuter = (val: any) => {

  if (!(val && typeof val === 'object')) {
    return val;
  }

  let copy: any = null, keys: any = null;

  // FIX: Wrap toJSON call in try-catch to handle malformed Date objects
  if (typeof val['toJSON'] === 'function') {
    try {
      val = val.toJSON();
    } catch (err) {
      // If toJSON fails, handle different object types appropriately
      if (val.constructor?.name?.includes('Date')) {
        // For malformed Date objects, try to convert to ISO string or fallback to null
        try {
          val = new Date(val).toISOString();
        } catch (dateErr) {
          val = null; // If even conversion fails, set to null
        }
      } else {
        // For other objects with broken toJSON, try to stringify directly or set to null
        try {
          val = JSON.parse(JSON.stringify(val));
        } catch (jsonErr) {
          val = null;
        }
      }
    }
  }

  if (Array.isArray(val)) {
    copy = [];
    keys = val.keys();
  }
  else {
    copy = {};
    keys = Object.keys(val);
  }

  copy[cacheSym] = new Map();

  for (const k of keys) {
    copyInner(val, k, val[k], copy);
  }

  return copy;

};

export const stringifyDeep = (v: object | boolean | number): string => {
  return JSON.stringify(copyOuter(v));
};
