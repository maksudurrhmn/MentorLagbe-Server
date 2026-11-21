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

// Update user profile
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.auth.userId;

    if (!ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid user ID.',
      });
    }

    const { name, phone, bio, image } = req.body;

    const allowedFields = ['name', 'phone', 'bio', 'image'];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (typeof req.body[field] !== 'string') {
          return res.status(400).json({
            success: false,
            message: `${field} must be a string.`,
          });
        }

        updates[field] = req.body[field].trim();
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one field to update.',
      });
    }

    if (updates.name !== undefined && !updates.name) {
      return res.status(400).json({
        success: false,
        message: 'Name cannot be empty.',
      });
    }

    if (updates.image) {
      try {
        const imageUrl = new URL(updates.image);

        if (!['http:', 'https:'].includes(imageUrl.protocol)) {
          throw new Error('Invalid image URL');
        }
      } catch {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid image URL.',
        });
      }
    }

    const db = getDB();

    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          ...updates,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      });
    }

    const updatedUser = await db.collection('users').findOne(
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
          updatedAt: 1,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: updatedUser,
    });
  } catch (error) {
    console.error('Update user profile error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update user profile.',
    });
  }
};

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const db = getDB();

    const users = await db
      .collection('users')
      .find(
        {},
        {
          projection: {
            name: 1,
            email: 1,
            image: 1,
            role: 1,
            plan: 1,
            phone: 1,
            createdAt: 1,
          },
        }
      )
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      total: users.length,
      data: users,
    });
  } catch (error) {
    console.error('Get all users error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve users.',
    });
  }
};

// Update user role
export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID.',
      });
    }

    const allowedRoles = ['student', 'tutor', 'admin'];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be student, tutor, or admin.',
      });
    }

    if (id === req.auth.userId) {
      return res.status(403).json({
        success: false,
        message: 'You cannot change your own role.',
      });
    }

    const db = getDB();

    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          role,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User role updated successfully.',
      data: {
        userId: id,
        role,
      },
    });
  } catch (error) {
    console.error('Update user role error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update user role.',
    });
  }
};

// Get admin dashboard statistics
export const getAdminDashboardStats = async (req, res) => {
  try {
    const db = getDB();

    const [totalUsers, totalTutors, pendingTuitions, approvedTuitions, revenueResult] =
      await Promise.all([
        // Total registered users
        db.collection('users').countDocuments(),

        // Total tutors
        db.collection('users').countDocuments({
          role: 'tutor',
        }),

        // Pending tuition posts
        db.collection('tuitions').countDocuments({
          approvalStatus: 'pending',
        }),

        // Approved tuition posts
        db.collection('tuitions').countDocuments({
          approvalStatus: 'approved',
        }),

        // Total successful payment revenue
        db
          .collection('payments')
          .aggregate([
            {
              $match: {
                paymentStatus: 'paid',
              },
            },
            {
              $group: {
                _id: null,
                totalRevenue: {
                  $sum: '$amount',
                },
              },
            },
          ])
          .toArray(),
      ]);

    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalTutors,
        pendingTuitions,
        approvedTuitions,
        totalRevenue,
        currency: 'USD',
      },
    });
  } catch (error) {
    console.error('Admin dashboard stats error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve admin dashboard statistics.',
    });
  }
};
