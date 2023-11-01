class LoggerController {
  getLogger = async (req, res) => {
    try {
      req.logger.fatal('¡Alert!');
      req.logger.error('¡Alert!');
      req.logger.warn('¡Alert!');
      req.logger.info('¡Alert!');
      req.logger.http('¡Alert!');
      req.logger.debug('¡Alert!');
      res.send({ message: '**Logger test**' });
    } catch (error) {
      return res.sendServerError('An error has occurred');
    }
  };
}
module.exports = new LoggerController();