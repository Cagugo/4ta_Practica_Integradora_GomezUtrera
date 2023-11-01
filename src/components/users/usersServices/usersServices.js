const { User } = require('../../../models/users');
const JWTService = require('../../../utils/jwt/jwt');
const jwt = require('jsonwebtoken');
const { createHash } = require('../../../utils/bcrypt/bcrypt');
const { Cart } = require('../../../models/carts');
const { config } = require('../../../config');
const { cartsServices } = require('../../../repositories/index');
const { usersServices } = require('../../../repositories/index');
const CustomError = require('../../../utils/errors/services/customError');
const EErrors = require('../../../utils/errors/services/enums');
const { generateUserErrorInfo } = require('../../../utils/errors/services/info');
const MailManager = require('../../../utils/mailManager/mailManager');
const path = require('path');
const PORT = `${config.port}`;
const bcrypt = require('bcrypt');

class UsersServices {
  getUsers = async (req, res) => {
    try {
      const users = await usersServices.findAll();
      const data = users;
      return res.sendSuccess({ message: 'All users', payload: data });
    } catch (error) {
      return res.sendServerError('Error getting users');
    }
  };
  registerUser = async (req, payload, res) => {
    try {
      const { first_name, last_name, email, age, password, role } = payload;
      if (!first_name || !last_name || !email || !age || !password) {
        return res.sendServerError('Required fields are missing');
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
      await savedUser.save();

      const data = newUser;
      const token = await JWTService.generateJwt({ id: savedUser._id });
      await usersServices.findByIdAndUpdate(savedUser._id, { token }, { new: true });

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
  addUser = async (payload, res) => {
    try {
      const { first_name, last_name, age, email, password } = payload;
     
      if (!first_name || !last_name || !email) {
        try {
          CustomError.createError({
            name: 'User creation error',
            cause: generateUserErrorInfo({ first_name, last_name, age, email, password }),
            message: 'Error Trying to create User',
            code: EErrors.INVALID_TYPES_ERROR,
          });
        } catch (error) {
          console.error('An error occurred in CustomError:', error);
        }
        return res.sendServerError('User required fields missing');
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
      });
      await usersServices.save(newUser);

      const userCart = new Cart({
        user: newUser._id,
        products: [],
      });
      await cartsServices.save(userCart);

      newUser.cart = userCart._id;

      const data = newUser;

      return res.sendCreated({ message: 'User successfully added', payload: data });
    } catch (error) {
      return res.sendServerError('Error adding user');
    }
  };
  recoveryUser = async ({ email, password, res }) => {
    try {
      let user = await usersServices.findOne({
        email: email,
      });
      if (!user) {
        return res.sendUnauthorized('The user does not exist in the database');
      }
      let data = await usersServices.findByIdAndUpdate(user._id, { password: createHash(password) }, { new: true });

      return res.sendSuccess({ message: 'Password updated successfully', payload: data });
    } catch (error) {
      return res.sendServerError('Error recovering password');
    }
  };
  getUserById = async (uid, res) => {
    try {
      const user = await usersServices.findById(uid);
      if (!user) {
        return res.sendNotFound('User not found');
      }
      const data = user;
      return res.sendSuccess({ message: 'Successfully obtained user', payload: data });
    } catch (error) {
      return res.sendServerError('Error getting user');
    }
  };
  updateUser = async (uid, updateFields, res, req) => {
    try {
      const allowedFields = ['first_name', 'last_name', 'email', 'age', 'password', 'role'];
      const invalidFields = Object.keys(updateFields).filter((field) => !allowedFields.includes(field));
      if (invalidFields.length > 0) {
        return res.sendUserError(`The following fields cannot be modified: ${invalidFields.join(', ')}`);
      }
      if (updateFields.hasOwnProperty('role')) {
        if (!['admin', 'user', 'premium'].includes(updateFields.role)) {
          return res.sendUserError('The "role" field can only change to "admin", "user" or "premium"');
        }
      }
      const updatedUser = await usersServices.findByIdAndUpdate(uid, updateFields, { new: true });
      if (!updatedUser) {
        return res.sendNotFound('User not found');
      }
      req.app.io.emit('updateUser', updatedUser);

      const data = updatedUser;
      return res.sendSuccess({ message: 'Successfully updated user', payload: data });
    } catch (error) {
      return res.sendServerError('Error updating user');
    }
  };
  deleteUser = async (uid, res, req) => {
    try {
      const deletedUser = await usersServices.findByIdAndDelete(uid);
      if (!deletedUser) {
        return res.sendNotFound('User not found');
      }
      req.app.io.emit('deleteUser', uid);
      const data = deletedUser;
      return res.sendSuccess({ message: 'Successfully deleted user', payload: data });
    } catch (error) {
      return res.sendServerError('Error deleting user');
    }
  };
  resetPass = async ({ email, password, res, req }) => {
    try {
      const user = await usersServices.findOne({ email });
      if (!user) {
        req.logger.info('User not found');
        return res.sendNotFound('User not found');
      }
      const passwordMatch = bcrypt.compareSync(password, user.password);
      if (passwordMatch) {
        req.logger.info('The new password is the same as the current password.');
        return res.sendUserError('The new password is the same as the current password. Cannot enter the same password.');
      }
      const newPasswordHash = createHash(password);
      let data = await usersServices.findByIdAndUpdate(user._id, { password: newPasswordHash }, { new: true });
      req.logger.info('Updated password');
      return res.sendSuccess({ message: 'Password updated successfully', payload: data });
    } catch (error) {
      req.logger.error('Error recovering password');
      return res.sendServerError('Error recovering password');
    }
  };
  resetPassByEmail = async (email, res, req) => {
    try {
      const user = await usersServices.findOne({ email });
      if (!user) {
        return res.sendNotFound('User not found');
      }
      const username = user.email;
      const resetPasswordToken = jwt.sign({ userId: user._id }, config.jwt_secret, {
        expiresIn: '1h',
      });
      const resetPasswordLink = `http://localhost:${PORT}/resetpass/${resetPasswordToken}`;
      const emailContent = `
      <h1>Reestablezca su contraseña</h1>
      <p>Username: ${username}</p>
      <p>Acceda <a href="${resetPasswordLink}">here</a> to reset your password.</p>
      <!-- Add any other information you want in the email-->
    `;
      const attachments = [
        {
          filename: 'vf.png',
          path: path.join(__dirname, '../../../uploads/mail/vf.png'),
        },
      ];
      const emailPayload = {
        from: 'carlosgomez_87@gmail.com',
        to: user.email,
        subject: 'Villa Frida Res - Password reset',
        html: emailContent,
        attachments,
      };
      await MailManager.sendEmail(emailPayload);
      const data = emailPayload;
      res.cookie('resetPasswordToken', resetPasswordToken, { maxAge: 3600000 });
      req.logger.info('Password reset email sent successfully');
      return res.sendSuccess({
        payload: {
          message: 'Password reset email sent successfully',
          data,
        },
      });
    } catch (error) {
      req.logger.error('Failed to reset password and send email');
      return res.sendServerError('Failed to reset password and send email');
    }
  };
  updateUserPremium = async (uid, updateFields, res, req) => {
    try {
      const allowedFields = ['role'];
      if (updateFields.hasOwnProperty('role') && !['user', 'premium'].includes(updateFields.role)) {
        return res.sendUserError('Eres un user premium. El campo role solo puedes cambiarlo a user o premium');
      }
      const user = await usersServices.findById(uid);
      if (!user) {
        return res.sendNotFound('User not found');
      }
      if (updateFields.role === 'premium') {
        if (user.premium_documents_status !== 'upload') {
          return res.sendUserError('You are a premium user. You can only change the role field to user or premium');
        }
      }
      const invalidFields = Object.keys(updateFields).filter((field) => !allowedFields.includes(field));
      if (invalidFields.length > 0) {
        return res.sendUserError(`The following fields cannot be modified: ${invalidFields.join(', ')}`);
      }
      const updatedUser = await usersServices.findByIdAndUpdate(uid, updateFields, { new: true });
      if (!updatedUser) {
        return res.sendNotFound('User not found');
      }
      req.app.io.emit('updateUser', updatedUser);

      const data = updatedUser;
      return res.sendSuccess({ message: 'User role updated successfully', payload: data });
    } catch (error) {
      return res.sendServerError('Error updating user');
    }
  };
  uploadDocuments = async (uid, res, req) => {
    try {
      const user = await usersServices.findById(uid);
      if (!user) {
        return res.sendNotFound('User not found');
      }
      if (!req.files || req.files.length === 0) {
        return res.sendUserError('No documents uploaded');
      }
      const documentInfo = req.files.map((file) => {
        return {
          name: file.filename,
          reference: file.destination,
          mimetype: file.mimetype,
          fieldname: file.fieldname,
        };
      });
      const newDocumentName = documentInfo[documentInfo.length - 1].name;
      user.documents.push(...documentInfo);
      const hasIdentificacion = user.documents.some((doc) => doc.fieldname === 'identification');
      const hasComprobanteDeDomicilio = user.documents.some((doc) => doc.fieldname === 'proofOfAddress');
      const hasComprobanteDeEstadoDeCuenta = user.documents.some((doc) => doc.fieldname === 'proofOfAccountStatus');

      if (hasIdentificacion && hasComprobanteDeDomicilio && hasComprobanteDeEstadoDeCuenta) {
        user.premium_documents_status = 'upload'; 
      } else {
        user.premium_documents_status = 'pending';
      }
      user.documents_status = 'upload';
      const savedUser = await user.save();
      const newlyCreatedDocument = savedUser.documents.find((doc) => doc.name === newDocumentName);
      if (newlyCreatedDocument) {
        const documentIds = documentInfo.map((file) => {
          const matchingDocument = savedUser.documents.find((doc) => doc.name === file.name);
          return matchingDocument._id;
        });
        const updatedDocumentInfo = documentInfo.map((file, index) => {
          return {
            id: documentIds[index],
            name: file.name,
            reference: file.reference,
            mimetype: file.mimetype,
            fieldname: file.fieldname,
          };
        });
        const data = {
          user: savedUser,
          documents: updatedDocumentInfo,
        };
        req.app.io.emit('newDocument', data);
        req.app.io.emit('newStatus', data);
        return res.sendSuccess({ message: 'Documents uploaded correctly', payload: data });
      } else {
        return res.sendServerError('Error uploading documents');
      }
    } catch (error) {
      return res.sendServerError('Error uploading documents');
    }
  };
  deleteDocumentById = async (uid, did, res, req) => {
    try {
      const user = await usersServices.findById(uid);
      if (!user) {
        return res.sendNotFound('User not found');
      }
      const documentIndex = user.documents.findIndex((doc) => doc._id.toString() === did);
      if (documentIndex === -1) {
        return res.sendNotFound('Document not found');
      }
      const deletedDocument = user.documents.splice(documentIndex, 1)[0];
      if (user.documents.length === 0) {
        user.documents_status = 'pending';
      }
      const hasIdentificacion = user.documents.some((doc) => doc.fieldname === 'identification');
      const hasComprobanteDeDomicilio = user.documents.some((doc) => doc.fieldname === 'proofOfAddress');
      const hasComprobanteDeEstadoDeCuenta = user.documents.some((doc) => doc.fieldname === 'proofOfAccountStatus');

      if (!hasIdentificacion || !hasComprobanteDeDomicilio || !hasComprobanteDeEstadoDeCuenta) {
        user.premium_documents_status = 'pending';
      }
      await user.save();

      const data = {
        deletedDocumentID: deletedDocument._id,
        remainingDocuments: user.documents,
        user: user,
      };
      req.app.io.emit('newStatus', data);
      return res.sendSuccess({
        message: 'Document deleted from user successfully',
        payload: data,
      });
    } catch (error) {
      return res.sendServerError('Error deleting document');
    }
  };
}
module.exports = new UsersServices();
