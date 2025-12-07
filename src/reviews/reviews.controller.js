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

/**
 * PATCH /api/reviews/:reviewId
 * Solo puede editar el autor o un ADMIN.
 */
async function updateReview(req, res) {
  try {
    const reviewId = parseInt(req.params.reviewId, 10);
    const { rating, comment } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (Number.isNaN(reviewId)) {
      return res.status(400).json({ message: 'reviewId inválido' });
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return res.status(404).json({ message: 'Review no encontrada' });
    }

    // Permitir solo autor o admin
    if (review.userId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ message: 'No puedes editar esta review' });
    }

    const dataToUpdate = {};

    if (rating !== undefined) {
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
      dataToUpdate.rating = ratingNum;
    }

    if (comment !== undefined) {
      dataToUpdate.comment = comment;
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: dataToUpdate,
    });

    return res.json({
      message: 'Review actualizada correctamente',
      review: updated,
    });
  } catch (error) {
    console.error('Error en updateReview:', error);
    return res.status(500).json({ message: 'Error al actualizar review' });
  }
}

/**
 * DELETE /api/reviews/:reviewId
 * Solo puede borrar el autor o un ADMIN.
 */
async function deleteReview(req, res) {
  try {
    const reviewId = parseInt(req.params.reviewId, 10);
    const userId = req.user.id;
    const userRole = req.user.role;

    if (Number.isNaN(reviewId)) {
      return res.status(400).json({ message: 'reviewId inválido' });
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return res.status(404).json({ message: 'Review no encontrada' });
    }

    if (review.userId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ message: 'No puedes borrar esta review' });
    }

    await prisma.review.delete({
      where: { id: reviewId },
    });

    return res.json({ message: 'Review eliminada correctamente' });
  } catch (error) {
    console.error('Error en deleteReview:', error);
    return res.status(500).json({ message: 'Error al eliminar review' });
  }
}

module.exports = {
  createReview,
  getRouteReviews,
  updateReview,
  deleteReview,
};

