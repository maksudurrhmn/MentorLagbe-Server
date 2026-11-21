import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';

const verifyRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      // Verify that authentication ran first
      if (!req.auth?.userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.',
        });
      }

      // Validate the MongoDB ObjectId
      if (!ObjectId.isValid(req.auth.userId)) {
        return res.status(401).json({
          success: false,
          message: 'Invalid user ID.',
        });
      }

      const db = getDB();

      // Retrieve the user's actual role from MongoDB
      const user = await db
        .collection('users')
        .findOne({ _id: new ObjectId(req.auth.userId) }, { projection: { role: 1 } });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User account not found.',
        });
      }

      // Check whether the user's role is permitted
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this resource.',
        });
      }

      // Attach the verified database user information
      req.user = {
        id: user._id.toString(),
        role: user.role,
      };

      next();
    } catch (error) {
      console.error('Role verification failed:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Internal server error during authorization.',
      });
    }
  };
};

export default verifyRole;
