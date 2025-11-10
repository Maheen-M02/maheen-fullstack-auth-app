const express = require('express');
const { body } = require('express-validator');
const {
  createElection,
  updateElection,
  deleteElection,
  getAuditLogs,
  closeElection
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/roleMiddleware');

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(adminOnly);

// Validation for election creation/update
const electionValidation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('startAt')
    .isISO8601()
    .withMessage('Valid start date is required'),
  body('endAt')
    .isISO8601()
    .withMessage('Valid end date is required'),
  body('candidates')
    .isArray({ min: 2 })
    .withMessage('At least 2 candidates are required'),
  body('candidates.*.name')
    .trim()
    .notEmpty()
    .withMessage('Candidate name is required')
];

// Routes
router.post('/elections', electionValidation, createElection);
router.put('/elections/:id', electionValidation, updateElection);
router.delete('/elections/:id', deleteElection);
router.post('/elections/:id/close', closeElection);
router.get('/audit', getAuditLogs);

module.exports = router;