import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';

export const getUserProfile = async (req, res) => {
  try {
    const userId = req.auth.userId;

    if (!ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid user ID.',
      });
    }

    const db = getDB();

    const user = await db.collection('users').findOne(
      { _id: new ObjectId(userId) },
      {
        projection: {
          name: 1,
          email: 1,
          image: 1,
          role: 1,
          phone: 1,
          bio: 1,
          plan: 1,
          createdAt: 1,
        },
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get user profile error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile.',
    });
  }
};
