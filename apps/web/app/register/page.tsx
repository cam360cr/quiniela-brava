'use client';

import { useState } from 'react';
import Link from 'next/link';
import Nav from '../../components/Nav';
import ReglamentoContent from '../../components/ReglamentoContent';
import { register } from '../../lib/auth';
import { useRouter } from 'next/navigation';

const INSTAGRAM_URL = 'https://www.instagram.com/barrabravasportbar/';
const instagramHandleRegex = /^@?[A-Za-z0-9._]+$/;
const appUsernameRegex = /^@?[A-Za-z0-9._]+$/;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2200;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.readAsDataURL(file);
  });
}

function dataUrlByteSize(dataUrl: string) {
  const base64 = (dataUrl.split(',')[1] || '').replace(/\s/g, '');
  if (!base64) return 0;
  const padding = (base64.match(/=*$/)?.[0].length ?? 0);
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo procesar la imagen'));
    };

    image.src = objectUrl;
  });
}

async function toUploadReadyImage(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo seleccionado no es una imagen válida');
  }

  const originalDataUrl = await fileToDataUrl(file);
  const originalDataUrlBytes = dataUrlByteSize(originalDataUrl);
  if (originalDataUrlBytes <= MAX_IMAGE_BYTES) {
    return { dataUrl: originalDataUrl, compressed: false };
  }

  const source = await loadImageFromFile(file);
  const sourceWidth = source.naturalWidth || source.width;
  const sourceHeight = source.naturalHeight || source.height;

  if (!sourceWidth || !sourceHeight) {
    throw new Error('No se pudo leer el tamaño de la imagen');
  }

  const maxSide = Math.max(sourceWidth, sourceHeight);
  const resizeRatio = maxSide > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / maxSide : 1;
  const baseWidth = Math.max(1, Math.round(sourceWidth * resizeRatio));
  const baseHeight = Math.max(1, Math.round(sourceHeight * resizeRatio));

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Tu navegador no soporta compresión de imágenes');

  const attempts = [
    { quality: 0.9, scale: 1 },
    { quality: 0.82, scale: 0.9 },
    { quality: 0.74, scale: 0.82 },
    { quality: 0.66, scale: 0.75 },
    { quality: 0.58, scale: 0.68 },
    { quality: 0.5, scale: 0.62 },
  ];

  let bestDataUrl = '';
  let bestBytes = Number.POSITIVE_INFINITY;

  for (const attempt of attempts) {
    const width = Math.max(1, Math.round(baseWidth * attempt.scale));
    const height = Math.max(1, Math.round(baseHeight * attempt.scale));

    canvas.width = width;
    canvas.height = height;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(source, 0, 0, width, height);

    const candidate = canvas.toDataURL('image/jpeg', attempt.quality);
    const candidateBytes = dataUrlByteSize(candidate);

    if (candidateBytes < bestBytes) {
      bestDataUrl = candidate;
      bestBytes = candidateBytes;
    }

    if (candidateBytes <= MAX_IMAGE_BYTES) {
      return { dataUrl: candidate, compressed: true };
    }
  }

  if (bestDataUrl) {
    throw new Error('La imagen sigue pesando más de 4 MB. Prueba con otra foto más ligera o recortada.');
  }

  throw new Error('No se pudo comprimir la imagen');
}

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [instagramUsername, setInstagramUsername] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [purchaseProofImage, setPurchaseProofImage] = useState('');
  const [followsInstagram, setFollowsInstagram] = useState(false);
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  return (
    <>
      <Nav />
      <div className="card register-shell">
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>Crear cuenta para quinielas</h2>
        <p className="small register-subcopy">
          Solo los usuarios registrados pueden participar en quinielas. El calendario Mundial 2026 es público.
          El correo electrónico, usuario y número de cédula deben ser únicos.
        </p>

        {msg && <div className="card register-msg">{msg}</div>}

        <div className="register-layout">
          <div className="card register-panel">
            <h3 style={{ marginTop: 0, marginBottom: 6 }}>Pasos para habilitar tu participación</h3>
            <p className="small" style={{ marginTop: 0, marginBottom: 0 }}>
              Completa estos pasos antes de crear tu cuenta.
            </p>

            <div className="register-step-list">
              <div className="register-step">
                <div className="register-step-index">Paso 1</div>
                <div className="register-step-title">Seguí a Barra Brava en Instagram</div>
                <div className="register-step-content">
                  <a
                    className="btn primary"
                    href={INSTAGRAM_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir Instagram y seguir
                  </a>
                </div>
              </div>

              <div className="register-step">
                <div className="register-step-index">Paso 2</div>
                <div className="register-step-title">Escribí tu usuario de Instagram</div>
                <div className="register-step-content">
                  <input
                    className="input"
                    value={instagramUsername}
                    onChange={(e) => setInstagramUsername(e.target.value)}
                    placeholder="@usuario"
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                </div>
              </div>

              <div className="register-step">
                <div className="register-step-index">Paso 3</div>
                <div className="register-step-title">Confirma</div>
                <div className="register-step-content">
                  <label className="small register-confirm-row">
                    <input
                      type="checkbox"
                      checked={followsInstagram}
                      onChange={(e) => setFollowsInstagram(e.target.checked)}
                      style={{ marginTop: 2 }}
                    />
                    Confirmo que ya sigo a @barrabravasportbar. Entiendo que si no sigo la cuenta, mi participación puede ser anulada.
                  </label>
                </div>
              </div>

              <div className="register-step">
                <div className="register-step-index">Paso 4</div>
                <div className="register-step-title">Subí la factura de tu compra en Barra Brava</div>
                <div className="register-step-content">
                  <p className="small" style={{ marginTop: 0, marginBottom: 8 }}>
                    Carga una foto clara de una factura real de compra hecha en Barra Brava.
                    La factura debe ser por un consumo mínimo de 7.000 colones.
                  </p>
                  <input
                    className="input register-file-input"
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      try {
                        const { dataUrl, compressed } = await toUploadReadyImage(file);
                        setPurchaseProofImage(dataUrl);
                        setMsg(compressed ? 'La imagen se comprimió automáticamente para cumplir el límite de 4 MB.' : null);
                      } catch (error: any) {
                        setMsg(error?.message ?? 'No se pudo procesar la foto de factura');
                      }
                    }}
                  />

                  {purchaseProofImage && (
                    <div className="register-proof-preview">
                      <div className="small" style={{ marginBottom: 8 }}>Vista previa de factura</div>
                      <img
                        src={purchaseProofImage}
                        alt="Factura adjunta"
                        className="team-logo-preview"
                        style={{ width: 180, height: 180 }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="register-step">
                <div className="register-step-index">Paso 5</div>
                <div className="register-step-title">Lee y acepta el reglamento oficial</div>
                <div className="register-step-content">
                  <p className="small" style={{ marginTop: 0, marginBottom: 8 }}>
                    Debes leer el reglamento completo antes de crear tu cuenta.
                  </p>
                  <div className="register-rules-box">
                    <ReglamentoContent compact />
                  </div>
                  <label className="small register-confirm-row register-rules-check">
                    <input
                      type="checkbox"
                      checked={acceptedRules}
                      onChange={(e) => setAcceptedRules(e.target.checked)}
                      style={{ marginTop: 2 }}
                    />
                    Confirmo que leí y acepto el reglamento de la quiniela.
                  </label>
                  <div className="small" style={{ marginTop: 8 }}>
                    También puedes verlo en una página dedicada: <Link href="/reglamento">Ver reglamento completo</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card register-panel">
            <h3 style={{ marginTop: 0, marginBottom: 6 }}>Datos de tu cuenta</h3>
            <p className="small" style={{ marginTop: 0 }}>
              Este formulario crea tu acceso para entrar a quinielas privadas.
            </p>

            <div className="register-account-grid">
              <div>
                <div className="label">Correo electrónico</div>
                <input
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <div className="label">Usuario único</div>
                <input
                  className="input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ej: juan.perez"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                />
              </div>

              <div>
                <div className="label">Número de cédula</div>
                <input
                  className="input"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  placeholder="Ej: 1-1234-5678"
                />
              </div>

              <div>
                <div className="label">Nombre completo</div>
                <input
                  className="input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej: María Fernanda Rojas"
                  autoComplete="name"
                />
              </div>

              <div>
                <div className="label">Fecha de nacimiento</div>
                <input
                  className="input"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  type="date"
                />
              </div>
            </div>

            <div className="register-account-full">
              <div className="label">Contraseña</div>
              <input
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
            </div>

            <div className="row-actions register-actions">
              <button
                className="btn primary"
                disabled={saving}
                onClick={async () => {
                  if (saving) return;
                  setMsg(null);
                  setSaving(true);
                  try {
                    const cleanUsername = username.trim();
                    const cleanInstagramUsername = instagramUsername.trim();

                    if (!cleanUsername) throw new Error('Debes escribir un nombre de usuario');
                    if (!appUsernameRegex.test(cleanUsername)) {
                      throw new Error('El nombre de usuario no es válido');
                    }
                    if (cleanUsername.replace(/^@+/, '').length < 3) {
                      throw new Error('El nombre de usuario debe tener al menos 3 caracteres');
                    }
                    if (!cleanInstagramUsername) throw new Error('Debes escribir tu usuario de Instagram');
                    if (!instagramHandleRegex.test(cleanInstagramUsername)) {
                      throw new Error('El usuario de Instagram no es válido');
                    }
                    if (!purchaseProofImage) throw new Error('Debes adjuntar la foto de la factura');
                    if (!followsInstagram) throw new Error('Debes confirmar que sigues el Instagram de Barra Brava');
                    if (!acceptedRules) throw new Error('Debes leer y aceptar el reglamento para crear tu cuenta');

                    await register({
                      email,
                      username: cleanUsername.replace(/^@+/, '').toLowerCase(),
                      fullName,
                      nationalId,
                      instagramUsername: cleanInstagramUsername,
                      birthDate,
                      purchaseProofImage,
                      followsInstagram,
                      acceptedRules,
                      password,
                    });
                    router.push('/login');
                  } catch (e: any) {
                    setMsg(e.message);
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? 'Creando...' : 'Crear cuenta'}
              </button>
              <Link className="btn" href="/login">¿Ya tienes una cuenta? Entrar</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
