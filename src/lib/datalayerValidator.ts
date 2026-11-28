import { GA4_ECOMMERCE_EVENTS } from '../data/tools';

/**
 * GA4 dataLayer validator — pure functions, no DOM, no network.
 * Parses what a visitor pastes (strict JSON, a dataLayer.push(...) call,
 * or a JS object literal) and checks each event against the GA4
 * ecommerce spec table in src/data/tools.ts.
 */

export type Severity = 'error' | 'warning' | 'note';

export interface Finding {
  severity: Severity;
  title: string;
  detail: string;
}

export interface EventReport {
  name: string;
  findings: Finding[];
}

export interface ValidationResult {
  parseError?: string;
  events: EventReport[];
  errors: number;
  warnings: number;
  notes: number;
}

function tolerantParse(raw: string): unknown {
  // Attempt 1: strict JSON.
  try {
    return JSON.parse(raw);
  } catch {
    /* fall through */
  }
  // Attempt 2: JS object literal — quote unquoted keys, single→double
  // quotes, drop trailing commas. Good enough for pasted push snippets;
  // if it still fails we say so honestly instead of guessing.
  const fixed = raw
    .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"')
    .replace(/([{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)\s*:/g, '$1"$2":')
    .replace(/,\s*([}\]])/g, '$1');
  return JSON.parse(fixed);
}

function extractEvents(input: string): unknown[] {
  let text = input.trim();
  const pushIdx = text.indexOf('dataLayer.push');
  if (pushIdx >= 0) {
    const start = text.indexOf('{', pushIdx);
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) text = text.slice(start, end + 1);
  }
  const parsed = tolerantParse(text);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    // A whole dataLayer array dump or a single event object.
    return [parsed];
  }
  throw new Error('not an object');
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function checkEvent(obj: unknown, index: number): EventReport {
  const findings: Finding[] = [];
  const err = (title: string, detail: string) => findings.push({ severity: 'error', title, detail });
  const warn = (title: string, detail: string) => findings.push({ severity: 'warning', title, detail });
  const note = (title: string, detail: string) => findings.push({ severity: 'note', title, detail });

  if (!isObj(obj)) {
    return { name: `Entry ${index + 1}`, findings: [{ severity: 'error', title: 'Not an event object', detail: 'Each dataLayer entry must be a JSON object.' }] };
  }

  // The famous reset push: { ecommerce: null } before a fresh event.
  if (obj.ecommerce === null) {
    return {
      name: typeof obj.event === 'string' ? obj.event : `Entry ${index + 1}`,
      findings: [{
        severity: 'note',
        title: 'This is the ecommerce reset push',
        detail: 'Pushing { ecommerce: null } clears the previous ecommerce object so values do not leak between events. It is correct practice — there is no event here to validate.',
      }],
    };
  }

  const name = typeof obj.event === 'string' ? obj.event : '';
  if (!name) {
    err('No event name', 'The object has no "event" property, so GTM has nothing to trigger on.');
    return { name: `Entry ${index + 1}`, findings };
  }

  const spec = GA4_ECOMMERCE_EVENTS.find((e) => e.name === name);
  const payload = isObj(obj.ecommerce) ? obj.ecommerce : null;

  if (!spec) {
    note('Custom event', `"${name}" is not one of GA4's ecommerce recommended events, so only its structure was checked. Custom events are legal — they just do not feed GA4's ecommerce reports.`);
  }

  if (spec && !payload) {
    // Some stacks put items at the top level; GA4's documented shape nests
    // them under "ecommerce".
    if (Array.isArray(obj.items)) {
      warn('Items sit outside the ecommerce object', 'GA4’s documented structure nests items, value and currency under "ecommerce". Top-level items are commonly missed by GA4 event tags.');
    } else {
      err('No ecommerce object', `The "${name}" event carries no "ecommerce" object — GA4 receives none of its items, value or currency.`);
    }
    return { name, findings };
  }

  if (!payload) return { name, findings };

  const items = payload.items;
  if (spec?.itemsRequired) {
    if (!Array.isArray(items) || items.length === 0) {
      err('Missing items', `GA4 requires a non-empty "items" array for ${name}. Without it the event reports no products at all.`);
    }
  }

  if (Array.isArray(items)) {
    let unnamed = 0;
    items.forEach((item, i) => {
      if (!isObj(item)) {
        err(`Item ${i + 1} is not an object`, 'Every entry in "items" must be an object with at least an item_id or item_name.');
        return;
      }
      if (!item.item_id && !item.item_name) unnamed += 1;
      if (item.price !== undefined && typeof item.price !== 'number') {
        warn(`Item ${i + 1}: price is not a number`, `price arrived as ${typeof item.price} (${JSON.stringify(item.price)}). GA4 expects a number — string prices are dropped or misreported.`);
      }
      if (item.quantity !== undefined && (typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity < 1)) {
        warn(`Item ${i + 1}: quantity looks wrong`, 'quantity should be a positive whole number.');
      }
    });
    if (unnamed > 0) {
      err(`${unnamed} item${unnamed > 1 ? 's have' : ' has'} neither item_id nor item_name`, 'GA4 cannot attribute revenue to a product it cannot identify.');
    }

    // Items sum vs declared value — the classic silent mismatch.
    const value = payload.value;
    if (typeof value === 'number' && items.every((it) => isObj(it) && typeof it.price === 'number')) {
      const sum = items.reduce((acc, it) => {
        const o = it as Record<string, unknown>;
        const q = typeof o.quantity === 'number' ? o.quantity : 1;
        return acc + (o.price as number) * q;
      }, 0);
      const extras = ['shipping', 'tax'].reduce((acc, k) => acc + (typeof payload[k] === 'number' ? (payload[k] as number) : 0), 0);
      const expected = sum + extras;
      if (Math.abs(expected - value) > Math.max(0.02, value * 0.01)) {
        warn('Items do not add up to value', `Item prices × quantities${extras ? ' plus shipping/tax' : ''} come to ${expected.toFixed(2)}, but "value" says ${value}. GA4 reports the value — make sure it is the one you mean.`);
      }
    }
  }

  if (spec?.transactionId === 'required') {
    const tid = payload.transaction_id;
    if (typeof tid !== 'string' || tid.trim() === '') {
      err('Missing transaction_id', `GA4 needs a transaction_id on ${name} — it is the key that stops the same order being counted twice.`);
    }
  }

  const value = payload.value;
  const currency = payload.currency;
  if (spec?.valueCurrency === 'required' || spec?.valueCurrency === 'recommended') {
    const push = spec.valueCurrency === 'required' ? err : warn;
    if (value === undefined) push('Missing value', `Without "value", GA4 counts the ${name} event but no revenue for it.`);
    if (currency === undefined) push('Missing currency', 'Without "currency", GA4 cannot place the revenue in the right currency reports.');
  }
  if (value !== undefined && typeof value !== 'number') {
    err('value is not a number', `value arrived as ${typeof value} (${JSON.stringify(value)}). GA4 expects a number — a string value is the single most common cause of missing revenue.`);
  }
  if (currency !== undefined && (typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency))) {
    warn('Currency code looks wrong', 'currency should be a 3-letter ISO 4217 code in capitals, e.g. "USD", "EUR", "BDT".');
  }

  const gtmKeys = Object.keys(obj).filter((k) => k.startsWith('gtm.') || k === 'eventCallback' || k === 'eventTimeout');
  if (gtmKeys.length > 0) {
    note('GTM internals present', `${gtmKeys.join(', ')} ${gtmKeys.length > 1 ? 'are' : 'is'} added by Google Tag Manager itself — harmless, and not something you need to send.`);
  }

  if (findings.length === 0) {
    findings.push({ severity: 'note', title: 'No problems found', detail: `This ${name} event carries everything the GA4 specification asks for.` });
  }
  return { name, findings };
}

