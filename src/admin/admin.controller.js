const prisma = require('../config/prisma');
const slugify = require('../utils/slugify');
const fs = require('fs');
const path = require('path');

const allowedRoles = ['USER', 'ADMIN'];
const allowedDifficulties = ['EASY', 'MODERATE', 'HARD'];

function parseOptionalFloat(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isNaN(num) ? NaN : num;
}

function parseOptionalInt(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isNaN(num) ? NaN : Math.round(num);
}

async function listUsers(req, res) {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            reviews: true,
            favorites: true,
            photos: true,
          },
        },
      },
    });

    return res.json({ data: users });
  } catch (error) {
    console.error('Error al listar usuarios:', error);
    return res.status(500).json({ message: 'Error al listar usuarios' });
  }
}

async function updateUserRole(req, res) {
  try {
    const userId = parseInt(req.params.id, 10);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ message: 'userId inválido' });
    }

    const { role } = req.body || {};
    if (!role || !allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'role debe ser USER o ADMIN' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });

    return res.json({ message: 'Rol actualizado', user: updated });
  } catch (error) {
    console.error('Error al actualizar rol:', error);
    return res.status(500).json({ message: 'Error al actualizar rol' });
  }
}

async function deleteUser(req, res) {
  try {
    const userId = parseInt(req.params.id, 10);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ message: 'userId inválido' });
    }

    if (req.user && req.user.id === userId) {
      return res.status(400).json({ message: 'No puedes borrar tu propio usuario' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    await prisma.$transaction([
      prisma.review.deleteMany({ where: { userId } }),
      prisma.favorite.deleteMany({ where: { userId } }),
      prisma.photo.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    return res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    return res.status(500).json({ message: 'Error al eliminar usuario' });
  }
}

async function listReviews(req, res) {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        route: { select: { id: true, title: true, slug: true } },
      },
    });

    return res.json({ data: reviews });
  } catch (error) {
    console.error('Error al listar reviews:', error);
    return res.status(500).json({ message: 'Error al listar reviews' });
  }
}

async function deleteReview(req, res) {
  try {
    const reviewId = parseInt(req.params.id, 10);
    if (Number.isNaN(reviewId)) {
      return res.status(400).json({ message: 'reviewId inválido' });
    }

    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      return res.status(404).json({ message: 'Review no encontrada' });
    }

    await prisma.review.delete({ where: { id: reviewId } });
    return res.json({ message: 'Review eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar review:', error);
    return res.status(500).json({ message: 'Error al eliminar review' });
  }
}

async function listRoutes(req, res) {
  try {
    const routes = await prisma.route.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ data: routes });
  } catch (error) {
    console.error('Error al listar rutas:', error);
    return res.status(500).json({ message: 'Error al listar rutas' });
  }
}

