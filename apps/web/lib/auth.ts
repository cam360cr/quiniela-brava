'use client';

import { apiFetch, setToken } from './api';

export async function register(email: string, username: string, password: string) {
  return apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ email, username, password }) });
}

export async function login(identifier: string, password: string) {
  const r = await apiFetch<{token:string; user:any}>('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) });
  setToken(r.token);
  return r;
}

export function logout() {
  setToken(null);
}
