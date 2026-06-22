const multer = require('multer');

const storage = multer.memoryStorage();

const csvFilter = (req, file, cb) => {
  if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed'), false);
  }
};

module.exports = multer({ storage, fileFilter: csvFilter });
