const sum = require('./reverse-proxy')
//const randomLoadBalancer = require('./reverse-proxy')
/*
describe('sum function', () => {
  it('sums up two integers', () => {
    expect(sum(1, 2)).toEqual(3);
  });
});
*/

describe('rand', () => {
    it('random', () => {
      expect(sum(1,2)).toEqual('http://127.0.0.1:9091');
    });
  });
  

