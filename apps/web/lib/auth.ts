'use client';

import { apiFetch, setToken } from './api';

type RegisterPayload = {
  email: string;
  fullName: string;
  nationalId: string;
  instagramUsername: string;
  birthDate: string;
  purchaseProofImage: string;
  followsInstagram: boolean;
  password: string;
};

export async function register(payload: RegisterPayload) {
  return apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
}

export async function login(identifier: string, password: string) {
  const r = await apiFetch<{token:string; user:any}>('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) });
  setToken(r.token);
  return r;
}

export function logout() {
  setToken(null);
}
