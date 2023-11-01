const UsersServices = require('../usersServices/usersServices');

class UsersController {
  getUsers = async (req, res) => {
    return await UsersServices.getUsers(req, res);
  };
  registerUser = async (req, res) => {
    const payload = req.body;
    return await UsersServices.registerUser(req, payload, res);
  };
  addUser = async (req, res) => {
    const payload = req.body;
    return await UsersServices.addUser(payload, res);
  };
  recoveryUser = async (req, res) => {
    const { email, password } = req.body;
    return await UsersServices.recoveryUser({ email, password, res });
  };
  getUserById = async (req, res) => {
    const { uid } = req.params;
    return await UsersServices.getUserById(uid, res);
  };
  updateUser = async (req, res) => {
    const { uid } = req.params;
    const updateFields = req.body;
    return await UsersServices.updateUser(uid, updateFields, res, req);
  };
  deleteUser = async (req, res) => {
    const { uid } = req.params;
    return await UsersServices.deleteUser(uid, res, req);
  };
  resetPass = async (req, res) => {
    const { email, password } = req.body;
    return await UsersServices.resetPass({ email, password, res, req });
  };
  resetPassByEmail = async (req, res) => {
    const { email } = req.query;
    await UsersServices.resetPassByEmail(email, res, req);
  };
  updateUserPremium = async (req, res) => {
    const { uid } = req.params;
    const updateFields = req.body;
    return await UsersServices.updateUserPremium(uid, updateFields, res, req);
  };
  uploadDocuments = async (req, res) => {
    const { uid } = req.params;
    const result = await UsersServices.uploadDocuments(uid, res, req);
    return result;
  };
  deleteDocumentById = async (req, res) => {
    const { uid, did } = req.params;
    return await UsersServices.deleteDocumentById(uid, did, res, req);
  };
}
module.exports = new UsersController();
