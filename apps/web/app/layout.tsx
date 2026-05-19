import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quiniela Brava 2026',
  description: 'Calendario Mundial 2026 y quinielas oficiales de Barra Brava',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="app-body">
        <div className="top-strip" aria-hidden="true">
          <div className="top-strip-inner">
            <span className="logo-badge">BARRA BRAVA</span>
          </div>
        </div>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
