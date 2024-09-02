const express = require('express');
const router = express.Router();
const {
  authenticateUser,
  authorizePermissions,
} = require('../middleware/authentication');
const {
  getAllUsers,
  getSingleUser,
  showCurrentUser,
  updateUser,
  updateUserPassword,
  joinTelegram,
  followX,
  walletConnect,
  getFriends,
  claimDailyReward,
  getLeaderboard
} = require('../controllers/userController');

router
  .route('/')
  .get(authenticateUser, authorizePermissions('admin'), getAllUsers);

router.route('/showMe').get(authenticateUser, showCurrentUser);
router.route('/updateUser').patch(authenticateUser, updateUser);
router.route('/updateUserPassword').patch(authenticateUser, updateUserPassword);

router.route('/get/:id').get(authenticateUser, getSingleUser);

router.route('/jointg').post(authenticateUser, joinTelegram);
router.route('/followx').post(authenticateUser, followX);
router.route('/walletconnet').post(authenticateUser, walletConnect);
router.route('/friends').get(authenticateUser, getFriends);

//daily reward
router.route('/claim_daily').post(authenticateUser, claimDailyReward);
router.route('/leaderboard').post(authenticateUser, getLeaderboard);
module.exports = router;
