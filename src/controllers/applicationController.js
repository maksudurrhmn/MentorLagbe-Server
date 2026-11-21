import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';

export const createApplication = async (req, res) => {
  try {
    const { tuitionId, studentPhone, preferredSchedule, studentNote } = req.body;

    // Validate required information
    if (!tuitionId || !studentPhone?.trim() || !preferredSchedule?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tuition ID, phone number, and preferred schedule are required.',
      });
    }

    if (!ObjectId.isValid(tuitionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tuition ID.',
      });
    }

    const db = getDB();

    // Get the logged-in student
    const student = await db.collection('users').findOne({
      _id: new ObjectId(req.user.id),
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student account not found.',
      });
    }

    // Find an approved and active tuition
    const tuition = await db.collection('tuitions').findOne({
      _id: new ObjectId(tuitionId),
      approvalStatus: 'approved',
      isActive: true,
    });

    if (!tuition) {
      return res.status(404).json({
        success: false,
        message: 'Tuition not found or currently unavailable.',
      });
    }

    // Prevent duplicate applications
    const existingApplication = await db.collection('applications').findOne({
      tuitionId: tuition._id.toString(),
      studentEmail: student.email,
    });

    if (existingApplication) {
      return res.status(409).json({
        success: false,
        message: 'You have already applied for this tuition.',
      });
    }

    const newApplication = {
      tuitionId: tuition._id.toString(),
      tuitionTitle: tuition.title,
      subject: tuition.subject,
      monthlyFee: tuition.monthlyFee,
      tutorEmail: tuition.tutorEmail,

      studentName: student.name,
      studentEmail: student.email,
      studentPhone: studentPhone.trim(),
      preferredSchedule: preferredSchedule.trim(),
      studentNote: studentNote?.trim() || '',

      status: 'pending',
      appliedAt: new Date(),
    };

    const result = await db.collection('applications').insertOne(newApplication);

    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully.',
      data: {
        _id: result.insertedId,
        ...newApplication,
      },
    });
  } catch (error) {
    console.error('Create application error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to submit application.',
    });
  }
};

// Get tutor applications
export const getTutorApplications = async (req, res) => {
  try {
    const db = getDB();

    // Get the logged-in tutor
    const tutor = await db.collection('users').findOne({
      _id: new ObjectId(req.user.id),
    });

    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: 'Tutor account not found.',
      });
    }

    // Get applications belonging to this tutor
    const applications = await db
      .collection('applications')
      .find({
        tutorEmail: tutor.email,
      })
      .sort({ appliedAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      total: applications.length,
      data: applications,
    });
  } catch (error) {
    console.error('Get tutor applications error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve applications.',
    });
  }
};

// Update application status
export const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application ID.',
      });
    }

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be accepted or rejected.',
      });
    }

    const db = getDB();

    const tutor = await db.collection('users').findOne({
      _id: new ObjectId(req.user.id),
    });

    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: 'Tutor account not found.',
      });
    }

    const application = await db.collection('applications').findOne({
      _id: new ObjectId(id),
      tutorEmail: tutor.email,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found or you do not have permission to update it.',
      });
    }

    if (application.status !== 'pending') {
      return res.status(409).json({
        success: false,
        message: 'This application has already been processed.',
      });
    }

    await db.collection('applications').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: `Application ${status} successfully.`,
    });
  } catch (error) {
    console.error('Update application status error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update application status.',
    });
  }
};

// Get my applications
export const getMyApplications = async (req, res) => {
  try {
    const db = getDB();

    const student = await db.collection('users').findOne({
      _id: new ObjectId(req.user.id),
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student account not found.',
      });
    }

    const applications = await db
      .collection('applications')
      .find({
        studentEmail: student.email,
      })
      .sort({ appliedAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      total: applications.length,
      data: applications,
    });
  } catch (error) {
    console.error('Get student applications error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve your applications.',
    });
  }
};

// Detele application
export const cancelApplication = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application ID.',
      });
    }

    const db = getDB();

    const student = await db.collection('users').findOne({
      _id: new ObjectId(req.user.id),
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student account not found.',
      });
    }

    const application = await db.collection('applications').findOne({
      _id: new ObjectId(id),
      studentEmail: student.email,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found or you do not have permission to cancel it.',
      });
    }

    if (application.status !== 'pending') {
      return res.status(409).json({
        success: false,
        message: 'Only pending applications can be cancelled.',
      });
    }

    await db.collection('applications').deleteOne({
      _id: new ObjectId(id),
    });

    return res.status(200).json({
      success: true,
      message: 'Application cancelled successfully.',
    });
  } catch (error) {
    console.error('Cancel application error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to cancel application.',
    });
  }
};
