import { resolve } from 'node:path';
import { createStaticServer } from './server.mjs';

// Serve apenas o build; REST e Socket.IO são interceptados pelo MSW no navegador.
process.env.NODE_ENV = 'production';
// server serve somente os arquivos do build; os mocks continuam sendo executados no navegador.
const server = createStaticServer(resolve('dist'));
server.listen(Number(process.env.PORT ?? 4173), '0.0.0.0', () => console.log('Kurio pronto na porta ' + (process.env.PORT ?? 4173)));
