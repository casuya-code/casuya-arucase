const { getTemplateInfo, isBaitPath, matchBait, contentTypeFor } = require('../core/routes');
const { applyLayerHeader, pickFallback } = require('../core/stealth');

function routerRedirect(req, res, next) {
  if (!isBaitPath(req.path)) return next();

  const route = matchBait(req.path);
  const { name, content } = getTemplateInfo(route);
  const html = pickFallback(content);
  const type = contentTypeFor(name);
  applyLayerHeader(res, 'router_redirect')
    .status(200)
    .setHeader('Content-Type', type)
    .send(html);
}

module.exports = { routerRedirect };
