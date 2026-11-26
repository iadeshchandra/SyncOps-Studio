import { orderRef, paidTotal, type Order } from './portal';
import type { PaymentSettings } from './payments';

function esc(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function usd(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dateStr(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Opens a print-ready invoice in a new window (Save as PDF from the print
 * dialog). Built entirely from the order's own ledger — the same numbers
 * the client sees in the portal.
 */
export function openInvoice(order: Order, agreed: number, settings?: PaymentSettings | null): void {
  const ref = orderRef(order);
  const paid = paidTotal(order);
  const balance = Math.max(0, agreed - paid);
  const payments = order.payments ?? [];
  const payRows = payments.length
    ? payments
        .map(
          (p) => `<tr>
            <td>${dateStr(p.at)}</td>
            <td>${esc(p.method)}${p.note ? ` — ${esc(p.note)}` : ''}</td>
            <td class="r">${usd(p.amount)}</td>
          </tr>`,
        )
        .join('')
    : '<tr><td colspan="3" class="muted">No payments recorded yet.</td></tr>';

  const payDetails: string[] = [];
  if (settings?.bkashNumber) {
    payDetails.push(`bKash Send Money (Bangla QR): ${esc(settings.bkashNumber)}`);
  }
  if (settings?.wiseNote) payDetails.push(`Wise: ${esc(settings.wiseNote)}`);
  if (settings?.payoneerNote) payDetails.push(`Payoneer: ${esc(settings.payoneerNote)}`);

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Invoice ${esc(ref)} — SyncOps Studio</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #111; margin: 48px; }
  h1 { font-size: 28px; margin: 0; letter-spacing: -0.01em; }
  .brand { color: #047857; font-weight: bold; font-size: 15px; letter-spacing: 0.08em; text-transform: uppercase; }
  .muted { color: #666; }
  .grid { display: flex; justify-content: space-between; gap: 32px; margin-top: 28px; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 14px; }
  th, td { border-bottom: 1px solid #ddd; padding: 9px 6px; text-align: left; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #666; }
  td.r, th.r { text-align: right; }
  .totals { margin-top: 18px; margin-left: auto; width: 280px; font-size: 14px; }
  .totals div { display: flex; justify-content: space-between; padding: 5px 6px; }
  .totals .due { border-top: 2px solid #111; font-weight: bold; font-size: 16px; }
  .pay { margin-top: 36px; font-size: 13px; border: 1px solid #ddd; padding: 14px 16px; }
  .foot { margin-top: 40px; font-size: 12px; color: #666; }
  @media print { body { margin: 24px; } }
</style>
</head>
<body>
  <p class="brand">SyncOps Studio</p>
  <h1>Invoice ${esc(ref.replace('SO-', 'INV-'))}</h1>
  <p class="muted">Order reference ${esc(ref)} · Issued ${dateStr(Date.now())}</p>

  <div class="grid">
    <div>
      <p class="muted" style="margin:0 0 4px">Billed to</p>
      <p style="margin:0"><strong>${esc(order.clientName)}</strong><br/>
      ${esc(order.clientEmail)}<br/>${esc(order.brandUrl)}</p>
    </div>
    <div>
      <p class="muted" style="margin:0 0 4px">Service</p>
      <p style="margin:0">${esc(order.packageName || order.packageId)}<br/>
      Server-side tracking &amp; Conversions API infrastructure</p>
    </div>
  </div>

  <table>
    <thead><tr><th>Description</th><th class="r">Amount</th></tr></thead>
    <tbody>
      <tr><td>${esc(order.packageName || order.packageId)} — fixed package</td><td class="r">${usd(agreed)}</td></tr>
    </tbody>
  </table>

  <table>
    <thead><tr><th>Payment date</th><th>Method / reference</th><th class="r">Received</th></tr></thead>
    <tbody>${payRows}</tbody>
  </table>

  <div class="totals">
    <div><span>Package total</span><span>${usd(agreed)}</span></div>
    <div><span>Total received</span><span>${usd(paid)}</span></div>
    <div class="due"><span>Balance due</span><span>${usd(balance)}</span></div>
  </div>

  ${
    balance > 0 && payDetails.length
      ? `<div class="pay"><strong>How to pay the balance</strong><br/>${payDetails.join('<br/>')}<br/>
         <span class="muted">After paying, submit the transaction ID in your client portal — the studio verifies it and credits your ledger.</span></div>`
      : ''
  }

  <p class="foot">SyncOps Studio · iadeshchandra@gmail.com · syncopsstudio.web.app<br/>
  Payments are made directly to the studio; this invoice is generated from the order's payment ledger.</p>
  <script>window.addEventListener('load', () => setTimeout(() => window.print(), 250));</script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=900,height=1100');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
