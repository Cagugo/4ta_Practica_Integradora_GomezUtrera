const CustomRouter = require('../../routes/router');
const usersController = require('./usersController/usersController');
const { validateUserId, validateDocumentId } = require('../../utils/routes/routerParams');
const { uploadProfiles, uploadProducts, uploadDocuments } = require('../../utils/multer/multer');

class UsersRoutes extends CustomRouter {
  constructor() {
    super();
    this.setupRoutes();
  }
  setupRoutes() {
    this.router.param('uid', validateUserId);
    this.router.param('did', validateDocumentId);

    const basePath = '/api/users';
    this.post(`${basePath}/register`, ['PUBLIC'], usersController.registerUser);
    this.post(`${basePath}/add`, ['PUBLIC'], usersController.addUser);
    this.post(`${basePath}/recovery`, ['PUBLIC'], usersController.recoveryUser);
    this.post(`${basePath}/resetpass`, ['PUBLIC'], usersController.resetPass);
    this.get(`${basePath}/resetpassbyemail`, ['PUBLIC'], usersController.resetPassByEmail);
    this.get(`${basePath}/`, ['ADMIN'], usersController.getUsers);
    this.get(`${basePath}/:uid`, ['ADMIN'], usersController.getUserById);
    this.put(`${basePath}/:uid`, ['ADMIN'], usersController.updateUser);
    this.delete(`${basePath}/:uid`, ['ADMIN'], usersController.deleteUser);
    this.put(`${basePath}/premium/:uid`, ['PREMIUM', 'USER', 'ADMIN'], usersController.updateUserPremium);
    this.post(`${basePath}/:uid/documents/identificacion`, ['ADMIN', 'USER', 'PREMIUM'], uploadDocuments.array('identificacion'), usersController.uploadDocuments);
    this.post(`${basePath}/:uid/documents/comprobanteDeDomicilio`, ['ADMIN', 'USER', 'PREMIUM'], uploadDocuments.array('comprobanteDeDomicilio'), usersController.uploadDocuments);
    this.post(`${basePath}/:uid/documents/comprobanteDeEstadoDeCuenta`, ['ADMIN', 'USER', 'PREMIUM'], uploadDocuments.array('comprobanteDeEstadoDeCuenta'), usersController.uploadDocuments);
    this.post(`${basePath}/:uid/documents`, ['ADMIN', 'USER', 'PREMIUM'], uploadDocuments.array('document'), usersController.uploadDocuments);
    this.delete(`${basePath}/:uid/documents/:did`, ['ADMIN', 'USER', 'PREMIUM'], usersController.deleteDocumentById);
  }
}
module.exports = new UsersRoutes();
