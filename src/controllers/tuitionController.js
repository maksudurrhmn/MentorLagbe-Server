import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';

// Create tuition API
export const createTuition = async (req, res) => {
  try {
    const {
      title,
      subject,
      classLevel,
      mode,
      location,
      monthlyFee,
      daysPerWeek,
      bannerImage,
      description,
    } = req.body;

    // Validate required fields
    if (
      !title ||
      !subject ||
      !classLevel ||
      (mode === 'Offline' && !location?.trim()) ||
      monthlyFee === undefined ||
      daysPerWeek === undefined ||
      !bannerImage ||
      !description
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required tuition information.',
      });
    }

    if (!['Online', 'Offline'].includes(mode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tuition mode.',
      });
    }

    if (
      !Number.isFinite(Number(monthlyFee)) ||
      Number(monthlyFee) <= 0 ||
      !Number.isInteger(Number(daysPerWeek)) ||
      Number(daysPerWeek) < 1 ||
      Number(daysPerWeek) > 7
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid monthly fee and days per week.',
      });
    }

    const db = getDB();

    // Get the authenticated tutor from MongoDB
    const tutor = await db.collection('users').findOne({
      _id: new ObjectId(req.user.id),
    });

    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: 'Tutor account not found.',
      });
    }

    // Check the free plan posting limit
    if (tutor.plan !== 'pro') {
      const totalPosts = await db.collection('tuitions').countDocuments({
        tutorId: tutor._id.toString(),
      });

      if (totalPosts >= 2) {
        return res.status(403).json({
          success: false,
          message:
            'Free tutors can create only 2 tuition posts. Upgrade to Pro for unlimited posts.',
        });
      }
    }

    const newTuition = {
      title: title.trim(),
      subject: subject.trim(),
      classLevel: classLevel.trim(),
      mode,
      location: location?.trim() || '',
      monthlyFee: Number(monthlyFee),
      daysPerWeek: Number(daysPerWeek),
      bannerImage: bannerImage.trim(),
      description: description.trim(),

      tutorId: tutor._id.toString(),
      tutorName: tutor.name,
      tutorEmail: tutor.email,

      approvalStatus: 'pending',
      isActive: true,
      createdAt: new Date(),
    };

    const result = await db.collection('tuitions').insertOne(newTuition);

    return res.status(201).json({
      success: true,
      message: 'Tuition posted successfully. Waiting for admin approval.',
      data: {
        _id: result.insertedId,
        ...newTuition,
      },
    });
  } catch (error) {
    console.error('Create tuition error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to create tuition.',
    });
  }
};

// Get approved tuition API

export const getPublicTuitions = async (req, res) => {
  try {
    const db = getDB();

    const { search, subject, classLevel, mode } = req.query;

    const query = {
      approvalStatus: 'approved',
      isActive: true,
    };

    // Escape special regex characters
    const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Flexible whitespace matching
    const flexibleText = (value) => escapeRegex(value.trim()).replace(/\s+/g, '\\s+');

    // Match subject names as complete words or phrases.
    // This also supports combined subjects.
    if (subject?.trim()) {
      const subjectPattern = flexibleText(subject);
      query.subject = new RegExp(`(^|[^a-zA-Z0-9])${subjectPattern}($|[^a-zA-Z0-9])`, 'i');
    }

    // Match class levels with different dash characters.
    if (classLevel?.trim()) {
      const classPattern = classLevel
        .trim()
        .split(/[-–—]/)
        .map((part) => flexibleText(part))
        .join('\\s*[-–—]\\s*');

      query.classLevel = new RegExp(`^${classPattern}$`, 'i');
    }

    // Match tuition mode
    if (mode?.trim()) {
      const normalizedMode = mode.trim().toLowerCase();

      if (!['online', 'offline'].includes(normalizedMode)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid tuition mode.',
        });
      }

      query.mode = new RegExp(`^${escapeRegex(normalizedMode)}$`, 'i');
    }

    // Search by title or subject
    if (search?.trim()) {
      const searchRegex = new RegExp(flexibleText(search), 'i');

      query.$or = [{ title: searchRegex }, { subject: searchRegex }];
    }

    const tuitions = await db.collection('tuitions').find(query).sort({ createdAt: -1 }).toArray();

    return res.status(200).json({
      success: true,
      total: tuitions.length,
      data: tuitions,
    });
  } catch (error) {
    console.error('Get public tuitions error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve tuition posts.',
    });
  }
};

// Get tuition by id
export const getPublicTuitionById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tuition ID.',
      });
    }

    const db = getDB();

    const tuition = await db.collection('tuitions').findOne({
      _id: new ObjectId(id),
      approvalStatus: 'approved',
      isActive: true,
    });

    if (!tuition) {
      return res.status(404).json({
        success: false,
        message: 'Tuition not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: tuition,
    });
  } catch (error) {
    console.error('Get tuition by ID error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve tuition details.',
    });
  }
};

// Get my tuition API
export const getMyTuitions = async (req, res) => {
  try {
    const db = getDB();

    const tuitions = await db
      .collection('tuitions')
      .find({
        tutorId: req.user.id,
      })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      total: tuitions.length,
      data: tuitions,
    });
  } catch (error) {
    console.error('Get my tuitions error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve your tuition posts.',
    });
  }
};

