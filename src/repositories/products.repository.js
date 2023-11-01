const { Product } = require('../models/products');
const BaseRepository = require('./base.repository');

class ProductsRepository extends BaseRepository {
  constructor() {
    super(Product);
  }
  async populateOwner(product) {
    try {
      await product.populate('owner');
      return product;
    } catch (error) {
      throw error; 
    }
  }
}
module.exports = ProductsRepository;
