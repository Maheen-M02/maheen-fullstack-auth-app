const { validationResult } = require('express-validator');
const Election = require('../models/Election');
const Vote = require('../models/Vote');
const AuditLog = require('../models/AuditLog');

// @desc    Get all elections (with filters)
// @route   GET /api/elections
// @access  Public
const getElections = async (req, res) => {
    try {
        const { status, filter } = req.query;
        const now = new Date();

        let query = {};

        // Filter by status
        if (status) {
            query.status = status;
        }

        // Additional filters
        if (filter === 'active') {
            query.startAt = { $lte: now };
            query.endAt = { $gt: now };
            query.status = 'active';
        } else if (filter === 'upcoming') {
            query.startAt = { $gt: now };
        } else if (filter === 'past') {
            query.endAt = { $lte: now };
        }

        const elections = await Election.find(query)
            .select('-__v')
            .populate('creator', 'name email')
            .sort({ startAt: -1 });

        res.json({ elections });
    } catch (error) {
        console.error('Get elections error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// @desc    Get single election by ID
// @route   GET /api/elections/:id
// @access  Public
const getElection = async (req, res) => {
    try {
        const election = await Election.findById(req.params.id)
            .populate('creator', 'name email');

        if (!election) {
            return res.status(404).json({ error: 'Election not found' });
        }

        // Update status based on current time
        election.updateStatus();
        await election.save();

        res.json({ election });
    } catch (error) {
        console.error('Get election error:', error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ error: 'Election not found' });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

// @desc    Cast a vote
// @route   POST /api/elections/:id/vote
// @access  Private
const castVote = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { candidateId } = req.body;
        const electionId = req.params.id;
        const voterId = req.user._id;

        // Find election
        const election = await Election.findById(electionId);
        if (!election) {
            return res.status(404).json({ error: 'Election not found' });
        }

        // Check if election is active
        election.updateStatus();
        if (election.status !== 'active' || !election.isActive) {
            return res.status(400).json({ error: 'Election is not currently active' });
        }

        // Validate candidate exists
        const candidateExists = election.candidates.some(
            c => c.candidateId === candidateId
        );
        if (!candidateExists) {
            return res.status(400).json({ error: 'Invalid candidate selection' });
        }

        // Check if user has already voted (redundant with unique index, but good for UX)
        const existingVote = await Vote.findOne({ electionId, voterId });
        if (existingVote) {
            return res.status(409).json({ error: 'You have already voted in this election', message: 'Each user can only vote once per election' });
        }

        // Hash IP address
        const ipHash = req.ip ? Vote.hashIP(req.ip) : null;

        // Create vote
        const vote = await Vote.create({
            electionId,
            voterId,
            candidateId,
            ipHash,
            metadata: {
                userAgent: req.headers['user-agent'],
                timestamp: new Date()
            }
        });

        // Log vote action
        await AuditLog.log(
            'voteCast',
            voterId,
            { electionId, candidateId },
            electionId,
            ipHash
        );

        res.status(201).json({
            message: 'Vote cast successfully',
            vote: {
                id: vote._id,
                electionId: vote.electionId,
                candidateId: vote.candidateId,
                createdAt: vote.createdAt
            }
        });
    } catch (error) {
        console.error('Cast vote error:', error);

        // Handle duplicate vote (unique index violation)
        if (error.code === 11000) {
            return res.status(409).json({ error: 'You have already voted in this election', message: 'Each user can only vote once per election' });
        }

        res.status(500).json({ error: 'Server error while casting vote' });
    }
};

// @desc    Get election results
// @route   GET /api/elections/:id/results
// @access  Public (with restrictions)
const getResults = async (req, res) => {
    try {
        const electionId = req.params.id;

        // Find election
        const election = await Election.findById(electionId);
        if (!election) {
            return res.status(404).json({ error: 'Election not found' });
        }

        // Update election status
        election.updateStatus();
        await election.save();

        // Check if results can be viewed
        const isAdmin = req.user && req.user.role === 'admin';
        const canViewResults = election.isPublicResults ||
            election.status === 'closed' ||
            isAdmin;

        if (!canViewResults) {
            return res.status(403).json({ error: 'Results are not yet available', message: 'Results will be visible when the election closes' });
        }

        // Aggregate votes
        const results = await Vote.aggregate([
            { $match: { electionId: election._id } },
            {
                $group: {
                    _id: '$candidateId',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Format results with candidate details
        const formattedResults = election.candidates.map(candidate => {
            const voteData = results.find(r => r._id === candidate.candidateId);
            return {
                candidateId: candidate.candidateId,
                name: candidate.name,
                description: candidate.description,
                imageUrl: candidate.imageUrl,
                votes: voteData ? voteData.count : 0
            };
        });

        // Calculate total votes
        const totalVotes = formattedResults.reduce((sum, r) => sum + r.votes, 0);

        res.json({
            election: {
                id: election._id,
                title: election.title,
                status: election.status
            },
            results: formattedResults,
            totalVotes,
            lastUpdated: new Date()
        });
    } catch (error) {
        console.error('Get results error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// @desc    Check if user has voted
// @route   GET /api/elections/:id/vote-status
// @access  Private
const getVoteStatus = async (req, res) => {
    try {
        const vote = await Vote.findOne({
            electionId: req.params.id,
            voterId: req.user._id
        });

        res.json({
            hasVoted: !!vote,
            votedAt: vote ? vote.createdAt : null
        });
    } catch (error) {
        console.error('Get vote status error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// @desc    Create a new election
// @route   POST /api/elections
// @access  Private (Admin)
const createElection = async (req, res) => {
    try {
        const { title, description, startDate, endDate } = req.body;

        const newElection = new Election({
            title,
            description,
            startAt: startDate,
            endAt: endDate,
            creator: req.user._id // Associate election with the user who created it
        });

        await newElection.save();

        // Optionally, you can log the creation in the AuditLog
        await AuditLog.log(
            'electionCreated',
            req.user._id,
            { electionId: newElection._id },
            newElection._id
        );

        res.status(201).json({
            message: 'Election created successfully',
            election: newElection
        });
    } catch (error) {
        console.error('Create election error:', error);
        res.status(500).json({ error: 'Server error while creating election' });
    }
};

// @desc    Update an existing election
// @route   PUT /api/elections/:id
// @access  Private
const updateElection = async (req, res) => {
    try {
        const electionId = req.params.id;
        const userId = req.user._id;

        // Find the election
        const election = await Election.findById(electionId);

        if (!election) {
            return res.status(404).json({ error: 'Election not found' });
        }

        // Check if the user is the creator of the election
        if (election.creator.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Unauthorized: You are not the creator of this election' });
        }

        // Update the election
        const { title, description, startDate, endDate } = req.body;

        election.title = title;
        election.description = description;
        election.startAt = startDate;
        election.endAt = endDate;

        await election.save();

        res.json({ message: 'Election updated successfully', election });
    } catch (error) {
        console.error('Update election error:', error);
        res.status(500).json({ error: 'Server error while updating election' });
    }
};

// @desc    Delete an election
// @route   DELETE /api/elections/:id
// @access  Private
const deleteElection = async (req, res) => {
    try {
        const electionId = req.params.id;
        const userId = req.user._id;

        // Find the election
        const election = await Election.findById(electionId);

        if (!election) {
            return res.status(404).json({ error: 'Election not found' });
        }

        // Check if the user is the creator of the election
        if (election.creator.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Unauthorized: You are not the creator of this election' });
        }

        // Delete the election
        await Election.findByIdAndDelete(electionId);

        res.json({ message: 'Election deleted successfully' });
    } catch (error) {
        console.error('Delete election error:', error);
        res.status(500).json({ error: 'Server error while deleting election' });
    }
};

module.exports = {
    getElections,
    getElection,
    castVote,
    getResults,
    getVoteStatus,
    createElection,
    updateElection,
    deleteElection
};