// server/api/routes.js
const express = require('express');
const controllers = require('./controllers');
const router = express.Router();

// Debugging middleware for routes
router.use((req, res, next) => {
  console.log(`API Route hit: ${req.method} ${req.originalUrl}`);
  next();
});

// Election routes
router.post('/elections', controllers.createElection);
router.get('/elections', controllers.getAllElections);
router.get('/elections/:id', controllers.getElection);
router.post('/elections/:id/end', controllers.endElection);

// Voting routes
router.post('/vote', controllers.castVote);
router.get('/results/:electionId', controllers.getResults);

// System status
router.get('/status', controllers.getNetworkStatus);
router.get('/dplt/status', controllers.getDPLTStatus);
router.post('/airdrop', controllers.requestAirdrop);

// Voter registration routes
router.post('/voters/register', controllers.registerVoter);
router.get('/voters/:voterId', controllers.getVoterStatus);
router.get('/voters', controllers.getAllVoters);

router.post('/votes/verify', controllers.verifyVote);

router.post('/dplt/recover', controllers.recoverDPLTNetwork);

// Debug routes
if (process.env.NODE_ENV !== 'production') {
  router.get('/debug/voters', controllers.debugGetAllVoterRecords);
}

module.exports = router;