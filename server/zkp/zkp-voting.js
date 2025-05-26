// server/zkp/zkp-voting.js
const crypto = require('crypto');
const EC = require('elliptic').ec;

class SimpleZKPVoting {
  constructor() {
    this.ec = new EC('secp256k1');
    this.G = this.ec.g;
    // Create second generator H by hashing G
    const hashG = crypto.createHash('sha256').update(this.G.encode('hex')).digest();
    this.H = this.ec.g.mul(this.ec.keyFromPrivate(hashG).getPrivate());
    this.q = this.ec.n;
  }

  hashToScalar(data) {
    const hash = crypto.createHash('sha256').update(data).digest();
    return this.ec.keyFromPrivate(hash).getPrivate().mod(this.q);
  }

  randomScalar() {
    return this.ec.genKeyPair().getPrivate();
  }

  createCommitment(vote, blindingFactor = null) {
    if (vote !== 0 && vote !== 1) {
      throw new Error('Vote must be 0 or 1');
    }
    
    const r = blindingFactor || this.randomScalar();
    const commitment = this.G.mul(vote).add(this.H.mul(r));
    
    return {
      commitment: commitment,
      vote: vote,
      blindingFactor: r
    };
  }

  proveValidVote(commitmentData) {
    const { commitment, vote, blindingFactor } = commitmentData;
    
    if (vote === 0) {
      return this._proveZero(commitment, blindingFactor);
    } else {
      return this._proveOne(commitment, blindingFactor);
    }
  }

  _proveZero(commitment, blindingFactor) {
    const w = this.randomScalar();
    const A = this.H.mul(w);
    
    const challenge = this.hashToScalar(
      commitment.encode('hex') + A.encode('hex') + '0'
    );
    
    const z = w.add(challenge.mul(blindingFactor)).mod(this.q);
    
    return {
      A: A,
      challenge: challenge,
      z: z,
      claimedVote: 0
    };
  }

  _proveOne(commitment, blindingFactor) {
    const w = this.randomScalar();
    const A = this.H.mul(w);  // Changed: A = w*H (not G + w*H)
    
    const challenge = this.hashToScalar(
      commitment.encode('hex') + A.encode('hex') + '1'
    );
    
    const z = w.add(challenge.mul(blindingFactor)).mod(this.q);
    
    return {
      A: A,
      challenge: challenge,
      z: z,
      claimedVote: 1
    };
  }

  verifyValidVote(commitment, proof) {
    const { A, challenge, z, claimedVote } = proof;
    
    try {
      const expectedChallenge = this.hashToScalar(
        commitment.encode('hex') + A.encode('hex') + claimedVote.toString()
      );
      
      if (!challenge.eq(expectedChallenge)) {
        return false;
      }
      
      let expectedA;
      if (claimedVote === 0) {
        // For vote=0: z*H = A + challenge*C
        expectedA = this.H.mul(z).add(commitment.mul(challenge.neg()));
      } else {
        // For vote=1: z*H = A + challenge*(C - G)
        expectedA = this.H.mul(z).add(commitment.add(this.G.neg()).mul(challenge.neg()));
      }
      
      return A.eq(expectedA);
    } catch (error) {
      return false;
    }
  }
}

module.exports = SimpleZKPVoting;