const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const {
  getElections,
  getElection,
  castVote,
  getResults,
  getVoteStatus
} = require('../controllers/electionController');
const { protect } = require('../middleware/authMiddleware');
const { createElection } = require('../controllers/electionController');

const router = express.Router();

// Rate limiter for voting
const voteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 votes per hour
  message: 'Too many vote attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation for voting
const voteValidation = [
  body('candidateId')
    .notEmpty()
    .withMessage('Candidate selection is required')
    .isString()
    .withMessage('Invalid candidate ID format')
];

// Public routes
router.get('/', getElections);
router.get('/:id', getElection);
router.get('/:id/results', getResults);

// Protected routes
router.post('/:id/vote', protect, voteLimiter, voteValidation, castVote);
router.get('/:id/vote-status', protect, getVoteStatus);
router.post('/', createElection);

module.exports = router;
