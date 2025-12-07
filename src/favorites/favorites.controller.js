const prisma = require('../config/prisma');

/**
 * POST /api/routes/:id/favorite
 * - Si no existe favorito => lo crea (isFavorite = true)
 * - Si ya existe => lo borra (toggle) (isFavorite = false)
 */
async function toggleFavorite(req, res) {
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

    // Buscar si ya existe el favorito
    const existing = await prisma.favorite.findFirst({
      where: {
        userId,
        routeId,
      },
    });

    if (existing) {
      // Eliminar favorito (toggle off)
      await prisma.favorite.delete({
        where: { id: existing.id },
      });

      return res.json({
        message: 'Ruta quitada de favoritos',
        isFavorite: false,
      });
    }

    // Crear nuevo favorito
    const favorite = await prisma.favorite.create({
      data: {
        userId,
        routeId,
      },
    });

    return res.status(201).json({
      message: 'Ruta añadida a favoritos',
      isFavorite: true,
      favoriteId: favorite.id,
    });
  } catch (error) {
    console.error('Error en toggleFavorite:', error);
    return res.status(500).json({ message: 'Error al gestionar favorito' });
  }
}

/**
 * DELETE /api/routes/:id/favorite
 * - Elimina el favorito si existe (aunque el POST ya hace toggle)
 */
async function deleteFavorite(req, res) {
  try {
    const userId = req.user.id;
    const routeId = parseInt(req.params.id, 10);

    if (Number.isNaN(routeId)) {
      return res.status(400).json({ message: 'routeId inválido' });
    }

    const result = await prisma.favorite.deleteMany({
      where: {
        userId,
        routeId,
      },
    });

    return res.json({
      message:
        result.count > 0
          ? 'Favorito eliminado'
          : 'No había favorito para esta ruta',
      deleted: result.count,
    });
  } catch (error) {
    console.error('Error en deleteFavorite:', error);
    return res.status(500).json({ message: 'Error al eliminar favorito' });
  }
}

/**
 * GET /api/me/favorites
 * - Lista los favoritos del usuario autenticado, con datos básicos de la ruta
 */
async function listMyFavorites(req, res) {
  try {
    const userId = req.user.id;

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        route: {
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            distanceKm: true,
            ascentM: true,
            difficulty: true,
            source: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      data: favorites.map((fav) => ({
        id: fav.id,
        createdAt: fav.createdAt,
        route: fav.route,
      })),
    });
  } catch (error) {
    console.error('Error en listMyFavorites:', error);
    return res.status(500).json({ message: 'Error al listar favoritos' });
  }
}

module.exports = {
  toggleFavorite,
  deleteFavorite,
  listMyFavorites,
};
