import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

// El backend (backend/src/main.ts) escribe su puerto real ahí cada vez que
// arranca, incluso cuando tuvo que hacer fallback por tener el puerto por
// defecto ocupado. Leerlo en cada request evita hardcodear un puerto que
// puede cambiar en cualquier reinicio del backend.
const PORT_FILE = join(process.cwd(), '..', '.dev-backend-port');
const FALLBACK_PORT = 3001;

function getBackendPort(): number {
  try {
    const port = Number(readFileSync(PORT_FILE, 'utf-8').trim());
    return Number.isInteger(port) && port > 0 ? port : FALLBACK_PORT;
  } catch {
    return FALLBACK_PORT;
  }
}

async function proxy(request: NextRequest, segments: string[]): Promise<NextResponse> {
  const port = getBackendPort();
  const targetUrl = `http://localhost:${port}/api/${segments.join('/')}${request.nextUrl.search}`;

  const headers = new Headers(request.headers);
  headers.delete('host');

  const hasBody = !['GET', 'HEAD'].includes(request.method);

  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: 'manual',
    });
  } catch {
    return NextResponse.json(
      { message: `No se pudo conectar con el backend en el puerto ${port}. ¿Está corriendo?` },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('content-length');

  return new NextResponse(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  return proxy(request, segments);
}

export {
  handler as GET,
  handler as POST,
  handler as PATCH,
  handler as DELETE,
  handler as PUT,
};
