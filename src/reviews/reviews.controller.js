const prisma = require('../config/prisma');

const PAGE_SIZE = 10;

/**
 * POST /api/routes/:id/reviews
 * Body: { rating, comment }
 */
async function createReview(req, res) {
  try {
    const userId = req.user.id;
    const routeId = parseInt(req.params.id, 10);
    const { rating, comment } = req.body;

    if (Number.isNaN(routeId)) {
      return res.status(400).json({ message: 'routeId inválido' });
    }

    const ratingNum = Number(rating);

    if (
      Number.isNaN(ratingNum) ||
      ratingNum < 1 ||
      ratingNum > 5
    ) {
      return res.status(400).json({
        message: 'rating debe ser un número entre 1 y 5',
      });
    }

    // Comprobar que la ruta existe
    const route = await prisma.route.findUnique({
      where: { id: routeId },
    });

    if (!route) {
      return res.status(404).json({ message: 'Ruta no encontrada' });
    }

    const review = await prisma.review.create({
      data: {
        rating: ratingNum,
        comment: comment || null,
        routeId,
        userId,
      },
    });

    return res.status(201).json({
      message: 'Review creada correctamente',
      review,
    });
  } catch (error) {
    console.error('Error en createReview:', error);
    return res.status(500).json({ message: 'Error al crear review' });
  }
}

/**
 * GET /api/routes/:id/reviews?page=1
 * Devuelve reviews paginadas, con info básica de usuario
 */
async function getRouteReviews(req, res) {
  try {
    const routeId = parseInt(req.params.id, 10);
    const page = parseInt(req.query.page || '1', 10);
    const pageNumber = Number.isNaN(page) ? 1 : Math.max(page, 1);

    if (Number.isNaN(routeId)) {
      return res.status(400).json({ message: 'routeId inválido' });
    }

    const where = { routeId };

    const skip = (pageNumber - 1) * PAGE_SIZE;

    const [total, reviews] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: PAGE_SIZE,
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

    return res.json({
      data: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        user: r.user, // { id, name }
      })),
      pagination: {
        page: pageNumber,
        pageSize: PAGE_SIZE,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error en getRouteReviews:', error);
    return res.status(500).json({ message: 'Error al obtener reviews' });
  }
}

module.exports = {
  createReview,
  getRouteReviews,
};
