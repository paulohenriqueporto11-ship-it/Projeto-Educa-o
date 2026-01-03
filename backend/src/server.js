require('dotenv').config();
// Importa o framework Fastify (mais rápido que o Express)
const fastify = require('fastify')({ logger: true });

// 1. Configurar CORS (Para o frontend conseguir acessar)
fastify.register(require('@fastify/cors'), {
  origin: '*', // Em produção, mude isso para o domínio do seu site
});

// 2. Rota de Teste (Health Check)
fastify.get('/', async (request, reply) => {
  return { status: 'online', message: 'Backend rodando liso no Render!' };
});

// 3. Rota de Exemplo (Sua lógica vai aqui)
fastify.get('/api/usuario', async (request, reply) => {
  // Exemplo de retorno de dados
  return { id: 1, nome: 'PH', role: 'admin' };
});

// 4. INICIALIZAÇÃO DO SERVIDOR (A parte crítica pro Render)
const start = async () => {
  try {
    // O Render injeta a porta automaticamente na variável process.env.PORT
    const port = process.env.PORT || 3000;
    
    // O host '0.0.0.0' é OBRIGATÓRIO no Render. 
    // Se deixar só 'localhost', o deploy falha.
    await fastify.listen({ port: port, host: '0.0.0.0' });
    
    console.log(`Servidor rodando na porta ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
