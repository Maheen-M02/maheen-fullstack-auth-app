const mongoose = require('mongoose');
const crypto = require('crypto');

const voteSchema = new mongoose.Schema({
  electionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Election',
    required: true
  },
  voterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  candidateId: {
    type: String,
    required: [true, 'Candidate selection is required']
  },
  ipHash: {
    type: String,
    required: false
  },
  metadata: {
    userAgent: String,
    timestamp: Date
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  }
}, {
  timestamps: true
});

// Compound unique index to enforce one vote per user per election
voteSchema.index({ electionId: 1, voterId: 1 }, { unique: true });

// Index for faster result aggregation
voteSchema.index({ electionId: 1, candidateId: 1 });

// Static method to hash IP addresses
voteSchema.statics.hashIP = function(ip) {
  return crypto.createHash('sha256').update(ip).digest('hex');
};

// Prevent vote updates
voteSchema.pre('save', function(next) {
  if (!this.isNew) {
    return next(new Error('Votes cannot be modified after creation'));
  }
  next();
});

module.exports = mongoose.model('Vote', voteSchema);