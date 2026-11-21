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
