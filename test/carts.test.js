const { app } = require('../src/index');
const chai = require('chai');
const expect = chai.expect;
const request = require('supertest');
const req = require('../src/utils/logger/loggerSetup');
const { cartsServices } = require('../src/repositories/index');
const getRandomEmail = () => {
  return `user${Math.floor(Math.random() * 10000)}@example.com`;
};
const registerUser = async (user) => {
  return request(app).post('/api/session/auth/register').send(user);
};
const loginUser = async (credentials) => {
  return request(app).post('/api/session/auth/login').send(credentials);
};
const createCart = async (cookie) => {
  return request(app).post('/api/carts').set('Cookie', `jwt=${cookie}`);
};
const getCart = async (cookie, cartId) => {
  return request(app).get(`/api/carts/${cartId}`).set('Cookie', `jwt=${cookie}`);
};
const deleteCart = async (cookie, cartId) => {
  return request(app).delete(`/api/carts/${cartId}`).set('Cookie', `jwt=${cookie}`);
};
describe('Villa Frida Api / Router for carts', () => {
  let adminCookie;

  before(async function () {
    this.timeout(10000); 
    const randomEmail = getRandomEmail();
    const adminUser = {
      first_name: 'Admin',
      last_name: 'Testing',
      email: randomEmail,
      age: 25,
      password: 'password123',
      role: 'admin',
    };
    await registerUser(adminUser);
    const loginResponse = await loginUser({ email: randomEmail, password: 'password123' });
    adminCookie = loginResponse.headers['set-cookie'][0].split(';')[0].split('=')[1];
  });
  it('POST /api/carts : You must create a cart correctly', async function () {
    const createCartResponse = await createCart(adminCookie);
    const cartId = createCartResponse.body.payload.payload.data._id;

    expect(createCartResponse.status).to.equal(201);
    expect(createCartResponse.body.success).to.be.true;
    expect(createCartResponse.body.payload.payload.message).to.equal('New shopping cart created');
    expect(typeof cartId).to.equal('string');
    expect(createCartResponse.body.payload.payload.data.products).to.be.an('array').that.is.empty;

    req.logger.test(`POST /api/carts ~ Cart create ~ cid: ${cartId}`);
  });

  it('GET /api/carts/:cid: It should return an empty array of products obtained from the cart by its id', async function () {
    const createCartResponse = await createCart(adminCookie);
    const cartId = createCartResponse.body.payload.payload.data._id;

    const getCartResponse = await getCart(adminCookie, cartId);

    expect(getCartResponse.status).to.equal(200);
    expect(getCartResponse.body.success).to.be.true;
    expect(getCartResponse.body.payload.payload.message).to.equal('Cart products obtained correctly');
    expect(typeof cartId).to.equal('string');
    expect(getCartResponse.body.payload.payload.data).to.be.an('array').that.is.empty;

    req.logger.test(`GET /api/carts/:cid ~ Cart get ~ cid: ${cartId}`);
    req.logger.test(`GET /api/carts/:cid ~ Cart get ~ array: ${JSON.stringify(getCartResponse.body.payload.payload.data, null, 2)}`);
  });

  it('DELETE /api/carts/:cid: You must delete the cart by its id', async function () {
    const createCartResponse = await createCart(adminCookie);
    const cartId = createCartResponse.body.payload.payload.data._id;
    const deleteCartResponse = await deleteCart(adminCookie, cartId);

    expect(deleteCartResponse.status).to.equal(200);
    expect(deleteCartResponse.body.success).to.be.true;
    expect(deleteCartResponse.body.payload.message).to.equal('Cart deleted successfully');
    expect(typeof cartId).to.equal('string');

    const cartInDB = await cartsServices.findById(cartId);
    expect(cartInDB).to.be.null;

    req.logger.test(`DELETE /api/carts/:cid ~ Cart delete ~ cid: ${cartId}`);
  });
});
