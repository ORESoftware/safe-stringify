
class HasMapAndSet {
  
  constructor(){
    this.map = new Map([['one',1], ['two',2]]);
    this.set = new Set([1,2,3]);
  }
   
  toJSON(){
    return {
      map: Array.from(this.map),
      set: Array.from(this.set)
    }
  }
  
}



console.log(JSON.stringify(new HasMapAndSet()));
