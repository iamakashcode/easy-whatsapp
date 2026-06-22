module.exports = (err, req, res, next) => {
  console.error(err);

  // Multer upload errors (e.g. file too large, wrong field) → clean 400
  if (err.name === 'MulterError') {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Image must be under 5 MB' : `Upload error: ${err.message}`;
    return res.status(400).json({ error: msg });
  }

  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({ error: message });
};
