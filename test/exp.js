
const safe = require('@oresoftware/safe-stringify');

const v = {foo:'bar'};
v.mmm = {zoom:2};
v.mmm.x = v;

const safeStringify = function(o){
  const cache = [];
  return JSON.stringify(o, function(key, value) {
    if (typeof value === 'object' && value !== null) {
      if (cache.indexOf(value) !== -1) {
        // Duplicate reference found
        try {
          // If this value does not reference a parent it can be deduped
          return JSON.parse(JSON.stringify(value));
        } catch (error) {
          // discard key if value cannot be deduped
          return;
        }
      }
      // Store value in our collection
      cache.push(value);
    }
    return value;
  });
};


console.log(safeStringify([v,v,v]));
console.log(safe.stringify([v,v,v]));
console.log(safe.stringifyDeep([v,v,v]));
