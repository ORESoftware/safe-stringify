


const v = {
  toJSON(){
    return {foo:'bar'};
  }
};

const z = Object.create(v);

console.log('toJSON' in v);
console.log('toJSON' in z);

console.log(JSON.stringify(v));
console.log(JSON.stringify(z));
