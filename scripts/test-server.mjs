import { resolve } from 'node:path';
import { createStaticServer } from './server.mjs';

// Serve o build no loopback; os testes controlam eventos pelos endpoints do MSW.
process.env.NODE_ENV = 'production';
// server disponibiliza o build no loopback para os testes, sem depender de serviços privados externos.
const server = createStaticServer(resolve('dist'));
server.listen(5185, '127.0.0.1');
