import mongoose from 'mongoose';
import * as chai from 'chai';
import chaiHttp from 'chai-http';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { app, server } = require('../server'); 
const User = require('../models/User'); 

chai.use(chaiHttp);

process.env.PORT = 4001; // Used a different port for tests

describe('Authentication', function () {
  this.timeout(20000); // longer timeout for the whole suite

  before(async function () {
    this.timeout(20000); 
    await User.deleteMany({});
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  after(async () => {
    await mongoose.connection.close(); // Close the mongoose connection after tests
    server.close(); // Close the server after tests
  });

  it('should register a new user', (done) => {
    chai.request(app)
      .post('/api/auth/register')
      .send({ username: 'testuser', password: 'password' })
      .end((err, res) => {
        if (err) done(err);
        res.should.have.status(201);
        res.body.should.be.a('object');
        res.body.should.have.property('token');
        done();
      });
  });

  it('should not register an existing user', (done) => {
    chai.request(app)
      .post('/api/auth/register')
      .send({ username: 'testuser', password: 'password' })
      .end((err, res) => {
        if (err) done(err);
        res.should.have.status(400);
        res.body.should.be.a('object');
        res.body.should.have.property('message').eql('User already exists');
        done();
      });
  });

  it('should login a user', (done) => {
    chai.request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'password' })
      .end((err, res) => {
        if (err) done(err);
        res.should.have.status(200);
        res.body.should.be.a('object');
        res.body.should.have.property('token');
        done();
      });
  });

  it('should not login a non-existing user', (done) => {
    chai.request(app)
      .post('/api/auth/login')
      .send({ username: 'nonexistinguser', password: 'password' })
      .end((err, res) => {
        if (err) done(err);
        res.should.have.status(401);
        res.body.should.be.a('object');
        res.body.should.have.property('message').eql('Invalid username or password');
        done();
      });
  });

  it('should get user info with valid token', (done) => {
    chai.request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'password' })
      .end((err, res) => {
        if (err) done(err);
        const token = res.body.token;
        chai.request(app)
          .get('/api/auth/user')
          .set('Authorization', `Bearer ${token}`)
          .end((err, res) => {
            if (err) done(err);
            res.should.have.status(200);
            res.body.should.be.a('object');
            res.body.should.have.property('username').eql('testuser');
            done();
          });
      });
  });

  it('should not get user info with invalid token', (done) => {
    chai.request(app)
      .get('/api/auth/user')
      .set('Authorization', 'Bearer invalidtoken')
      .end((err, res) => {
        if (err) done(err);
        res.should.have.status(401);
        res.body.should.be.a('object');
        res.body.should.have.property('message').eql('Not authorized, token failed');
        done();
      });
  });
});
