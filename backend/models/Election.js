const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  candidateId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: [true, 'Candidate name is required'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  imageUrl: {
    type: String,
    default: ''
  },
  order: {
    type: Number,
    default: 0
  }
}, { _id: false });

const electionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Election title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Election description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  startAt: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endAt: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(value) {
        return value > this.startAt;
      },
      message: 'End date must be after start date'
    }
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  candidates: {
    type: [candidateSchema],
    validate: {
      validator: function(arr) {
        return arr.length >= 2;
      },
      message: 'At least 2 candidates are required'
    }
  },
  isPublicResults: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'closed'],
    default: 'draft'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for faster queries
electionSchema.index({ status: 1, startAt: 1, endAt: 1 });
electionSchema.index({ creator: 1 });

// Virtual property to check if election is currently active
electionSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'active' && 
         this.startAt <= now && 
         this.endAt > now;
});

// Method to update status based on time
electionSchema.methods.updateStatus = function() {
  const now = new Date();
  
  if (this.status === 'draft') {
    return this.status;
  }
  
  if (now < this.startAt) {
    this.status = 'draft';
  } else if (now >= this.startAt && now < this.endAt) {
    this.status = 'active';
  } else {
    this.status = 'closed';
  }
  
  return this.status;
};

module.exports = mongoose.model('Election', electionSchema);