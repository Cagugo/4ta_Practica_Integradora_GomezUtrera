const { devLogger, stageLogger, prodLogger } = require('./logger');
const { args } = require('../../config/index');

function loggerMiddleware(req, res, next) {
  if (args.mode === 'production') {
    req.logger = prodLogger;
  } else if (args.mode === 'staging') {
    req.logger = stageLogger;
  } else {
    req.logger = devLogger;
  }
  next();
}
module.exports = loggerMiddleware;

