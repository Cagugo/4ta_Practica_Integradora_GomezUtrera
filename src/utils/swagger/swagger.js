const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const options = {
  swaggerDefinition: {
    openapi: '3.0.1',
    info: {
      title: 'Villa Frida Ecommerce api',
      version: '1.0.0',
      description: 'This API is created to manage your e-commerce',
    },
  },
  apis: [path.join(__dirname, '..', '..', 'docs', '**', '**.yaml')],
};
const specs = swaggerJsdoc(options);

module.exports = { swaggerUi, specs };