async function updateRoute(req, res) {
  try {
    const routeId = parseInt(req.params.id, 10);
    if (Number.isNaN(routeId)) {
      return res.status(400).json({ message: 'routeId inválido' });
    }

    const existing = await prisma.route.findUnique({ where: { id: routeId } });
    if (!existing) {
      return res.status(404).json({ message: 'Ruta no encontrada' });
    }

    const {
      title,
      description,
      difficulty,
      distanceKm,
      ascentM,
      startLat,
      startLng,
      endLat,
      endLng,
    } = req.body || {};

    const data = {};

    if (title) {
      const newSlug = slugify(title);
      const slugExists = await prisma.route.findUnique({ where: { slug: newSlug } });
      if (slugExists && slugExists.id !== routeId) {
        return res.status(409).json({ message: 'El título genera un slug ya existente' });
      }
      data.title = title;
      data.slug = newSlug;
    }

    if (description !== undefined) {
      data.description = description || null;
    }

    if (difficulty) {
      if (!allowedDifficulties.includes(difficulty)) {
        return res.status(400).json({
          message: `difficulty debe ser uno de: ${allowedDifficulties.join(', ')}`,
        });
      }
      data.difficulty = difficulty;
    }

    if (distanceKm !== undefined) {
      const parsed = parseOptionalFloat(distanceKm);
      if (Number.isNaN(parsed)) {
        return res.status(400).json({ message: 'distanceKm debe ser un número' });
      }
      data.distanceKm = parsed;
    }

    if (ascentM !== undefined) {
      const parsed = parseOptionalInt(ascentM);
      if (Number.isNaN(parsed)) {
        return res.status(400).json({ message: 'ascentM debe ser un número' });
      }
      data.ascentM = parsed;
    }

    if (startLat !== undefined) {
      const parsed = parseOptionalFloat(startLat);
      if (Number.isNaN(parsed)) {
        return res.status(400).json({ message: 'startLat inválido' });
      }
      data.startLat = parsed;
    }

    if (startLng !== undefined) {
      const parsed = parseOptionalFloat(startLng);
      if (Number.isNaN(parsed)) {
        return res.status(400).json({ message: 'startLng inválido' });
      }
      data.startLng = parsed;
    }

    if (endLat !== undefined) {
      const parsed = parseOptionalFloat(endLat);
      if (Number.isNaN(parsed)) {
        return res.status(400).json({ message: 'endLat inválido' });
      }
      data.endLat = parsed;
    }

    if (endLng !== undefined) {
      const parsed = parseOptionalFloat(endLng);
      if (Number.isNaN(parsed)) {
        return res.status(400).json({ message: 'endLng inválido' });
      }
      data.endLng = parsed;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'Nada que actualizar' });
    }

    const updated = await prisma.route.update({
      where: { id: routeId },
      data,
    });

    return res.json({ message: 'Ruta actualizada', route: updated });
  } catch (error) {
    console.error('Error al actualizar ruta:', error);
    return res.status(500).json({ message: 'Error al actualizar ruta' });
  }
}

async function deleteRoute(req, res) {
  try {
    const routeId = parseInt(req.params.id, 10);
    if (Number.isNaN(routeId)) {
      return res.status(400).json({ message: 'routeId inválido' });
    }

    const route = await prisma.route.findUnique({ where: { id: routeId } });
    if (!route) {
      return res.status(404).json({ message: 'Ruta no encontrada' });
    }

    await prisma.$transaction([
      prisma.favorite.deleteMany({ where: { routeId } }),
      prisma.review.deleteMany({ where: { routeId } }),
      prisma.photo.deleteMany({ where: { routeId } }),
      prisma.waypoint.deleteMany({ where: { routeId } }),
      prisma.route.delete({ where: { id: routeId } }),
    ]);

    return res.json({ message: 'Ruta eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar la ruta:', error);
    return res.status(500).json({ message: 'Error al eliminar la ruta' });
  }
}

async function listPhotos(req, res) {
  try {
    const photos = await prisma.photo.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        route: { select: { id: true, title: true, slug: true } },
      },
    });

    return res.json({ data: photos });
  } catch (error) {
    console.error('Error al listar fotos:', error);
    return res.status(500).json({ message: 'Error al listar fotos' });
  }
}

async function deletePhoto(req, res) {
  try {
    const photoId = parseInt(req.params.id, 10);
    if (Number.isNaN(photoId)) {
      return res.status(400).json({ message: 'photoId inválido' });
    }

    const photo = await prisma.photo.findUnique({ where: { id: photoId } });
    if (!photo) {
      return res.status(404).json({ message: 'Foto no encontrada' });
    }

    await prisma.photo.delete({ where: { id: photoId } });

    if (photo.url && photo.url.startsWith('/uploads/')) {
      const filename = path.basename(photo.url);
      const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
      const fullPath = path.join(uploadsDir, filename);
      try {
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (error) {
        console.error('No se pudo eliminar el archivo de la foto:', error);
      }
    }

    return res.json({ message: 'Foto eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar la foto:', error);
    return res.status(500).json({ message: 'Error al eliminar la foto' });
  }
}

module.exports = {
  listUsers,
  updateUserRole,
  deleteUser,
  listReviews,
  deleteReview,
  listRoutes,
  updateRoute,
  deleteRoute,
  listPhotos,
  deletePhoto,
};