// Update tuition API
export const updateTuition = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tuition ID.',
      });
    }

    const db = getDB();

    // Only allow these fields to be updated
    const allowedFields = [
      'title',
      'subject',
      'classLevel',
      'mode',
      'location',
      'monthlyFee',
      'daysPerWeek',
      'bannerImage',
      'description',
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update.',
      });
    }

    // Validate text fields
    const textFields = ['title', 'subject', 'classLevel', 'bannerImage', 'description'];

    for (const field of textFields) {
      if (field in updates && (typeof updates[field] !== 'string' || !updates[field].trim())) {
        return res.status(400).json({
          success: false,
          message: `Invalid ${field}.`,
        });
      }

      if (field in updates) {
        updates[field] = updates[field].trim();
      }
    }

    // Validate location
    if ('location' in updates) {
      if (typeof updates.location !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Invalid location.',
        });
      }

      updates.location = updates.location.trim();
    }

    // Validate tuition mode
    if ('mode' in updates && !['Online', 'Offline'].includes(updates.mode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tuition mode.',
      });
    }

    // Validate monthly fee
    if ('monthlyFee' in updates) {
      if (!Number.isFinite(Number(updates.monthlyFee)) || Number(updates.monthlyFee) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid monthly fee.',
        });
      }

      updates.monthlyFee = Number(updates.monthlyFee);
    }

    // Validate days per week
    if ('daysPerWeek' in updates) {
      if (
        !Number.isInteger(Number(updates.daysPerWeek)) ||
        Number(updates.daysPerWeek) < 1 ||
        Number(updates.daysPerWeek) > 7
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid days per week.',
        });
      }

      updates.daysPerWeek = Number(updates.daysPerWeek);
    }

    // Find only the logged-in tutor's tuition
    const tuition = await db.collection('tuitions').findOne({
      _id: new ObjectId(id),
      tutorId: req.user.id,
    });

    if (!tuition) {
      return res.status(404).json({
        success: false,
        message: 'Tuition not found or you do not own this post.',
      });
    }

    // Validate location based on tuition mode
    const finalMode = updates.mode ?? tuition?.mode;
    const finalLocation = updates.location ?? tuition?.location ?? '';

    if (finalMode === 'Offline' && !finalLocation.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Location is required for offline tuition.',
      });
    }

    updates.approvalStatus = 'pending';
    updates.updatedAt = new Date();

    await db.collection('tuitions').updateOne(
      {
        _id: new ObjectId(id),
        tutorId: req.user.id,
      },
      {
        $set: updates,
      }
    );

    const updatedTuition = await db.collection('tuitions').findOne({
      _id: new ObjectId(id),
    });

    return res.status(200).json({
      success: true,
      message: 'Tuition updated successfully. Waiting for admin approval.',
      data: updatedTuition,
    });
  } catch (error) {
    console.error('Update tuition error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update tuition.',
    });
  }
};

// Delete tuition
export const deleteTuition = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tuition ID.',
      });
    }

    const db = getDB();

    const result = await db.collection('tuitions').deleteOne({
      _id: new ObjectId(id),
      tutorId: req.user.id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tuition not found or you do not own this post.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Tuition deleted successfully.',
    });
  } catch (error) {
    console.error('Delete tuition error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to delete tuition.',
    });
  }
};

// Update tuition status
export const updateTuitionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tuition ID.',
      });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be true or false.',
      });
    }

    const db = getDB();

    const result = await db.collection('tuitions').updateOne(
      {
        _id: new ObjectId(id),
        tutorId: req.user.id,
      },
      {
        $set: {
          isActive,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tuition not found or you do not own this post.',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Tuition ${isActive ? 'activated' : 'deactivated'} successfully.`,
      data: { isActive },
    });
  } catch (error) {
    console.error('Update tuition status error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update tuition status.',
    });
  }
};

// Update tuition approval status admin only
export const updateTuitionApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalStatus } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tuition ID.',
      });
    }

    if (!['approved', 'rejected'].includes(approvalStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Approval status must be approved or rejected.',
      });
    }

    const db = getDB();

    const result = await db.collection('tuitions').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          approvalStatus,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tuition not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Tuition ${approvalStatus} successfully.`,
      data: { approvalStatus },
    });
  } catch (error) {
    console.error('Update tuition approval error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update tuition approval.',
    });
  }
};

// Get all tuition post for admin
export const getAllTuitionsForAdmin = async (req, res) => {
  try {
    const db = getDB();
    const { approvalStatus } = req.query;

    const query = {};

    if (approvalStatus) {
      const allowedStatuses = ['pending', 'approved', 'rejected'];

      if (!allowedStatuses.includes(approvalStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid approval status.',
        });
      }

      query.approvalStatus = approvalStatus;
    }

    const tuitions = await db.collection('tuitions').find(query).sort({ createdAt: -1 }).toArray();

    return res.status(200).json({
      success: true,
      total: tuitions.length,
      data: tuitions,
    });
  } catch (error) {
    console.error('Get all admin tuitions error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve tuition posts.',
    });
  }
};

// Get tutor dashboard statistics API
export const getTutorDashboardStats = async (req, res) => {
  try {
    const db = getDB();

    if (!ObjectId.isValid(req.auth.userId)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid user account.',
      });
    }

    const tutor = await db.collection('users').findOne({
      _id: new ObjectId(req.auth.userId),
      role: 'tutor',
    });

    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: 'Tutor account not found.',
      });
    }

    // Find all tuition posts created by this tutor
    const tuitions = await db
      .collection('tuitions')
      .find({ tutorId: tutor._id.toString() })
      .toArray();

    const totalTuitions = tuitions.length;

    const activeTuitions = tuitions.filter((tuition) => tuition.isActive === true).length;

    // Count all applications submitted to this tutor's tuitions
    const totalApplicants = await db
      .collection('applications')
      .countDocuments({ tutorEmail: tutor.email });

    return res.status(200).json({
      success: true,
      data: {
        totalTuitions,
        activeTuitions,
        totalApplicants,
        plan: tutor.plan || 'free',
      },
    });
  } catch (error) {
    console.error('Tutor dashboard stats error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve tutor dashboard statistics.',
    });
  }
};
