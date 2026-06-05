class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 5;
    this.cooldownMs = options.cooldownMs || 30000;
    this.successThreshold = options.successThreshold || 2;
    this.timeoutMs = options.timeoutMs || 10000;
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.metrics = { failures: 0, successes: 0, rejects: 0, timeouts: 0 };
  }

  getState() { return this.state; }

  getMetrics() {
    return { ...this.metrics, state: this.state, failures: this.failures, successes: this.successes };
  }

  reset() {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.metrics = { failures: 0, successes: 0, rejects: 0, timeouts: 0 };
  }

  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.cooldownMs) {
        this.state = 'HALF_OPEN';
      } else {
        this.metrics.rejects++;
        const err = new Error(`Circuit breaker '${this.name}' is OPEN`);
        err.name = 'CircuitBreakerOpenError';
        throw err;
      }
    }

    try {
      const result = await Promise.race([
        fn(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), this.timeoutMs))
      ]);
      this.onSuccess();
      return result;
    } catch (err) {
      if (err.message === 'Timeout') this.metrics.timeouts++;
      this.onFailure();
      throw err;
    }
  }

  onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.successThreshold) {
        this.state = 'CLOSED';
        this.failures = 0;
        this.successes = 0;
      }
    }
    this.metrics.successes++;
  }

  onFailure() {
    this.failures++;
    this.metrics.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.successes = 0;
    }
  }
}

module.exports = { CircuitBreaker };
