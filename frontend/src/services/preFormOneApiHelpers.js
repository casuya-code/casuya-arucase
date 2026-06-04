/**
 * Normalize standard API envelopes { success, data } for Pre-Form One services.
 */
export function unwrapListPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export function unwrapObjectPayload(payload) {
  if (payload?.data != null && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    return payload.data;
  }
  if (payload != null && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload;
  }
  return {};
}

/** Stable map key for admission numbers (API may return string or number). */
export function admissionKey(value) {
  if (value == null || value === '') return '';
  return String(value).trim();
}

/** Map interview/continuing result rows by admission_number. */
export function resultsByAdmissionNumber(payload) {
  const rows = unwrapListPayload(payload);
  const map = {};
  rows.forEach((row) => {
    const key = admissionKey(row?.admission_number);
    if (key) map[key] = row;
  });
  return map;
}
