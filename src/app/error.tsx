'use client';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ fontFamily: 'sans-serif', padding: '2rem', backgroundColor: '#111827', color: 'white', height: '100vh', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Algo salió mal</h2>
          <p style={{ color: '#9ca3af' }}>Ocurrió un error inesperado en la aplicación.</p>
          <button
            onClick={() => reset()}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer', background: '#D4AF37', border: 'none', borderRadius: '0.25rem', color: 'black' }}
          >
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  );
}
