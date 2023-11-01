const { cartsServices } = require('../../../repositories/index');
const { productsServices } = require('../../../repositories/index');
const { ticketsServices } = require('../../../repositories/index');
const { Ticket } = require('../../../models/tickets');
const jwtUtils = require('../../../utils/jwt/jwt');
const { v4: uuidv4 } = require('uuid');
const MailManager = require('../../../utils/mailManager/mailManager');
const path = require('path');

class CartsServices {
  constructor() {
    this.initializeCartCollection();
  }
  initializeCartCollection = async () => {
    try {
      const cartCount = await cartsServices.countDocuments();
      if (cartCount === 0) {
        await cartsServices.create({ products: [] });
      }
    } catch (error) {
      console.error('Error initializing cart collection in databases', error);
    }
  };

  getCarts = async (res) => {
    try {
      const carts = await cartsServices.findAll();
      const data = carts;
      return res.sendSuccess({
        payload: {
          message: 'Shopping cart was send correctly',
          data,
        },
      });
    } catch (error) {
      return res.sendServerError('Error getting shopping carts');
    }
  };
  addCart = async (res) => {
    try {
      const newCart = await cartsServices.create({ products: [] });
      const data = newCart;
      return res.sendCreated({
        payload: {
          message: 'New cart created',
          data,
        },
      });
    } catch (error) {
      return res.sendServerError('Error creating cart');
    }
  };
  getCartProductById = async (cid, res) => {
    try {
      const cart = await cartsServices.findById(cid, { path: 'products.productId' });
      if (!cart) {
        return res.sendNotFound('Cart not found');
      }
      const data = cart.products;
      return res.sendSuccess({
        payload: {
          message: 'Cart products obtained correctly',
          data,
        },
      });
    } catch (error) {
      return res.sendServerError('Error getting cart products');
    }
  };
  addProductToCart = async (cid, pid, quantity, res, req) => {
    try {
      const cart = await cartsServices.findById(cid);
      if (!cart) {
        return res.sendNotFound('Cart not found');
      }
      const product = await productsServices.findById(pid);
      if (!product) {
        return res.sendNotFound('Product ID not found');
      }
      const userData = req.session.user || req.user;

      if (userData && userData.role === 'premium' && product.owner === userData._id) {
        return res.sendServerError('You cannot add the product created as owner premium to the created cart ');
      }
      const productIndex = cart.products.findIndex((p) => p.productId.toString() === pid);
      if (productIndex === -1) {
        const newProduct = {
          productId: pid,
          quantity: quantity || 1,
        };
        cart.products.push(newProduct);
      } else {
        cart.products[productIndex].quantity += quantity || 1;
      }
      await cartsServices.save(cart);
      const data = cart;
      return res.sendSuccess({
        message: 'Product added to cart successfully',
        payload: data,
      });
    } catch (error) {
      return res.sendServerError('Error adding product to cart');
    }
  };
  deleteCart = async (cid, res) => {
    try {
      const cart = await cartsServices.findById(cid);
      if (!cart) {
        return res.sendNotFound('Cart not found');
      }
      await cartsServices.deleteOne(cart);
      const data = cart;
      return res.sendSuccess({
        message: 'Cart successfully deleted',
        payload: data,
      });
    } catch (error) {
      return res.sendServerError('Error deleting cart');
    }
  };
  deleteProductFromCart = async (cid, pid, res) => {
    try {
      const cart = await cartsServices.findById(cid);
      if (!cart) {
        return res.sendNotFound('Cart not found');
      }
      const productIndex = cart.products.findIndex((p) => p.productId.toString() === pid);
      if (productIndex === -1) {
        return res.sendNotFound('Product not found in cart');
      }
      cart.products.splice(productIndex, 1);
      await cartsServices.save(cart);
      const data = cart;
      return res.sendSuccess({
        message: 'Product removed from cart successfully',
        payload: data,
      });
    } catch (error) {
      return res.sendServerError('Error removing product from cart');
    }
  };
  updateCart = async (cid, products, res) => {
    try {
      const cart = await cartsServices.findById(cid);
      if (!cart) {
        return res.sendNotFound('Cart not found');
      }
      cart.products = products;
      await cartsServices.save(cart);
      const data = cart;
      return res.sendSuccess({
        message: 'Cart updated successfully',
        payload: data,
      });
    } catch (error) {
      return res.sendServerError('Error updating cart');
    }
  };
  updateProductQuantity = async (cid, pid, quantity, res) => {
    try {
      const cart = await cartsServices.findById(cid);
      if (!cart) {
        return res.sendNotFound('Cart not found');
      }
      const productIndex = cart.products.findIndex((p) => p.productId.toString() === pid);
      if (productIndex === -1) {
        return res.sendNotFound('Product not found in cart');
      }
      cart.products[productIndex].quantity = quantity;
      return res.sendSuccess({
        message: 'Product Quantity Updated Successfully',
        payload: data,
      });
    } catch (error) {
      return res.sendServerError('Error updating the quantity of product in the cart');
    }
  };
  deleteAllProductsFromCart = async (cid, res) => {
    try {
      const cart = await cartsServices.findByIdAndUpdate(cid, { $set: { products: [] } }, { new: true });
      if (!cart) {
        return res.sendNotFound('Cart not found');
      }
      const data = cart;
      return res.sendSuccess({
        message: 'All products removed from cart',
        payload: data,
      });
    } catch (error) {
      return res.sendServerError('Error removing all products from cart');
    }
  };
  purchaseCart = async (cid, req, res) => {
    const ticketCode = uuidv4();
    try {
      const cart = await cartsServices.findById(cid);
      if (!cart) {
        return res.sendNotFound('Cart not found');
      }
      const productsToPurchase = cart.products;
      const productsNotPurchased = [];
      if (productsToPurchase.length === 0) {
        return res.sendNotFound('No products found in the cart');
      }
      for (const productData of productsToPurchase) {
        const { productId, quantity } = productData;
        const product = await productsServices.findById(productId);
        if (product && product.stock >= quantity) {
          product.stock -= quantity;
          await productsServices.save(product);
        } else {
          productsNotPurchased.push(productId);
        }
      }
      const jwtToken = req.cookies.jwt;
      let username = null;
      if (jwtToken) {
        const decodedToken = await jwtUtils.verify(jwtToken);
        if (decodedToken) {
          username = decodedToken.email;
        }
      }
      if (!username && req.session.user) {
        username = req.session.user.email;
      }
      const ticket = new Ticket({
        code: ticketCode,
        purchase_datetime: Date.now(),
        amount: productsToPurchase.length - productsNotPurchased.length,
        purchaser: username,
      });
      await ticketsServices.create(ticket);
      cart.products = productsToPurchase.filter((productData) => productsNotPurchased.includes(productData.productId));

      await cartsServices.save(cart);

      if (productsNotPurchased.length === 0) {
        return res.sendSuccess({
          message: 'Successful purchase. All products were purchased.',
          payload: {
            productsPurchased: productsToPurchase,
          },
        });
      } else {
        return res.sendSuccess({
          message: 'Partial purchase. Some products could not be purchased.',
          payload: {
            productsNotPurchased,
          },
        });
      }
    } catch (error) {
      return res.sendServerError('Error processing the purchase');
    }
  };
  purchaseCartMail = async (cid, req, res) => {
    const ticketCode = uuidv4();
    try {
      const cart = await cartsServices.findById(cid);
      if (!cart) {
        return res.sendNotFound('Cart not found');
      }
      const productsToPurchase = cart.products;
      const productsNotPurchased = [];
      if (productsToPurchase.length === 0) {
        return res.sendNotFound('No products found in the cart');
      }
      for (const productData of productsToPurchase) {
        const { productId, quantity } = productData;
        const product = await productsServices.findById(productId);
        if (product && product.stock >= quantity) {
          product.stock -= quantity;
          await productsServices.save(product);
        } else {
          productsNotPurchased.push(productId);
        }
      }
      const jwtToken = req.cookies.jwt;
      let username = null;
      if (jwtToken) {
        const decodedToken = await jwtUtils.verify(jwtToken);
        if (decodedToken) {
          username = decodedToken.email;
        }
      }
      if (!username && req.session.user) {
        username = req.session.user.email;
      }
      const ticket = new Ticket({
        code: ticketCode,
        purchase_datetime: Date.now(),
        amount: productsToPurchase.length - productsNotPurchased.length,
        purchaser: username,
      });
      await ticketsServices.create(ticket);
      cart.products = productsToPurchase.filter((productData) => productsNotPurchased.includes(productData.productId));
      await cartsServices.save(cart);

      const emailContent = `
        <h1>Result of purchase</h1>
        <p>Ticket Code: ${ticketCode}</p>
        <p>Username: ${username}</p>
        <p>Total Products: ${productsToPurchase.length}</p>
        <p>Products Purchased: ${productsToPurchase.length - productsNotPurchased.length}</p>
        <p>Products Not Purchased: ${productsNotPurchased.length}</p>
        <!-- Add any other information you want in the email -->
        <h2>Purchased Products</h2>
        <ul>
          ${productsToPurchase.map((productData) => `<li>${productData.productId}: ${productData.quantity}</li>`).join('')}
        </ul>
      `;

      const attachments = [
        {
          filename: 'vf.png',
          path: path.join(__dirname, '../../../uploads/mail/vf.png'),
        },
      ];
      const emailPayload = {
        from: 'carlosgomez_87@gmail.com',
        to: username,
        subject: 'Villa Frida - Shop',
        html: emailContent,
        attachments,
      };
      await MailManager.sendEmail(emailPayload);
      if (productsNotPurchased.length === 0) {
        return res.sendSuccess({
          message: 'Successful purchase. All products were purchased.',
          payload: {
            productsPurchased: productsToPurchase,
          },
        });
      } else {
        return res.sendSuccess({
          message: 'Partial purchase. Some products could not be purchased.',
          payload: {
            productsNotPurchased,
          },
        });
      }
    } catch (error) {
      return res.sendServerError('Error processing the purchase and sending the email');
    }
  };
}
module.exports = new CartsServices();