import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

/** Servidor estático opcional: os contratos REST e Socket.IO são simulados pelo MSW. */
export function createStaticServer(staticRoot) {
  return createServer(async (request, response) => {
    if (request.url === '/health') { response.writeHead(200).end('ok'); return; }
    if (request.method !== 'GET') { response.writeHead(404).end(); return; }
    // pathname receberá o caminho decodificado da URL; entradas inválidas geram erro de requisição.
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
    catch { response.writeHead(400).end(); return; }
    // target resolve o arquivo dentro de staticRoot; a verificação seguinte bloqueia saída dessa pasta.
    const target = resolve(staticRoot, '.' + pathname);
    if (!target.startsWith(resolve(staticRoot) + sep) && target !== resolve(staticRoot)) { response.writeHead(403).end(); return; }
    if (pathname.startsWith('/api/')) { response.writeHead(404).end(); return; }
    // types associa extensões ao Content-Type correto de scripts, estilos, imagens e fontes locais.
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json' };
    try {
      // content contém os bytes do arquivo solicitado, enviados somente depois de uma leitura bem-sucedida.
      const content = await readFile(target);
      response.writeHead(200, { 'Content-Type': types[extname(target)] ?? 'application/octet-stream', 'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache' }).end(content);
    } catch {
      if (extname(pathname)) response.writeHead(404).end();
      else {
        // content contém o index.html utilizado para abrir rotas da SPA diretamente ou após refresh.
        const content = await readFile(resolve(staticRoot, 'index.html'));
        response.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' }).end(content);
      }
    }
  });
}
