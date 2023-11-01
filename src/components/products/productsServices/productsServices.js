const { Product } = require('../../../models/products');
const { productsServices } = require('../../../repositories/index');
const CustomError = require('../../../utils/errors/services/customError');
const EErrors = require('../../../utils/errors/services/enums');
const { generateProductErrorInfo } = require('../../../utils/errors/services/info');

class ProductsServices {
  getAllProducts = async (limit, page, sort, query, res) => {
    try {
      const options = {
        limit: limit ? parseInt(limit) : 10,
        page: page ? parseInt(page) : 1,
        sort: sort === 'asc' ? { price: 1 } : sort === 'desc' ? { price: -1 } : undefined,
      };
      const filter = query
        ? query === '0'
          ? {
              $or: [{ category: query }, { stock: 0 }],
            }
          : { category: query }
        : {};
      const result = await productsServices.paginate(filter, options);
      if (page && !/^\d+$/.test(page)) {
        return res.sendUserError('The page must be a valid number');
      } else if (page && (parseInt(page) < 1 || parseInt(page) > result.totalPages)) {
        return res.sendUserError('The page number does not exist');
      } else {
        const data = {
          status: 'success',
          payload: result.docs,
          totalPages: result.totalPages,
          prevPage: result.prevPage || null,
          nextPage: result.nextPage || null,
          page: result.page,
          hasPrevPage: result.hasPrevPage,
          hasNextPage: result.hasNextPage,
          prevLink: result.hasPrevPage ? `/products?limit=${options.limit}&page=${result.prevPage}&sort=${sort}&query=${query}` : null,
          nextLink: result.hasNextPage ? `/products?limit=${options.limit}&page=${result.nextPage}&sort=${sort}&query=${query}` : null,
        };
        return res.sendSuccess({ message: 'All Products', payload: data });
      }
    } catch (error) {
      return res.sendServerError('Error getting products');
    }
  };
  addProduct = async (payload, images, res, req) => {
    try {
      const { title, description, code, price, stock, category } = payload;
      const userData = req.session.user || req.user;
      req.logger.debug('UserData', userData);

      if (!title || !description || !code || !price || !stock || !category) {
        try {
          CustomError.createError({
            name: 'Product creation error',
            cause: generateProductErrorInfo({ title, description, code, price, stock, category }),
            message: 'Error Trying to create Product',
            code: EErrors.INVALID_TYPES_ERROR,
          });
        } catch (error) {
          console.error('Error in CustomError:', error);
        }
        return res.sendServerError('Some fields are required');
      } else {
        const existingProduct = await productsServices.findOne({ code: code });
        if (existingProduct) {
          return res.sendUserError('The product with this code already exists');
        } else {
          const owner = userData.role === 'premium' ? userData._id : 'admin';
          const newProduct = new Product({
            title,
            description,
            code,
            price,
            stock,
            category,
            thumbnails: images && images.length > 0 ? images.map((image) => image.filename) : [],
            owner: owner,
          });
          await productsServices.save(newProduct);
          await productsServices.populateOwner(newProduct);

          req.app.io.emit('newProduct', newProduct);
          const totalProducts = await productsServices.countDocuments({});
          req.app.io.emit('totalProductsUpdate', totalProducts);

          const data = newProduct;
          return res.sendCreated({ message: 'Product added successfully', payload: data });
        }
      }
    } catch (error) {
      return res.sendServerError('Error adding product');
    }
  };
  getProductById = async (pid, res) => {
    try {
      const product = await productsServices.findById(pid);

      if (!product) {
        return res.sendNotFound('Product not found');
      } else {
        const data = product;
        return res.sendSuccess(data);
      }
    } catch (error) {
      return res.sendServerError('Error getting product');
    }
  };
  updateProduct = async (pid, updateFields, res, req) => {
    try {
      const allowedFields = ['title', 'description', 'code', 'price', 'stock', 'category', 'image'];

      const invalidFields = Object.keys(updateFields).filter((field) => !allowedFields.includes(field));
      if (invalidFields.length > 0) {
        return res.sendUserError(`These fields cannot be modified: ${invalidFields.join(', ')}`);
      } else {
        const product = await productsServices.findById(pid);

        if (!product) {
          return res.sendNotFound('Product not found');
        }
        const userData = req.session.user || req.user;

        if (userData.role === 'premium' && product.owner !== userData._id) {
          return res.sendUserError('This product was not created as a Premium user. You do not have permissions to update this product');
        }
        const updatedProduct = await productsServices.findByIdAndUpdate(pid, updateFields, { new: true });

        req.app.io.emit('updateProduct', updatedProduct);
        const data = updatedProduct;
        return res.sendSuccess({ message: 'Product updated successfully', payload: data });
      }
    } catch (error) {
      return res.sendServerError('Error updating the product');
    }
  };
  deleteProduct = async (pid, res, req) => {
    try {
      const product = await productsServices.findById(pid);

      if (!product) {
        return res.sendNotFound('Product not found');
      }
      const userData = req.session.user || req.user;

      if (userData.role === 'premium' && product.owner !== userData._id) {
        return res.sendUserError('This product was not created as a Premium user. You do not have permissions to update this product');
      }
      const deletedProduct = await productsServices.findByIdAndDelete(pid);

      if (!deletedProduct) {
        return res.sendNotFound('Product not found');
      }
      req.app.io.emit('deleteProduct', pid);
      const data = deletedProduct;
      const totalProducts = await productsServices.countDocuments({});
      req.app.io.emit('totalProductsUpdate', totalProducts);

      return res.sendSuccess({ message: 'Product successfully removed', payload: data });
    } catch (error) {
      return res.sendServerError('Error deleting product');
    }
  };
  getProducts = async (limit, page, sort, query, res) => {
    try {
      const options = {
        limit: limit ? parseInt(limit) : 10,
        page: page ? parseInt(page) : 1,
      };
      const filter = query
        ? query === '0'
          ? {
              $or: [{ category: query }, { stock: 0 }],
            }
          : { category: query }
        : {};
      const result = await productsServices.paginate(filter, options);
      const formattedProducts = result.docs.map((product) => {
        return {
          _id: product._id,
          title: product.title,
          description: product.description,
          code: product.code,
          price: product.price,
          stock: product.stock,
          category: product.category,
          owner: product.owner,
        };
      });
      const totalPages = result.totalPages;
      const currentPage = result.page;
      const hasPrevPage = result.hasPrevPage;
      const hasNextPage = result.hasNextPage;
      const prevPage = result.hasPrevPage ? result.prevPage : null;
      const nextPage = result.hasNextPage ? result.nextPage : null;
      const prevLink = result.hasPrevPage ? `/products?limit=${options.limit}&page=${result.prevPage}` : null;
      const nextLink = result.hasNextPage ? `/products?limit=${options.limit}&page=${result.nextPage}` : null;

      return {
        products: formattedProducts,
        hasPrevPage,
        hasNextPage,
        prevPage,
        nextPage,
        totalPages,
        currentPage,
        prevLink,
        nextLink,
      };
    } catch (error) {
      return res.sendServerError('Error handlebars');
    }
  };
  getAdminProducts = async (limit, page, sort, query, res) => {
    try {
      const options = {
        limit: limit ? parseInt(limit) : 10,
        page: page ? parseInt(page) : 1,
      };
      const filter = query
        ? query === '0'
          ? {
              $or: [{ category: query }, { stock: 0 }],
            }
          : { category: query }
        : {};
      const result = await productsServices.paginate(filter, options);
      const formattedProducts = result.docs.map((product) => {
        return {
          _id: product._id,
          title: product.title,
          description: product.description,
          code: product.code,
          price: product.price,
          stock: product.stock,
          category: product.category,
          thumbnails: product.thumbnails,
          owner: product.owner,
        };
      });
      const totalPages = result.totalPages;
      const currentPage = result.page;
      const hasPrevPage = result.hasPrevPage;
      const hasNextPage = result.hasNextPage;
      const prevPage = result.hasPrevPage ? result.prevPage : null;
      const nextPage = result.hasNextPage ? result.nextPage : null;
      const prevLink = result.hasPrevPage ? `/admin/products?limit=${options.limit}&page=${result.prevPage}` : null;
      const nextLink = result.hasNextPage ? `/admin/products?limit=${options.limit}&page=${result.nextPage}` : null;

      return {
        products: formattedProducts,
        hasPrevPage,
        hasNextPage,
        prevPage,
        nextPage,
        totalPages,
        currentPage,
        prevLink,
        nextLink,
      };
    } catch (error) {
      return res.sendServerError('Error handlebars');
    }
  };
  getRealTimeProducts = async (limit, page, sort, query, res) => {
    try {
      const options = {
        limit: limit ? parseInt(limit) : 10,
        page: page ? parseInt(page) : 1,
      };
      const filter = query
        ? query === '0'
          ? {
              $or: [{ category: query }, { stock: 0 }],
            }
          : { category: query }
        : {};
      const result = await productsServices.paginate(filter, options);
      const formattedProducts = result.docs.map((product) => {
        return {
          _id: product._id,
          title: product.title,
          description: product.description,
          code: product.code,
          price: product.price,
          stock: product.stock,
          category: product.category,
        };
      });
      const totalPages = result.totalPages;
      const currentPage = result.page;
      const hasPrevPage = result.hasPrevPage;
      const hasNextPage = result.hasNextPage;
      const prevPage = result.hasPrevPage ? result.prevPage : null;
      const nextPage = result.hasNextPage ? result.nextPage : null;
      const prevLink = result.hasPrevPage ? `/realtimeproducts?limit=${options.limit}&page=${result.prevPage}` : null;
      const nextLink = result.hasNextPage ? `/realtimeproducts?limit=${options.limit}&page=${result.nextPage}` : null;

      return {
        products: formattedProducts,
        hasPrevPage,
        hasNextPage,
        prevPage,
        nextPage,
        totalPages,
        currentPage,
        prevLink,
        nextLink,
      };
    } catch (error) {
      return res.sendServerError('Error handlebars');
    }
  };
  getHomeProducts = async (limit, page, sort, query, res) => {
    try {
      const options = {
        limit: limit ? parseInt(limit) : 10,
        page: page ? parseInt(page) : 1,
      };
      const filter = query
        ? query === '0'
          ? {
              $or: [{ category: query }, { stock: 0 }],
            }
          : { category: query }
        : {};
      const result = await productsServices.paginate(filter, options);
      const formattedProducts = result.docs.map((product) => {
        return {
          _id: product._id,
          title: product.title,
          description: product.description,
          code: product.code,
          price: product.price,
          stock: product.stock,
          category: product.category,
        };
      });
      const totalPages = result.totalPages;
      const currentPage = result.page;
      const hasPrevPage = result.hasPrevPage;
      const hasNextPage = result.hasNextPage;
      const prevPage = result.hasPrevPage ? result.prevPage : null;
      const nextPage = result.hasNextPage ? result.nextPage : null;
      const prevLink = result.hasPrevPage ? `/home?limit=${options.limit}&page=${result.prevPage}` : null;
      const nextLink = result.hasNextPage ? `/home?limit=${options.limit}&page=${result.nextPage}` : null;

      return {
        products: formattedProducts,
        hasPrevPage,
        hasNextPage,
        prevPage,
        nextPage,
        totalPages,
        currentPage,
        prevLink,
        nextLink,
      };
    } catch (error) {
      return res.sendServerError('Error handlebars');
    }
  };
}
module.exports = new ProductsServices();
