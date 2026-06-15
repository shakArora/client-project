/** Column specs and behavior notes for fundraiser import/export */

export const IMPORT_BEHAVIOR = {
  orders: 'Adds new orders only. Existing orders are never modified or deleted. Duplicate rows (same email + address + bags) are skipped.',
  vendors: 'Creates new vendor accounts. Rows with an email that already exists on this fundraiser are skipped.',
  products: 'Creates new products or updates matching product names. Does not delete existing products.',
  drivers: 'Creates new driver routes. Existing driver codes are left unchanged.',
  fundraiser: 'Merges settings into this fundraiser. Does not delete any records.',
  json: 'Imports only the sections present in the file. Orders are always appended, never replaced.',
};

export const ORDERS_CSV = {
  filename: 'orders-template.csv',
  headers: ['Customer', 'Email', 'Phone', 'Address', 'Bags', 'Total', 'Status', 'Referral', 'Product', 'Comments'],
  example: ['Jane Smith', 'jane@email.com', '555-0100', '123 Oak St, Springfield, IL 62701', '4', '32.00', 'paid', 'ABCD', 'Hardwood Mulch', 'Leave by garage'],
  required: ['Customer', 'Address'],
  optional: ['Email', 'Phone', 'Bags', 'Total', 'Status', 'Referral', 'Product', 'Comments'],
  notes: [
    'Header row required. Column names are case-insensitive.',
    'Customer and Address are required on every row.',
    'Product should match an existing product name (e.g. Hardwood Mulch). If blank, Routed uses your first active product.',
    'Status: pending, paid, fulfilled, delivered, refunded, or cancelled. Defaults to pending.',
    'Referral must match a vendor code on this fundraiser to credit the sale.',
    'Addresses are stored as entered. Geocoding runs later when routes are generated.',
  ],
  aliases: {
    customer: ['customer', 'customername', 'name'],
    email: ['email', 'customeremail'],
    phone: ['phone', 'customerphone'],
    address: ['address', 'deliveryaddress', 'delivery address'],
    bags: ['bags', 'totalbags', 'quantity'],
    total: ['total', 'totalamount', 'amount'],
    status: ['status'],
    referral: ['referral', 'referralcode', 'referral code', 'code'],
    product: ['product', 'productname', 'item'],
    comments: ['comments', 'notes'],
  },
};

export const VENDORS_CSV = {
  filename: 'vendors-template.csv',
  headers: ['Name', 'Email', 'Referral Code'],
  example: ['Alex Johnson', 'alex@email.com', 'AJ01'],
  required: ['Name', 'Email'],
  optional: ['Referral Code'],
  notes: [
    'Header row required. Column names are case-insensitive.',
    'Name and Email are required. Email must be unique per fundraiser.',
    'Referral Code is optional, Routed generates one if left blank.',
    'Existing vendors (same email) are skipped, not updated.',
  ],
  aliases: {
    name: ['name', 'vendor', 'vendorname'],
    email: ['email'],
    referral: ['referral', 'referralcode', 'referral code', 'code'],
  },
};

export function pickField(row, aliases) {
  for (const key of aliases) {
    if (row[key] !== undefined && row[key] !== '') return row[key];
  }
  return '';
}
