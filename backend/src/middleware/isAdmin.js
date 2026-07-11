const { errorResponse } = require('../utils/apiResponse');

const isAdmin = (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, 'Authentication required', 401);
  }

  if (req.user.role !== 'admin') {
    return errorResponse(res, 'Admin access required', 403);
  }

  next();
};

module.exports = { isAdmin };
