export function isValidCoverUrl(url) {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  if (/^[\p{Extended_Pictographic}\s]+$/u.test(trimmed)) return false;
  return true;
}

export function publishChecklist(fundraiser, productCount = 0) {
  return [
    { key: "endDate",       label: "End date set",          ok: !!fundraiser.endDate },
    { key: "deliveryDate",  label: "Delivery date set",     ok: !!fundraiser.deliveryDate },
    { key: "contact",       label: "Contact info added",    ok: !!(fundraiser.contactName && (fundraiser.contactEmail || fundraiser.contactPhone)) },
    { key: "deliveryNotes", label: "Delivery notes added",    ok: !!fundraiser.deliveryNotes },
    { key: "coverImage",    label: "Cover image added",     ok: isValidCoverUrl(fundraiser.coverImageUrl) },
    { key: "products",      label: "At least 1 product",    ok: productCount > 0 },
  ];
}

export function isPublishReady(fundraiser, productCount = 0) {
  return publishChecklist(fundraiser, productCount).every(c => c.ok);
}
