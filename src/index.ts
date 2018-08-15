'use strict';

export const r2gSmokeTest = function () {
  // r2g command line app uses this exported function
  return true;
};

export const stringify = (v: object | boolean | number): string => {
  const cache = new Set<any>();
  return JSON.stringify(v, function (key, value) {
    if (value && typeof value === 'object') {
      if (cache.has(value)) {
        // Circular reference found, discard key
        return;
      }
      // Store value in our map
      cache.add(value);
    }
    return value;
  });
};

