// /src/api/health/controllers/health.js
module.exports = {
  async index(ctx) {
    ctx.send({ status: 'ok' });
  },
};