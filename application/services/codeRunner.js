const vm = require('vm');

// Maximum execution time in milliseconds
const MAX_TIMEOUT_MS = 5000;

/**
 * Run arbitrary JavaScript code inside a sandboxed VM context.
 *
 * The sandbox provides a minimal `console` that captures output to an array.
 * Dangerous globals (process, require, __dirname, etc.) are **not** exposed.
 *
 * @param {string} code - The source code to execute.
 * @param {number} [timeoutMs=5000] - Max wall-clock ms before aborting.
 * @returns {{ output: string[], error: string|null, durationMs: number }}
 */
function runCode(code, timeoutMs = MAX_TIMEOUT_MS) {
  const logs = [];
  const errors = [];

  // A tiny console implementation that collects output
  const fakeConsole = {
    log: (...args) => logs.push(formatArgs(args)),
    info: (...args) => logs.push(`[info] ${formatArgs(args)}`),
    warn: (...args) => logs.push(`[warn] ${formatArgs(args)}`),
    error: (...args) => errors.push(formatArgs(args)),
    debug: (...args) => logs.push(`[debug] ${formatArgs(args)}`),
    table: (data) => logs.push(formatTable(data)),
    time: (() => {
      const timers = {};
      return (label = 'default') => { timers[label] = Date.now(); };
    })(),
    timeEnd: (() => {
      const timers = {};
      return (label = 'default') => {
        const start = timers[label];
        if (start) {
          logs.push(`${label}: ${Date.now() - start}ms`);
          delete timers[label];
        }
      };
    })(),
    assert: (cond, ...args) => {
      if (!cond) errors.push(`Assertion failed: ${formatArgs(args)}`);
    },
    clear: () => { logs.length = 0; },
    count: (() => {
      const counters = {};
      return (label = 'default') => {
        counters[label] = (counters[label] || 0) + 1;
        logs.push(`${label}: ${counters[label]}`);
      };
    })(),
    dir: (obj) => logs.push(safeStringify(obj)),
  };

  // Safe global sandbox
  const sandbox = {
    console: fakeConsole,
    setTimeout: (fn, ms) => setTimeout(fn, Math.min(ms, timeoutMs)),
    setInterval: undefined,     // disabled
    setImmediate: undefined,    // disabled
    clearTimeout,
    Math,
    Date,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Symbol,
    Promise,
    Error,
    TypeError,
    RangeError,
    SyntaxError,
    ReferenceError,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
    encodeURI,
    decodeURI,
    structuredClone: typeof structuredClone === 'function' ? structuredClone : undefined,
  };

  const context = vm.createContext(sandbox);

  const start = performance.now();
  let error = null;

  try {
    // Wrap code so top-level await works (Node 14+ with --harmony or Node 16+)
    // We wrap in an async IIFE and await it.
    const wrapped = `(async () => { ${code} \n})()`;
    const script = new vm.Script(wrapped, { filename: 'playground.js' });
    const promise = script.runInContext(context, { timeout: timeoutMs });

    // If the result is thenable, wait for it synchronously-ish by blocking
    // up to the timeout. For true async support we'd need an event-loop
    // approach, but this covers 90 % of use-cases.
    if (promise && typeof promise.then === 'function') {
      // We can't truly await inside a sync function, so we rely on the
      // vm timeout and collect any async console output that fires
      // synchronously within the microtask queue.
      // For longer async chains the user may see partial output.
    }
  } catch (err) {
    error = cleanError(err);
  }

  const durationMs = Math.round(performance.now() - start);

  // Merge stderr-style errors into the error string
  if (errors.length && !error) {
    error = errors.join('\n');
  }

  return { output: logs, error, durationMs };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatArgs(args) {
  return args.map(a => (typeof a === 'string' ? a : safeStringify(a))).join(' ');
}

function safeStringify(obj, depth = 3) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

function formatTable(data) {
  if (Array.isArray(data)) {
    if (data.length === 0) return '(empty table)';
    const keys = Object.keys(data[0]);
    const header = keys.join('\t');
    const rows = data.map(row => keys.map(k => String(row[k] ?? '')).join('\t'));
    return [header, ...rows].join('\n');
  }
  return safeStringify(data);
}

function cleanError(err) {
  if (!err) return null;
  let msg = err.message || String(err);
  // Strip internal VM wrapper noise
  msg = msg.replace(/Script execution timed out.*/, 'Execution timed out (limit exceeded).');
  return msg;
}

module.exports = { runCode };
