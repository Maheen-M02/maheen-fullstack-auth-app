const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Election = require('../models/Election');
const Vote = require('../models/Vote');

let server;
let authToken;
let userId;
let electionId;

beforeAll(async () => {
  // Connect to test database
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/voting-test');
  
  // Clear collections
  await User.deleteMany({});
  await Election.deleteMany({});
  await Vote.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Voting Flow', () => {
  
  test('Register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      });
    
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('email', 'test@example.com');
    
    authToken = res.body.token;
    userId = res.body.user.id;
  });

  test('Create an election (as admin)', async () => {
    // Make user admin
    await User.findByIdAndUpdate(userId, { role: 'admin' });
    
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const res = await request(app)
      .post('/api/admin/elections')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Test Election',
        description: 'This is a test election for unit testing',
        startAt: tomorrow.toISOString(),
        endAt: nextWeek.toISOString(),
        candidates: [
          { name: 'Candidate A', description: 'First candidate' },
          { name: 'Candidate B', description: 'Second candidate' }
        ],
        isPublicResults: true
      });
    
    expect(res.statusCode).toBe(201);
    expect(res.body.election).toHaveProperty('title', 'Test Election');
    
    electionId = res.body.election._id;
    
    // Make election active
    await Election.findByIdAndUpdate(electionId, { 
      status: 'active',
      startAt: new Date(now.getTime() - 1000) // Started 1 second ago
    });
  });

  test('Cast a vote successfully', async () => {
    // Change user back to regular user
    await User.findByIdAndUpdate(userId, { role: 'user' });
    
    const election = await Election.findById(electionId);
    const candidateId = election.candidates[0].candidateId;
    
    const res = await request(app)
      .post(`/api/elections/${electionId}/vote`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ candidateId });
    
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('message', 'Vote cast successfully');
    expect(res.body.vote).toHaveProperty('candidateId', candidateId);
  });

  test('Reject duplicate vote from same user', async () => {
    const election = await Election.findById(electionId);
    const candidateId = election.candidates[1].candidateId;
    
    const res = await request(app)
      .post(`/api/elections/${electionId}/vote`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ candidateId });
    
    expect(res.statusCode).toBe(409);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('already voted');
  });

  test('Get election results', async () => {
    const res = await request(app)
      .get(`/api/elections/${electionId}/results`);
    
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('results');
    expect(res.body).toHaveProperty('totalVotes', 1);
    
    const candidateAVotes = res.body.results.find(r => r.name === 'Candidate A');
    expect(candidateAVotes.votes).toBe(1);
  });

  test('Check vote status', async () => {
    const res = await request(app)
      .get(`/api/elections/${electionId}/vote-status`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('hasVoted', true);
    expect(res.body).toHaveProperty('votedAt');
  });
});