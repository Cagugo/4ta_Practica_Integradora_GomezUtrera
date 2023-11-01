const { User } = require('../../../models/users');
const JWTService = require('../../../utils/jwt/jwt');
const jwt = require('jsonwebtoken');
const { createHash, isValidPassword } = require('../../../utils/bcrypt/bcrypt');
const { Cart } = require('../../../models/carts');
const { config } = require('../../../config');
const { cartsServices } = require('../../../repositories/index');
const { usersServices } = require('../../../repositories/index');
const req = require('../../../utils/logger/loggerSetup');

class AuthServices {
  constructor() {
    this.createUsersIfNotExists();
  }
  createUsersIfNotExists = async () => {
    const usersToCreate = [
      { email: 'admin@correo.com', firstName: 'admin', role: 'admin' },
      { email: 'user@correo.com', firstName: 'user', role: 'user' },
      { email: 'premium@correo.com', firstName: 'premium', role: 'premium' },
    ];
    for (const userData of usersToCreate) {
      const { email, firstName, role } = userData;
      const existingUser = await usersServices.findOne({ email });
      if (!existingUser) {
        const newUser = new User({
          first_name: firstName,
          last_name: firstName,
          email,
          age: 33,
          password: createHash('1111'),
          role,
        });
        try {
          const savedUser = await usersServices.createUserDTO(newUser);
          const userCart = new Cart({
            user: savedUser._id,
            products: [],
          });
          await cartsServices.save(userCart);

          savedUser.cart = userCart._id;
          savedUser.last_connection = new Date();
          await savedUser.save();

          const token = await JWTService.generateJwt({ id: savedUser._id });

          await usersServices.findByIdAndUpdate(savedUser._id, { token }, { new: true });

          req.logger.info(`User "${firstName} Role: ${role}" created successfully. Register for Testing last_connection -> new: ${savedUser.last_connection}`);
        } catch (error) {
        }
      }
    }
  };
  register = async (req, payload, res) => {
    try {
      const { first_name, last_name, email, age, password, role } = payload;
      if (!first_name || !last_name || !email || !age || !password) {
        return res.sendServerError('Missing required fields');
      }
      const existingUser = await usersServices.findOne({ email: email });
      if (existingUser) {
        return res.sendUserError('A user with the same email already exists');
      }
      const newUser = new User({
        first_name,
        last_name,
        email,
        age,
        password: createHash(password),
        role,
      });
      const savedUser = await usersServices.createUserDTO(newUser);
      const userCart = new Cart({
        user: savedUser._id,
        products: [],
      });
      await cartsServices.save(userCart);
      savedUser.cart = userCart._id;
      savedUser.last_connection = new Date();
      await savedUser.save();

      const data = newUser;
      const token = await JWTService.generateJwt({ id: savedUser._id });

      await usersServices.findByIdAndUpdate(savedUser._id, { token }, { new: true });

      req.logger.info(`User "${first_name}" created successfully. Register last_connection -> new: ${savedUser.last_connection}`);

      return res.sendCreated({
        payload: {
          message: 'User successfully added',
          token,
          data,
        },
      });
    } catch (error) {
      req.logger.error('Error adding user');
      return res.sendServerError('Error adding user');
    }
  };
  login = async (req, { email, password, isAdminLogin }) => {
    try {
      if (isAdminLogin) {
        const adminUser = {
          email: config.admin_email,
          admin: true,
          role: 'admin',
        };
        return { status: 200, success: true, response: adminUser, isAdminLogin: true };
      } else {
        let user = await usersServices.findOne({ email: email });
        if (!user) {
          req.logger.debug('The user does not exist in the database');
          return { status: 401, success: false, response: 'The user does not exist in the database' };
        }

        if (!isValidPassword(password, user)) {
          req.logger.debug('Invalid credentials');
          return { status: 403, success: false, response: 'Invalid credentials' };
        }
        req.logger.debug('Log in jwt success');
        const previousLastConnection = user.last_connection;
        user.last_connection = new Date();
        await user.save();

        req.logger.debug(`Log in last_connection -> previous: ${previousLastConnection.toISOString()} -> new: ${user.last_connection.toISOString()}`);

        return { status: 200, success: true, response: user, isAdminLogin: false };
      }
    } catch (error) {
      req.logger.error('Server error during login');
      return { status: 500, success: false, response: 'Server error during login' };
    }
  };
  current = async (req, res) => {
    try {
      const cookie = req.cookies['jwt'];
      if (!cookie) {
        return res.sendUnauthorized('Token not provided');
      }
      const user = jwt.verify(cookie, config.jwt_secret);
      const data = user;
      return res.sendSuccess({
        payload: {
          message: 'Successfully obtained token',
          data,
        },
      });
    } catch (error) {
      return res.sendUnauthorized('Invalid token');
    }
  };
  logout = async (req, res) => {
    try {
      res.clearCookie('jwt');
      await new Promise((resolve, reject) => {
        req.session.destroy((err) => {
          if (err) {
            const response = { status: 500, success: false, error: err };
            req.logoutResult = response;
            reject(response);
          } else {
            const response = { status: 200, success: true, message: 'Successful log out' };
            req.logoutResult = response;
            resolve(response);
          }
          req.logger.debug('Successful logout');
        });
      });
      if (req.user.email !== config.admin_email) {
        const user = await usersServices.findById(req.user._id);
        const previousLastConnection = user.last_connection;
        user.last_connection = new Date();
        await user.save();

        req.logger.debug(`Logout last_connection -> previous: ${previousLastConnection.toISOString()} -> new: ${user.last_connection.toISOString()}`);
      }
      return req.logoutResult;
    } catch (err) {
      req.logger.error('Error during logout');
      const response = { status: 500, success: false, error: 'Error during logout' };
      req.logoutResult = response;
      return response;
    }
  };
}
module.exports = new AuthServices();
