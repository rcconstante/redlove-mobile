import type { ApiErrorBody } from '@/types/api.types';

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly url: string;

  constructor(message: string, status: number, body: unknown, url: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.url = url;
  }
}

type RequestBody = Record<string, unknown> | FormData | undefined;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: RequestBody;
  headers?: Record<string, string>;
};

const configuredBase = process.env.EXPO_PUBLIC_API_URL ?? '';

export const API_BASE_URL = normalizeBaseUrl(configuredBase);

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const withoutSlash = trimmed.replace(/\/+$/, '');
  return withoutSlash.endsWith('/api') ? withoutSlash : `${withoutSlash}/api`;
}

function buildUrl(path: string): string {
  const apiPath = path.startsWith('/') ? path : `/${path}`;
  if (API_BASE_URL) return `${API_BASE_URL}${apiPath}`;
  throw new Error('EXPO_PUBLIC_API_URL is not configured. Set it to https://redlove.today and restart Expo with cache clear.');
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function errorMessage(body: unknown, fallback: string): string {
  if (typeof body === 'object' && body != null && 'error' in body) {
    const error = (body as ApiErrorBody).error;
    if (typeof error === 'string' && error.trim()) return error;
  }
  return fallback;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = buildUrl(path);
  const isForm = options.body instanceof FormData;
  let requestBody: BodyInit | undefined;
  if (options.body instanceof FormData) {
    requestBody = options.body;
  } else if (options.body) {
    requestBody = JSON.stringify(options.body);
  }
  const response = await fetch(url, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
    body: requestBody,
  });

  const body = await parseResponse(response);
  if (!response.ok) {
    throw new ApiError(errorMessage(body, `Request to ${url} failed with status ${response.status}`), response.status, body, url);
  }
  return body as T;
}

export function absoluteMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (!API_BASE_URL) return url;
  return `${API_BASE_URL.replace(/\/api$/, '')}${url.startsWith('/') ? url : `/${url}`}`;
}
