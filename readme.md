
### ORESoftware / Safe Stringify


### Installation:

>
>```bash
> $ npm i -S '@oresoftware/safe-stringify'
>```
>

### For most objects (this is more performant)

```js

import * as safe from '@oresoftware/safe-stringify';
const s = safe.stringify({});

```


### For use with more complex deeply-nested objects with arrays:

```js
import * as safe from '@oresoftware/safe-stringify';
const s = safe.stringifyDeep([{}]);

```

For example the following works with `stringifyDeep` but not `stringify`:

```js

const x = {dog:'bark'};
x.mmm = {'zebra': 3};
x.mmm = x;

const v = [x,x,x];
v.zzz = v;
v.foo = 5;
v.dog = 3;

const mmm = safe.stringifyDeep([v,v,v]);
console.log(mmm);

```
