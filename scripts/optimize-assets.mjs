import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';
import sharp from 'sharp';

/** Deriva versões leves dos rasters exportados no Figma, conservando os originais. */
const mappings = {};
// walk percorre folder recursivamente e deriva WebP somente dos rasters disponíveis nos assets originais.
async function walk(folder) {
  // entry identifica cada arquivo ou subdiretório encontrado; diretórios continuam a busca recursiva.
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    // path monta o caminho completo do arquivo ou diretório que está sendo processado.
    const path = join(folder, entry.name);
    if (entry.isDirectory()) { await walk(path); continue; }
    // raster recebe os bytes do PNG original, seja um arquivo direto ou uma imagem incorporada no SVG.
    let raster;
    if (extname(path) === '.png') raster = await readFile(path);
    if (extname(path) === '.svg') {
      // embedded extrai a imagem PNG em base64 do SVG; arquivos sem esse raster não são convertidos.
      const embedded = (await readFile(path, 'utf8')).match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/);
      if (embedded) raster = Buffer.from(embedded[1], 'base64');
    }
    if (!raster) continue;
    // destination define o caminho WebP derivado, mantendo o arquivo original intacto.
    const destination = path.replace(/\.(png|svg)$/, '.webp');
    await sharp(raster).resize({ width: path.includes('hero') ? 800 : 640, withoutEnlargement: true }).webp({ quality: 90, effort: 6 }).toFile(destination);
    mappings['/' + relative('public', path).replaceAll('\\', '/')] = '/' + relative('public', destination).replaceAll('\\', '/');
  }
}
await walk('public/images');
await writeFile('scripts/asset-mappings.json', JSON.stringify(mappings, null, 2));
console.log('Assets responsivos gerados:', Object.keys(mappings).length);
