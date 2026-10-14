const NETWORK_ERROR = 'ارتباط با سرور برقرار نشد. مطمئن شوید سرور در حال اجراست.';

const fail = (message, status) => Object.assign(new Error(message), { status });

export async function api(url, opts) {
  let r;
  try {
    r = await fetch(url, opts);
  } catch {
    throw fail(NETWORK_ERROR, 0);
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw fail(data.error || `خطای سرور (${r.status})`, r.status);
  return data;
}

/** آپلود با درصد پیشرفت (fetch این قابلیت را ندارد) */
export function upload(url, formData, onProgress, signal) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.responseType = 'json';
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      const data = xhr.response || {};
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(fail(data.error || `خطای سرور (${xhr.status})`, xhr.status));
    };
    xhr.onerror = () => reject(fail(NETWORK_ERROR, 0));
    xhr.onabort = () => reject(Object.assign(new Error('لغو شد'), { name: 'AbortError' }));
    signal?.addEventListener('abort', () => xhr.abort());
    xhr.send(formData);
  });
}
