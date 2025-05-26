const AUTHORIZED_ADMINS = [
  '3mtBCXemCHNV5ekPBVVJXP3tEAy9VRNSYkxLLrL665tS', // Your wallet address - update this!
  // Add more admin wallet addresses here as needed
];

module.exports = {
  AUTHORIZED_ADMINS,
  isAuthorizedAdmin: (walletAddress) => {
    return AUTHORIZED_ADMINS.includes(walletAddress);
  }
};