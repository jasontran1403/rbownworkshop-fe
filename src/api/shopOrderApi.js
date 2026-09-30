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

export async function getProcessingNumber() {
  const res = await fetch(`${BASE_URL}/api/shop-orders/processing-number`, {
    headers: { ...authHeaders() },
  });
  const data = await parseResponse(res);
  return data.currentProcessingNumber ?? null;
}

export async function updateProcessingNumber(value) {
  const params = new URLSearchParams();
  if (value !== '' && value != null) params.append('value', String(value));
  const res = await fetch(
    `${BASE_URL}/api/shop-orders/processing-number?${params.toString()}`,
    { method: 'PUT', headers: { ...authHeaders() } },
  );
  const data = await parseResponse(res);
  return data.currentProcessingNumber ?? null;
}

/**
 * Bắt đầu upload. Server parse file sync và trả về task info ngay:
 *   { taskId, estimatedMillis, totalRows }
 * Sau đó truncate + insert chạy nền, poll qua getUploadStatus.
 */
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

/**
 * Poll trạng thái task upload.
 * Trả về: { taskId, status: 'RUNNING'|'DONE'|'ERROR',
 *           estimatedMillis, startedAt, completedAt?,
 *           totalRows, savedRows,
 *           currentProcessingNumber?, errorMessage? }
 */
export async function getUploadStatus(taskId) {
  const res = await fetch(`${BASE_URL}/api/shop-orders/upload/status/${taskId}`, {
    headers: { ...authHeaders() },
  });
  if (res.status === 404) throw new Error('Task không tồn tại hoặc đã hết hạn');
  return parseResponse(res);
}

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