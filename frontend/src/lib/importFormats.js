/** Column specs and behavior notes for fundraiser import/export */

export const ORDER_STATUSES = new Set([
  'pending', 'paid', 'fulfilled', 'delivered', 'refunded', 'cancelled',
]);

export function normalizeOrderStatus(raw) {
  const s = String(raw || '').trim().toLowerCase();
  return ORDER_STATUSES.has(s) ? s : 'pending';
}

/** Recover product/status when CSV rows skip empty Status/Referral columns. */
export function resolveOrderCsvFields({ statusRaw, productRaw, referralRaw, commentsRaw }) {
  let status = String(statusRaw || '').trim();
  let product = String(productRaw || '').trim();
  let referral = String(referralRaw || '').trim();
  let comments = String(commentsRaw || '').trim();
  let shifted = false;

  if (status && !ORDER_STATUSES.has(status.toLowerCase())) {
    if (!product) product = status;
    if (!comments && referral) comments = referral;
    referral = '';
    status = '';
    shifted = true;
  }

  return {
    status: normalizeOrderStatus(status),
    product: product || 'Imported',
    referralCode: referral || undefined,
    comments: comments || undefined,
    shifted,
  };
}

export const IMPORT_BEHAVIOR = {
  orders: 'Adds new orders only. Addresses are verified during import. Orders with unverified addresses are still imported and flagged for you to fix before routing.',
  vendors: 'Creates new vendor accounts. Rows with an email that already exists on this fundraiser are skipped. Password is required for each new vendor.',
  products: 'Creates new products or updates matching product names. Does not delete existing products.',
  drivers: 'Creates new driver routes. Existing driver codes are left unchanged.',
  fundraiser: 'Merges settings into this fundraiser. Does not delete any records.',
  json: 'Imports only the sections present in the file. Orders are always appended, never replaced.',
};

export const ORDERS_CSV = {
  filename: 'orders-template.csv',
  headers: ['Customer', 'Email', 'Phone', 'Address', '# of Product', 'Total', 'Status', 'Referral', 'Product', 'Comments'],
  example: ['Jane Smith', 'jane@email.com', '555-0100', '14508 Brookmead Dr, Darnestown, MD', '4', '32.00', 'paid', '', 'Natural Hardwood Mulch', 'Leave by garage'],
  required: ['Customer', 'Address'],
  optional: ['Email', 'Phone', '# of Product', 'Total', 'Status', 'Referral', 'Product', 'Comments'],
  notes: [
    'Header row required. Column names are case-insensitive.',
    'Customer and Address are required on every row. Email and Phone are optional.',
    'Bags accepts: Bags, Quantity, # of Product, or similar quantity columns.',
    'Product names in the sheet are created automatically if they do not exist yet (price from Total ÷ quantity).',
    'Status is optional (pending, paid, fulfilled, delivered, refunded, cancelled). Leave blank if unknown — do not put product names here.',
    'Referral is optional. Leave blank if the order was not referred by a vendor. If provided, it must match a vendor code on this fundraiser.',
    'Address: street number + street name, city, and state (ZIP optional). Example: 14508 Brookmead Dr, Darnestown, MD',
    'Addresses without a ZIP code are OK. Unverified addresses are imported with a warning — fix them in the Orders tab before generating routes.',
  ],
  aliases: {
    customer: ['customer', 'customername', 'name'],
    email: ['email', 'customeremail'],
    phone: ['phone', 'customerphone'],
    address: ['address', 'deliveryaddress', 'delivery address', 'street', 'street address'],
    bags: ['bags', 'totalbags', 'quantity', 'qty', 'of product', 'number of product', 'num of product', 'of bags', 'bags ordered'],
    total: ['total', 'totalamount', 'amount', 'order total', 'price'],
    status: ['status'],
    referral: ['referral', 'referralcode', 'referral code'],
    product: ['product', 'productname', 'item', 'product name'],
    comments: ['comments', 'notes', 'delivery notes', 'instructions'],
  },
};

export const VENDORS_CSV = {
  filename: 'vendors-template.csv',
  headers: ['Name', 'Email', 'Password', 'Referral Code'],
  example: ['Alex Johnson', 'alex@email.com', 'scout2025', 'AJ01'],
  required: ['Name', 'Email', 'Password'],
  optional: ['Referral Code'],
  notes: [
    'Header row required. Column names are case-insensitive.',
    'Name, Email, and Password are required for each new vendor.',
    'Share the password with the vendor so they can log in at routed.',
    'Referral Code is optional, Routed generates one if left blank.',
    'Existing vendors (same email) are skipped, not updated.',
    'Exported CSV leaves Password blank — passwords cannot be retrieved after creation.',
  ],
  aliases: {
    name: ['name', 'vendor', 'vendorname'],
    email: ['email'],
    password: ['password', 'pass', 'vendor password'],
    referral: ['referral', 'referralcode', 'referral code', 'code'],
  },
};

/** Normalize spreadsheet column headers for matching */
export function normalizeCsvHeader(h) {
  return String(h)
    .toLowerCase()
    .replace(/^"|"$/g, '')
    .replace(/#/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseCsvNumber(val, fallback = 0) {
  if (val === '' || val == null) return fallback;
  const n = Number(String(val).replace(/[$,\s]/g, '').trim());
  return Number.isFinite(n) ? n : fallback;
}

export function formatAddressValidationError(e) {
  const base = `Row ${e.row}${e.customerName ? ` (${e.customerName})` : ''}: ${e.message}`;
  if (!e.debug) return base;
  const parts = [`reason=${e.debug.reason}`];
  if (e.debug.queriesTried?.length) {
    parts.push(`tried=${e.debug.queriesTried.join(' | ')}`);
  }
  if (e.debug.regionHint) parts.push(`regionHint=${e.debug.regionHint}`);
  return `${base}\n  debug: ${parts.join(', ')}`;
}

export function formatApiDebug(data) {
  if (!data?.debug) return '';
  const text = typeof data.debug === 'string' ? data.debug : JSON.stringify(data.debug, null, 2);
  return `\n[debug]\n${text}`;
}

export function pickField(row, aliases) {
  for (const key of aliases) {
    if (row[key] !== undefined && row[key] !== '') return row[key];
  }
  return '';
}
