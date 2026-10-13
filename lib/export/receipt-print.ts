import { Gym, Payment } from '@/types/database';
import { escapeHtml } from '@/lib/ui/escape';
import { formatDisplayDate } from '@/lib/ui/date';
import { getPaymentMemberName } from '@/lib/ui/format';

interface ReceiptOptions {
  payment: Payment;
  gym: Gym | null;
  gymName: string;
  currency: string;
  /** Membership end date after this payment, when it's a member's payment. */
  validUntil?: string;
}

// What the receipt says about the payment's state; only verified/completed payments read as paid.
function statusLabel(payment: Payment): { text: string; color: string } {
  if (payment.payment_status === 'refunded') return { text: 'Refunded', color: '#b91c1c' };
  if (payment.receipt_status === 'rejected') return { text: 'Rejected — not paid', color: '#b91c1c' };
  if (payment.payment_status === 'completed') return { text: 'Paid', color: '#047857' };
  return { text: 'Pending verification', color: '#b45309' };
}

export function buildReceiptHtml({ payment, gym, gymName, currency, validUntil }: ReceiptOptions): string {
  const status = statusLabel(payment);
  const amount = `${currency}${Number(payment.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const receiptNo = payment.id.replace(/-/g, '').slice(0, 8).toUpperCase();
  const contact = [gym?.phone, gym?.email].filter(Boolean).join(' · ');

  const rows: [string, string][] = [
    ['Receipt No.', receiptNo],
    ['Date', formatDisplayDate(payment.payment_date)],
    ['Received from', getPaymentMemberName(payment)],
    ['For', payment.is_walk_in ? 'Walk-in (day pass)' : payment.plan?.name || payment.member?.plan?.name || 'Membership'],
    ...(validUntil && !payment.is_walk_in ? ([['Valid until', formatDisplayDate(validUntil)]] as [string, string][]) : []),
    ['Payment method', payment.payment_method],
    ...(payment.reference_number ? ([['GCash Ref No.', payment.reference_number]] as [string, string][]) : []),
    ...(payment.verified_by && payment.receipt_status === 'verified'
      ? ([['Received by', payment.verified_by]] as [string, string][])
      : []),
  ];

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Receipt ${escapeHtml(receiptNo)} · ${escapeHtml(gymName)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; background: #f1f5f9; }
  .receipt { max-width: 420px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px 28px 22px; }
  .head { text-align: center; padding-bottom: 18px; border-bottom: 1px dashed #cbd5e1; }
  .logo { width: 56px; height: 56px; border-radius: 12px; object-fit: cover; margin-bottom: 10px; }
  .gym { font-size: 18px; font-weight: 700; margin: 0; }
  .line { font-size: 12px; color: #64748b; margin: 3px 0 0; }
  .title { margin: 18px 0 4px; text-align: center; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; color: #64748b; text-transform: uppercase; }
  .amount { text-align: center; font-size: 30px; font-weight: 800; margin: 0; }
  .status { text-align: center; font-size: 13px; font-weight: 700; margin: 4px 0 18px; color: ${status.color}; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  td { padding: 7px 0; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  td:first-child { color: #64748b; padding-right: 12px; white-space: nowrap; }
  td:last-child { text-align: right; font-weight: 600; word-break: break-word; }
  .notes { font-size: 12px; color: #475569; margin: 14px 0 0; }
  .foot { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 20px; line-height: 1.5; }
  @media print {
    body { background: #fff; padding: 0; }
    .receipt { border: none; border-radius: 0; max-width: none; padding: 0; }
  }
</style>
</head>
<body>
  <div class="receipt">
    <div class="head">
      ${gym?.logo_url ? `<img class="logo" src="${escapeHtml(gym.logo_url)}" alt="">` : ''}
      <p class="gym">${escapeHtml(gymName)}</p>
      ${gym?.address ? `<p class="line">${escapeHtml(gym.address)}</p>` : ''}
      ${contact ? `<p class="line">${escapeHtml(contact)}</p>` : ''}
    </div>
    <p class="title">Payment Receipt</p>
    <p class="amount">${escapeHtml(amount)}</p>
    <p class="status">${escapeHtml(status.text)}</p>
    <table>
      ${rows.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join('')}
    </table>
    ${payment.notes ? `<p class="notes">Notes: ${escapeHtml(payment.notes)}</p>` : ''}
    <p class="foot">Thank you! Keep this receipt for your records.<br>Acknowledgement receipt only · not a BIR official receipt.</p>
  </div>
</body>
</html>`;
}

/**
 * Opens the receipt in its own window and shows the print dialog, so only the receipt is printed.
 * Returns false when the browser blocked the window.
 */
export function printReceipt(options: ReceiptOptions): boolean {
  const win = window.open('', '_blank', 'width=520,height=760');
  if (!win) return false;
  win.document.open();
  win.document.write(buildReceiptHtml(options));
  win.document.close();
  // Wait for the logo to load so it appears on the printout.
  const print = () => {
    win.focus();
    win.print();
  };
  const logo = win.document.querySelector('img');
  if (logo && !logo.complete) {
    logo.addEventListener('load', print, { once: true });
    logo.addEventListener('error', print, { once: true });
  } else {
    win.setTimeout(print, 50);
  }
  return true;
}
