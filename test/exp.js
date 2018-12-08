

const x = [1,2,3];
x.foo = 5;

// console.log(JSON.stringify(v));
//
// console.log(Object.keys(v));


// console.log(JSON.stringify(Array.from(new Set(v))));

const v = {foo:'bar'};
console.log(JSON.stringify([v,v,v]));


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
