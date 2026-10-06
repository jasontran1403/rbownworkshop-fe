const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:9879';

function authHeaders() {
  const token = localStorage.getItem('access_token') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseResponse(res) {
  const body = await res.json().catch(() => ({}));
  if (body?.code === 901 || res.status === 401 || res.status === 403) {
    throw new Error(body?.message || 'Phiên đăng nhập đã hết hạn');
  }
  if (res.status === 429) {
    throw new Error('Thao tác quá nhanh, vui lòng chậm lại.');
  }
  if (!res.ok || body?.success === false) {
    throw new Error(body?.message || 'Có lỗi xảy ra');
  }
  return body.data ?? body;
}

// ============================================================
//  Processing numbers (3 loại)
// ============================================================

/**
 * Trả về object:
 *   { superVip: number|null, vip: number|null, normal: number|null }
 */
export async function getProcessingNumbers() {
  const res = await fetch(`${BASE_URL}/api/shop-orders/processing-number`, {
    headers: { ...authHeaders() },
  });
  const data = await parseResponse(res);
  return {
    superVip: data?.superVip ?? null,
    vip: data?.vip ?? null,
    normal: data?.normal ?? null,
  };
}

/**
 * Update một số đang xử lý theo loại.
 *   type: 'SUPER_VIP' | 'VIP' | 'NORMAL'
 *   value: number | null  (null = xoá)
 * Trả về object 3 số sau khi update.
 */
export async function updateProcessingNumber(type, value) {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  if (value !== '' && value != null) params.append('value', String(value));
  const res = await fetch(
    `${BASE_URL}/api/shop-orders/processing-number?${params.toString()}`,
    { method: 'PUT', headers: { ...authHeaders() } },
  );
  const data = await parseResponse(res);
  return {
    superVip: data?.superVip ?? null,
    vip: data?.vip ?? null,
    normal: data?.normal ?? null,
  };
}

// ============================================================
//  Management passcode (/management)
// ============================================================

/** GET status — { locked, remainingSeconds?, failedAttempts?, remainingAttempts? } */
export async function getManagementAccessStatus() {
  const res = await fetch(`${BASE_URL}/api/management-access/status`, {
    headers: { ...authHeaders() },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message || 'Có lỗi xảy ra');
  return body.data ?? body;
}

/** POST verify — { success, locked, remainingSeconds?, failedAttempts?, remainingAttempts?, reason? } */
export async function verifyManagementPasscode(passcode) {
  const res = await fetch(`${BASE_URL}/api/management-access/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ passcode }),
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 429) {
    throw new Error('Thao tác quá nhanh, vui lòng chậm lại.');
  }
  if (!res.ok) {
    throw new Error(body?.message || 'Có lỗi xảy ra');
  }
  // Unwrap nếu backend bọc { data: {...} }
  return body.data ?? body;
}

// ============================================================
//  Upload
// ============================================================

export async function startUpload(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE_URL}/api/shop-orders/upload`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: formData,
  });
  return parseResponse(res);
}

export async function getUploadStatus(taskId) {
  const res = await fetch(`${BASE_URL}/api/shop-orders/upload/status/${taskId}`, {
    headers: { ...authHeaders() },
  });
  if (res.status === 404) throw new Error('Task không tồn tại hoặc đã hết hạn');
  return parseResponse(res);
}

// ============================================================
//  Search
// ============================================================

export async function searchOrders(account, sheetType) {
  const params = new URLSearchParams();
  params.append('account', account);
  if (sheetType) params.append('sheetType', sheetType);
  const res = await fetch(`${BASE_URL}/api/shop-orders/search?${params.toString()}`, {
    headers: { ...authHeaders() },
  });
  return parseResponse(res);
}

export async function managementSearch(keyword, sheetType) {
  const params = new URLSearchParams();
  if (keyword) params.append('keyword', keyword);
  if (sheetType) params.append('sheetType', sheetType);
  const res = await fetch(`${BASE_URL}/api/shop-orders/management/search?${params.toString()}`, {
    headers: { ...authHeaders() },
  });
  return parseResponse(res);
}

export async function managementSearchPaged(keyword, sheetType, page = 0, size = 100) {
  const params = new URLSearchParams();
  if (keyword) params.append('keyword', keyword);
  if (sheetType) params.append('sheetType', sheetType);
  params.append('page', String(page));
  params.append('size', String(size));
  const res = await fetch(
    `${BASE_URL}/api/shop-orders/management/search-paged?${params.toString()}`,
    { headers: { ...authHeaders() } },
  );
  return parseResponse(res);
}

export async function updateOrder(id, patch) {
  const res = await fetch(`${BASE_URL}/api/shop-orders/management/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(patch),
  });
  return parseResponse(res);
}

export async function deleteOrder(id) {
  const res = await fetch(`${BASE_URL}/api/shop-orders/management/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || 'Xóa thất bại');
  }
}
