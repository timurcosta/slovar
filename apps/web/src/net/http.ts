// Запросы к API того же сайта (/api/...). Ошибки HTTP превращаются в HttpError со статусом и телом.

export class HttpError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(`HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

export async function request<T>(
  method: string,
  path: string,
  opts: { body?: unknown; token?: string | null; keepalive?: boolean } = {},
): Promise<T> {
  const res = await fetch(new URL("api" + path, document.baseURI), {
    method,
    keepalive: opts.keepalive,
    headers: { "content-type": "application/json", ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new HttpError(res.status, data);
  return data as T;
}
