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
    if (copyParent) {
      return copyParent[key] = val;
    }
    return;
  }
  
  const cache = copyParent[cacheSym];
  
  if (cache && cache.has(val)) {
    return copyParent[key] = JSON.parse(JSON.stringify(cache.get(val)));
  }
  
  const copyVal: any = Array.isArray(val) ? [] : {};
  copyVal[parentSym] = copyParent;
  copyParent[key] = copyVal;
  
  
  if (cache) {
    // console.log({cache});
    cache.set(val, copyVal);
    copyVal[cacheSym] = new Map(Array.from(cache));
  }
  else {
    copyVal[cacheSym] = new Map();
  }
  
  let keys : any = null;
  
  if(Array.isArray(val)){
    keys = val.keys();
  }
  else{
    keys = Object.keys(val);
  }
  
  
  for (const k of keys) {
    copyInner(val, k, val[k], copyVal);
  }
  
};


const copyOuter = (val: any) => {
  
  if(!(val && typeof val === 'object')){
    return val;
  }
  
  let copy: any = null, keys : any = null;
  
  if(Array.isArray(val)){
    copy = []; keys = val.keys();
  }
  else{
    copy = {}; keys = Object.keys(val);
  }
  
  for(const k of keys){
    copyInner(val, k, val[k], copy);
  }
  
  return copy;
  
};


export const stringifyDeep = (v: object | boolean | number): string => {
  return JSON.stringify(copyOuter(v));
};