export function validateDataLayer(input: string): ValidationResult {
  let raw: unknown[];
  try {
    raw = extractEvents(input);
  } catch {
    return {
      parseError:
        'That could not be read as JSON or a dataLayer.push(…) call. Paste the event object itself — for example { "event": "purchase", "ecommerce": { … } } — with double-quoted keys.',
      events: [],
      errors: 0,
      warnings: 0,
      notes: 0,
    };
  }

  const events = raw.map((obj, i) => checkEvent(obj, i));

  // Duplicate purchase transaction_ids across the whole paste.
  const seen = new Map<string, number>();
  raw.forEach((obj) => {
    if (isObj(obj) && obj.event === 'purchase' && isObj(obj.ecommerce)) {
      const tid = obj.ecommerce.transaction_id;
      if (typeof tid === 'string' && tid) seen.set(tid, (seen.get(tid) ?? 0) + 1);
    }
  });
  seen.forEach((count, tid) => {
    if (count > 1) {
      const target = events.find((e) => e.name === 'purchase');
      target?.findings.unshift({
        severity: 'error',
        title: 'Same transaction_id appears more than once',
        detail: `"${tid}" is pushed ${count} times in this paste. If that happens on the live site, GA4 and the ad platforms can double-count the order's revenue.`,
      });
    }
  });

  const totals = { errors: 0, warnings: 0, notes: 0 };
  events.forEach((e) =>
    e.findings.forEach((f) => {
      if (f.severity === 'error') totals.errors += 1;
      else if (f.severity === 'warning') totals.warnings += 1;
      else totals.notes += 1;
    }),
  );
  return { events, ...totals };
}
