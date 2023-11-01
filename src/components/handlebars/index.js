const CustomRouter = require('../../routes/router');
const handlebarsController = require('./handlebarsController/handlebarsController');
const { validateCartId } = require('../../utils/routes/routerParams');

class HandlebarsRoutes extends CustomRouter {
  constructor() {
    super();
    this.setupRoutes();
  }
  setupRoutes() {
    this.router.param('cid', validateCartId);
    this.get('/', ['PUBLIC'], handlebarsController.getLogin);
    this.get('/register', ['PUBLIC'], handlebarsController.getRegister);
    this.get('/recovery', ['PUBLIC'], handlebarsController.getRecovery);
    this.get('/resetpassbyemail', ['PUBLIC'], handlebarsController.getResetPassByEmail);
    this.get('/resetpass/:token', ['PUBLIC'], handlebarsController.getResetPass);
    this.get('/resetpassexpiredtoken', ['PUBLIC'], handlebarsController.getResetPassExpiredToken);
    this.get('/products', ['USER', 'PREMIUM'], handlebarsController.getProducts);
    this.get('/carts/:cid', ['USER', 'PREMIUM'], handlebarsController.getCartProductById);
    this.get('/user', ['USER', 'PREMIUM'], handlebarsController.getUser);
    this.get('/user/dashboard', ['USER', 'PREMIUM'], handlebarsController.getUserDashboard);
    this.get('/chat', ['USER', 'PREMIUM'], handlebarsController.getChat);
    this.get('/admin', ['ADMIN', 'PREMIUM'], handlebarsController.getAdmin);
    this.get('/admin/dashboard/products', ['ADMIN', 'PREMIUM'], handlebarsController.getAdminDashboardProducts);
    this.get('/realtimeproducts', ['ADMIN', 'PREMIUM'], handlebarsController.getRealTimeProducts);
    this.get('/home', ['ADMIN', 'PREMIUM'], handlebarsController.getHomeProducts);
    this.get('/current', ['USER', 'ADMIN', 'PREMIUM'], handlebarsController.getCurrent);
  }
}
module.exports = new HandlebarsRoutes();
