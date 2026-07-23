const { auth, db } = require('../config/firebaseAdmin');
const { errorResponse } = require('../utils/apiResponse');

const isAdmin = async (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, 'Authentication required', 401);
  }

  // Check custom claim first (fastest path)
  if (req.user.admin === true) {
    return next();
  }

  // Fallback: check Firestore document role
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const userData = userDoc.data();

    if (userData && userData.role === 'admin') {
      return next();
    }
  } catch (error) {
    console.error('Admin Firestore check error:', error);
  }

  return errorResponse(res, 'Admin access required', 403);
};

module.exports = { isAdmin };
