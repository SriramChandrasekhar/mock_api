const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

server.use(middlewares);
server.use(jsonServer.bodyParser);

server.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

/**
 * Extract tenantId from header
 * x-tenant-id: tenant_abc
 */
server.use((req, res, next) => {

    if (req.path === '/health') {
        return next();
    }

    if (req.path === '/foodMenu') {
        return next();
    }

    const tenantId = req.header('x-tenant-id');

    if (!tenantId) {
        return res.status(400).json({ error: 'Missing header' });
    }

    req.tenantId = tenantId;
    next();
});

/**
 * Auto-attach tenantId + defaults on create
 */
server.post('/supportTickets', (req, res, next) => {
    req.body.title = req.body.title;
    req.body.description = req.body.description;
    req.body.status = req.body.status;
    req.body.createdAt = new Date().toISOString();
    next();
});

server.post('/foodOrder', (req, res, next) => {
    req.body.name = req.body.name;
    req.body.category = req.body.category;
    req.body.foodType = req.body.foodType;
    req.body.cuisine = req.body.cuisine;
    req.body.createdAt = new Date().toISOString();
    next();
});

/**
 * Read isolation (GET all / one)
 */
server.use((req, res, next) => {
    if (req.method === 'GET' && req.path.startsWith('/supportTickets')) {
        req.query.tenantId = req.tenantId;
    }
    next();
});

/**
 * Update/Delete isolation
 */
server.use((req, res, next) => {
  if (['PATCH', 'DELETE', 'PUT'].includes(req.method)) {

    // extract id from URL manually
    const match = req.path.match(/^\/([^/]+)\/(\d+)/);
    if (!match) return next();

    const collection = match[1]; // supportTickets
    const id = Number(match[2]); // 1

    const item = router.db.get(collection).find({ id }).value();

    if (!item || String(item.tenantId) !== String(req.tenantId)) {
      return res.status(404).json({ error: 'Not found' });
    }
  }

  next();
});

server.use(router);

server.listen(8888, () => {
    console.log('Multi-tenant JSON Server running on 8888');
});