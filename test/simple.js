#!/usr/bin/env node

const cp = require('child_process');
const path  = require('path');
const fs  = require('fs');
const http  = require('http');
const assert  = require('assert');
const EE  = require('events');
const strm = require('stream');


const safe = require('../dist');

// const v = [{dog:'bark'}];
// v.z = '5';

const x = {dog:'bark'};
x.mmm = {'zebra': 3};
x.mmm = x;

const v = [x,x,x];
v.zzz = v;
v.foo = 5;
v.dog = 3;

const xxx = safe.stringify({bop: [{top:[v,v,v,[v,v,v]]}]});
const mmm = safe.stringifyDeep({bop:[{top:[v,v,v,[v,v,v]]}]});

console.log(xxx);
console.log(mmm);
// console.log(safe.stringify(mmm));
