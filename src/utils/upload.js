const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Carpeta absoluta para guardar archivos
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

// Crear la carpeta si no existe
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuración de almacenamiento en disco
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname); // .jpg, .png, etc.
    const baseName = path.basename(file.originalname, ext);

    // nombre-limpio-1699999999999-random123.jpg
    const safeName = baseName
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]/g, '')
      .toLowerCase();

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);

    cb(null, `${safeName || 'photo'}-${uniqueSuffix}${ext}`);
  },
});

// Filtro: solo imágenes
function fileFilter(req, file, cb) {
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen'), false);
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

module.exports = {
  upload,
};
