const prisma = require('../config/prisma');

const PAGE_SIZE = 10;

/**
 * Lista de rutas con filtros y paginación.
 * Filtros:
 *  - q: busca en title y description (contiene, case-insensitive)
 *  - difficulty: EASY | MODERATE | HARD
 *  - page: página (1 por defecto)
 */
async function listRoutes({ q, difficulty, page = 1 }) {
  const where = {};

  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
    ];
  }

  if (difficulty) {
    where.difficulty = difficulty;
  }

  const pageNumber = Number.isNaN(parseInt(page, 10))
    ? 1
    : Math.max(parseInt(page, 10), 1);

  const skip = (pageNumber - 1) * PAGE_SIZE;

  const [total, routes] = await Promise.all([
    prisma.route.count({ where }),
    prisma.route.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        distanceKm: true,
        ascentM: true,
        difficulty: true,
        source: true,
        createdAt: true,
      },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  return {
    data: routes,
    pagination: {
      page: pageNumber,
      pageSize: PAGE_SIZE,
      total,
      totalPages,
    },
  };
}

/**
 * Detalle de una ruta por slug, con:
 *  - waypoints ordenados
 *  - avgRating
 *  - reviewsCount
 */
async function getRouteBySlug(slug) {
  const route = await prisma.route.findUnique({
    where: { slug },
    include: {
      waypoints: {
        orderBy: { order: 'asc' },
      },
      reviews: {
        select: {
          id: true,
          rating: true,
        },
      },
    },
  });

  if (!route) {
    return null;
  }

  const reviewsCount = route.reviews.length;
  const avgRating =
    reviewsCount === 0
      ? null
      : route.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount;

  // devolvemos un objeto “limpio”
  return {
    id: route.id,
    title: route.title,
    slug: route.slug,
    description: route.description,
    distanceKm: route.distanceKm,
    ascentM: route.ascentM,
    difficulty: route.difficulty,
    source: route.source,
    createdAt: route.createdAt,
    updatedAt: route.updatedAt,
    startLat: route.startLat,
    startLng: route.startLng,
    endLat: route.endLat,
    endLng: route.endLng,
    waypoints: route.waypoints,
    avgRating,
    reviewsCount,
  };
}

module.exports = {
  listRoutes,
  getRouteBySlug,
};
