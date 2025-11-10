const { validationResult } = require('express-validator');
const Election = require('../models/Election');
const AuditLog = require('../models/AuditLog');
const Vote = require('../models/Vote');

// @desc    Create new election
// @route   POST /api/admin/elections
// @access  Private/Admin
const createElection = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, startAt, endAt, candidates, isPublicResults } = req.body;

    // Validate dates
    const start = new Date(startAt);
    const end = new Date(endAt);
    const now = new Date();

    if (start < now) {
      return res.status(400).json({ error: 'Start date cannot be in the past' });
    }

    if (end <= start) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    // Create election
    const election = await Election.create({
      title,
      description,
      startAt: start,
      endAt: end,
      createdBy: req.user._id,
      candidates: candidates.map((c, index) => ({
        candidateId: c.candidateId || `candidate_${Date.now()}_${index}`,
        name: c.name,
        description: c.description || '',
        imageUrl: c.imageUrl || '',
        order: c.order || index
      })),
      isPublicResults: isPublicResults || false,
      status: 'draft'
    });

    // Log creation
    await AuditLog.log(
      'createElection',
      req.user._id,
      { title, candidateCount: candidates.length },
      election._id
    );

    res.status(201).json({
      message: 'Election created successfully',
      election
    });
  } catch (error) {
    console.error('Create election error:', error);
    res.status(500).json({ error: 'Server error while creating election' });
  }
};

// @desc    Update election
// @route   PUT /api/admin/elections/:id
// @access  Private/Admin
const updateElection = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const election = await Election.findById(req.params.id);
    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }

    // Check if election has started
    election.updateStatus();
    if (election.status === 'active' || election.status === 'closed') {
      return res.status(400).json({ 
        error: 'Cannot update election that has started or ended' 
      });
    }

    // Update fields
    const { title, description, startAt, endAt, candidates, isPublicResults } = req.body;

    if (title) election.title = title;
    if (description) election.description = description;
    if (startAt) election.startAt = new Date(startAt);
    if (endAt) election.endAt = new Date(endAt);
    if (candidates) {
      election.candidates = candidates.map((c, index) => ({
        candidateId: c.candidateId || `candidate_${Date.now()}_${index}`,
        name: c.name,
        description: c.description || '',
        imageUrl: c.imageUrl || '',
        order: c.order || index
      }));
    }
    if (typeof isPublicResults !== 'undefined') {
      election.isPublicResults = isPublicResults;
    }

    await election.save();

    // Log update
    await AuditLog.log(
      'updateElection',
      req.user._id,
      { title: election.title },
      election._id
    );

    res.json({
      message: 'Election updated successfully',
      election
    });
  } catch (error) {
    console.error('Update election error:', error);
    res.status(500).json({ error: 'Server error while updating election' });
  }
};

// @desc    Delete election
// @route   DELETE /api/admin/elections/:id
// @access  Private/Admin
const deleteElection = async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);
    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }

    // Check if election has started
    election.updateStatus();
    if (election.status === 'active' || election.status === 'closed') {
      return res.status(400).json({ 
        error: 'Cannot delete election that has started or ended' 
      });
    }

    await Election.findByIdAndDelete(req.params.id);

    // Log deletion
    await AuditLog.log(
      'deleteElection',
      req.user._id,
      { title: election.title },
      election._id
    );

    res.json({ message: 'Election deleted successfully' });
  } catch (error) {
    console.error('Delete election error:', error);
    res.status(500).json({ error: 'Server error while deleting election' });
  }
};

// @desc    Get audit logs
// @route   GET /api/admin/audit
// @access  Private/Admin
const getAuditLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const { action, electionId, actorId } = req.query;
    const query = {};

    if (action) query.action = action;
    if (electionId) query.electionId = electionId;
    if (actorId) query.actorId = actorId;

    const logs = await AuditLog.find(query)
      .populate('actorId', 'name email')
      .populate('electionId', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AuditLog.countDocuments(query);

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Close election manually
// @route   POST /api/admin/elections/:id/close
// @access  Private/Admin
const closeElection = async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);
    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }

    election.status = 'closed';
    election.endAt = new Date(); // Set end time to now
    await election.save();

    // Log closure
    await AuditLog.log(
      'closeElection',
      req.user._id,
      { title: election.title },
      election._id
    );

    res.json({
      message: 'Election closed successfully',
      election
    });
  } catch (error) {
    console.error('Close election error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  createElection,
  updateElection,
  deleteElection,
  getAuditLogs,
  closeElection
};