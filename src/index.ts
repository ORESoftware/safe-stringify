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

const parentSym = Symbol('parent');
const cacheSym = Symbol('cache');

const copyInner = (parent: any, key: string, val: any, copyParent: any) => {
  
  if (!(val && typeof val === 'object')) {
      return copyParent[key] = val;
  }
  
  const cache = copyParent[cacheSym];
  
  try{
    val = val.toJSON();
  }
  catch(err){
    // ignore
  }
  
  if (cache.has(val)) {
    try {
      return copyParent[key] = JSON.parse(JSON.stringify(cache.get(val)));
    }
    catch (err) {
      return copyParent[key] = null;
    }
  }
  
  if(val === parent.__proto__){
    return;
  }
  
  if(val === Object.getPrototypeOf(parent)){
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
  
  try{
    val = val.toJSON();
  }
  catch(err){
    // ignore
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
