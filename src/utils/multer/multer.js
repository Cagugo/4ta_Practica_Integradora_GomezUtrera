const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const req = require('../../utils/logger/loggerSetup');
const storageBasePath = './src/uploads';
const createFolderIfNotExists = (folder) => {
  const folderPath = path.join(storageBasePath, folder);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    req.logger.info('Folder created by Multer');
  }
};
const storage = (folder) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      createFolderIfNotExists(folder);
      cb(null, path.join(storageBasePath, folder));
    },
    filename: (req, file, cb) => {
      const uniquePrefix = uuidv4().slice(0, 4);
      cb(null, uniquePrefix + '-' + file.originalname);
    },
  });
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf', 'image/webp', 'image/svg+xml', 'image/jpg'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'));
  }
};
const uploadProfiles = multer({
  storage: storage('profiles'),
  fileFilter: fileFilter,
});
const uploadProducts = multer({
  storage: storage('products'),
  fileFilter: fileFilter,
});
const uploadDocuments = multer({
  storage: storage('documents'),
  fileFilter: fileFilter,
});
module.exports = {
  uploadProfiles,
  uploadProducts,
  uploadDocuments,
};
