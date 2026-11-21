import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';

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
      !mode ||
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
