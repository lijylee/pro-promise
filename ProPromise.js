const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

class ProPromise {
  status = PENDING;
  value = undefined;
  reason = undefined;
  successCbs = [];
  failCbs = [];
  constructor(executor) {
    try {
      executor(this.resolve, this.reject);
    } catch (error) {
      this.reject(error);
    }
  }

  resolve = value => {
    this.status = FULFILLED;
    this.value = value;
    while (this.successCbs.length) {
      this.successCbs.shift()();
    }
  };

  reject = reason => {
    this.status = REJECTED;
    this.reason = reason;
    while (this.failCbs.length) {
      this.failCbs.shift()();
    }
  };

  then(successCb, failCb) {
    successCb = successCb ? successCb : value => value;
    failCb = failCb ? failCb : reason => { throw reason; };

    const chainPromise = new ProPromise((resolve, reject) => {
      if (this.status === FULFILLED) {
        setTimeout(() => {
          try {
            let result = successCb(this.value);
            invokePromiseChain(chainPromise, result, resolve, reject);
          } catch (error) {
            reject(error);
          }
        }, 0);
        return;
      }
      if (this.status === REJECTED) {
        setTimeout(() => {
          try {
            let result = failCb(this.reason);
            invokePromiseChain(chainPromise, result, resolve, reject);
          } catch (error) {
            reject(error);
          }
        }, 0);
        return;
      }
      this.successCbs.push(() => {
        setTimeout(() => {
          try {
            let result = successCb(this.value);
            invokePromiseChain(chainPromise, result, resolve, reject);
          } catch (error) {
            reject(error);
          }
        }, 0);
      });
      this.failCbs.push(() => {
        setTimeout(() => {
          try {
            let result = failCb(this.reason);
            invokePromiseChain(chainPromise, result, resolve, reject);
          } catch (error) {
            reject(error);
          }
        }, 0);
      });
    });
    return chainPromise;
  }

  finally(cb) {
    return this.then(value => {
      return ProPromise.resolve(cb()).then(() => value);
    }, reason => {
      return ProPromise.resolve(cb()).then(() => { throw reason; });
    });
  }

  catch(failCb) {
    return this.then(undefined, failCb);
  }

  static all(arr) {
    const result = [];
    let index = 0;
    const allPromise = new ProPromise((resolve, reject) => {
      function addData(i, value) {
        result[i] = value;
        index++;
        if (index === arr.length) {
          resolve(result);
        }
      }
      arr.forEach((p, i) => {
        if (p instanceof ProPromise) {
          p.then(value => {
            addData(i, value);
          }, reason => {
            reject(reason);
          });
        } else {
          addData(i, p);
        }
      });
    });
    return allPromise;
  }

  static resolve(value) {
    if (value instanceof ProPromise) {
      return value;
    }
    return new ProPromise(resolve => resolve(value));
  }

}

function invokePromiseChain(chainPromise, result, resolve, reject) {
  if (chainPromise === result) { return reject(new TypeError('Chaining cycle detected for promise #<Promise>')); }
  if (result instanceof ProPromise) {
    result.then(resolve, reject);
  } else {
    resolve(result);
  }
}

module.exports = ProPromise;