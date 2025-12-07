const prisma = require('../config/prisma');
const path = require('path');

/**
 * POST /api/routes/:id/photos
 *  Necesita:
 *  - auth (isAuth)
 *  - upload.single('photo') (multer)
 */
async function uploadRoutePhoto(req, res) {
  try {
    const userId = req.user.id;
    const routeId = parseInt(req.params.id, 10);

    if (Number.isNaN(routeId)) {
      return res.status(400).json({ message: 'routeId inválido' });
    }

    // Comprobar que la ruta existe
    const route = await prisma.route.findUnique({
      where: { id: routeId },
    });

    if (!route) {
      return res.status(404).json({ message: 'Ruta no encontrada' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No se ha enviado ningún archivo' });
    }

    // Ruta pública
    const filename = req.file.filename;
    const publicUrl = `/uploads/${filename}`;

    const photo = await prisma.photo.create({
      data: {
        routeId,
        userId,
        url: publicUrl,
      },
    });

    return res.status(201).json({
      message: 'Foto subida correctamente',
      photo,
    });
  } catch (error) {
    console.error('Error en uploadRoutePhoto:', error);

    if (error.message && error.message.includes('Solo se permiten archivos de imagen')) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Error al subir foto' });
  }
}

/**
 * GET /api/routes/:id/photos
 * Lista las fotos de una ruta
 */
async function getRoutePhotos(req, res) {
  try {
    const routeId = parseInt(req.params.id, 10);

    if (Number.isNaN(routeId)) {
      return res.status(400).json({ message: 'routeId inválido' });
    }

    const photos = await prisma.photo.findMany({
      where: { routeId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res.json({
      data: photos.map((p) => ({
        id: p.id,
        url: p.url,
        createdAt: p.createdAt,
        user: p.user,
      })),
    });
  } catch (error) {
    console.error('Error en getRoutePhotos:', error);
    return res.status(500).json({ message: 'Error al obtener fotos' });
  }
}

module.exports = {
  uploadRoutePhoto,
  getRoutePhotos,
};
