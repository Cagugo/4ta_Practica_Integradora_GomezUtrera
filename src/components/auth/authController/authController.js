const authServices = require('../authServices/authServices');
const passport = require('passport');
const { config } = require('../../../config');
const jwt = require('jsonwebtoken');

class AuthController {
  register = async (req, res) => {
    const payload = req.body;
    return await authServices.register(req, payload, res);
  };
  login = async (req, res, next) => {
    let { email, password } = req.body;
    const isAdminLogin = email === config.admin_email && password === config.admin_password;
    const response = await authServices.login(req, { email, password, isAdminLogin });

    if (response.status === 200) {
      const { _id, email, role, first_name, last_name, age, cart } = response.response;
      const secretKey = config.jwt_secret;
      const tokenPayload = isAdminLogin ? { _id, email, admin: true, role, first_name, last_name, age, cart } : { _id, email, role, first_name, last_name, age, cart };
      const token = jwt.sign(tokenPayload, secretKey, { expiresIn: '24h' });

      res.cookie('jwt', token, { maxAge: 60 * 60 * 1000, httpOnly: true });

      const user = { _id, email, role, first_name, last_name, age, cart };
      response.user = user;
    }
    res.json(response);
  };
  current = async (req, res) => {
    return await authServices.current(req, res);
  };
  githubLogin = (req, res, next) => {
    passport.authenticate('github', { scope: ['user_email'] })(req, res, next);
  };

  githubCallback = (req, res, next) => {
    passport.authenticate('github', { failureRedirect: '/' })(req, res, next);
  };
  githubCallbackRedirect = async (req, res) => {
    try {
      req.session.user = req.user;

      const user = req.user;
      const previousLastConnection = user.last_connection;
      user.last_connection = new Date();

      await user.save();

      req.logger.debug('Login GitHub success');
      req.logger.debug(`Login last_connection -> previous: ${previousLastConnection.toISOString()} -> new: ${user.last_connection.toISOString()}`);
      res.redirect('/products');
    } catch (error) {
      console.error('Error in githubCallbackRedirect:', error);
      res.status(500).send('An error occurred during the operation.');
    }
  };
  logout = async (req, res) => {
    try {
      const logoutResult = await authServices.logout(req, res);
      if (logoutResult.success) {
        return res.redirect('/');
      } else {
        return res.sendUnauthorized(logoutResult);
      }
    } catch (err) {
      const response = { error: err.message || 'Server Internal Error' };
      return res.sendServerError(response);
    }
  };
}
module.exports = new AuthController();
