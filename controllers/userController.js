const User = require('../models/User');
const { StatusCodes } = require('http-status-codes');
const CustomError = require('../errors');
const {
  createTokenUser,
  attachCookiesToResponse,
  checkPermissions,
  constant,
} = require('../utils');
const { isUserJoined } = require('../helpers/botHelpers');

const getAllUsers = async (req, res) => {
  console.log(req.user);
  const users = await User.find({ role: 'user' }).select('-password');
  res.status(StatusCodes.OK).json({ users });
};

const getSingleUser = async (req, res) => {
  const user = await User.findOne({ _id: req.params.id }).select('-password');
  if (!user) {
    throw new CustomError.NotFoundError(`No user with id : ${req.params.id}`);
  }
  checkPermissions(req.user, user._id);
  res.status(StatusCodes.OK).json({ user });
};

const showCurrentUser = async (req, res) => {
  const user = await User.findOne({ _id: req.user.userId }).select('-password');
  if (!user) {
    throw new CustomError.NotFoundError(`No user with id : ${req.params.id}`);
  }
  checkPermissions(req.user, user._id);
  res.status(StatusCodes.OK).json({ user });
};
// update user with user.save()
const updateUser = async (req, res) => {
  const { email, name } = req.body;
  if (!email || !name) {
    throw new CustomError.BadRequestError('Please provide all values');
  }
  const user = await User.findOne({ _id: req.user.userId });

  user.email = email;
  user.name = name;

  await user.save();

  const tokenUser = createTokenUser(user);
  attachCookiesToResponse({ res, user: tokenUser });
  res.status(StatusCodes.OK).json({ user: tokenUser });
};
const updateUserPassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    throw new CustomError.BadRequestError('Please provide both values');
  }
  const user = await User.findOne({ _id: req.user.userId });

  const isPasswordCorrect = await user.comparePassword(oldPassword);
  if (!isPasswordCorrect) {
    throw new CustomError.UnauthenticatedError('Invalid Credentials');
  }
  user.password = newPassword;

  await user.save();
  res.status(StatusCodes.OK).json({ msg: 'Success! Password Updated.' });
};

const joinTelegram = async (req, res) => {
  var user = await User.findOne({ _id: req.user.userId });
  if(user) {
    if(req.body.status != 1) {
      return res.status(StatusCodes.OK).json({success: true, status: 0, jointg: user.jointg});
    }
    
    if(user.jointg == 1) {
      return res.status(StatusCodes.OK).json({success: false, status: 'exist'});
    } else {
      const isJoined = await isUserJoined(user.username);
      console.log('joined =', user.username, isJoined);
      if (!isJoined) {
        return res.status(StatusCodes.OK).json({
          success: false,
          status: 'notjoined',
          message: 'user didn\'t join our channel'
        });
      }
    }
    user.token += constant.BONUS.JOIN_TG_CHANNEl;
    user.jointg = 1;
    await user.save();
    return res.status(StatusCodes.OK).json({success: true, status: 'success'});
  }
  return res.status(StatusCodes.OK).json({success: false, status: 'unknown'});
};
const followX = async (req, res) => {
  var user = await User.findOne({ _id: req.user.userId });
  if(user) {
    if(req.body.status != 1) {
      return res.status(StatusCodes.OK).json({success: true, status: 0, followx: user.followx});
    }
    if(user.followx == 1) {
      return res.status(StatusCodes.OK).json({success: false, status: 'exist'});
    }
    user.token += constant.BONUS.FOLLOW_X_ACCOUNT;
    user.followx = 1;
    await user.save();
    return res.status(StatusCodes.OK).json({success: true, status: 'success'});
  }
  return res.status(StatusCodes.OK).json({success: false, status: 'unknown'});
};
const walletConnect = async (req, res) => {
  var user = await User.findOne({ _id: req.user.userId });
  if(user) {
    if(req.body.status != 1) {
      return res.status(StatusCodes.OK).json({success: true, status: 0, wallet: user.wallet_addr});
    }
    const wallet_addr = req.body.addr;
    if(wallet_addr != '') {
      if(user.wallet_addr == '') {
        user.token += constant.BONUS.WALLET_CONNECT;
      }
      user.wallet_addr = wallet_addr;
      await user.save();
      return res.status(StatusCodes.OK).json({success: true, status: 'success'});
    }
  }
  return res.status(StatusCodes.OK).json({success: false, status: 'unknown'});
};

const getFriends = async (req, res) => {
  console.log(req.user);
  const user = await User.findById(req.user.userId).populate('friends').select('-password');
  res.status(StatusCodes.OK).json({ user: user.friends });
};

//claim daily reward
const claimDailyReward = async (req, res) => {
  try {
    // Find the user by ID
    const user = await User.findById(req.user.userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Get the current date and the last reward date
    const now = new Date();
    const lastRewardDate = user.lastRewardDate || new Date(0);  // Default to epoch if never claimed

    // Check if the last reward date is before today (and within the last 24 hours)
    const oneDay = 24 * 60 * 60 * 1000;
    const timeSinceLastReward = now - lastRewardDate;

    if (timeSinceLastReward >= oneDay) {
      // Determine if it's the next consecutive day
      const isConsecutiveDay = timeSinceLastReward < 2 * oneDay;

      // If consecutive day, increase the streak; otherwise, reset it
      if (isConsecutiveDay) {
        user.rewardStreak += 1;
      } else {
        user.rewardStreak = 1; // Reset streak if not consecutive
      }

      // Calculate the reward based on the streak
      const reward = 10 * user.rewardStreak; // Example: 10 points per day, increasing with the streak

      // Update the user's reward points and last reward date
      user.token += reward;
      user.weeklyToken += reward;
      user.monthlyToken += reward;
      user.lastRewardDate = now;
      if(req.body.status == 1) {
        await user.save();
        console.log('Daily reward claimed successfully');
      }

      return res.status(StatusCodes.OK).json({ 
        success: true, 
        message: `Daily reward claimed! You earned ${reward} points.`,
        token: user.token,
        reward: reward,
        rewardStreak: user.rewardStreak
      });
    } else {
      const hoursUntilNextReward = Math.ceil((oneDay - timeSinceLastReward) / (60 * 60 * 1000));
      return res.status(StatusCodes.OK).json({ success: false, hours: hoursUntilNextReward });
    }
  } catch (error) {
    console.error('Error claiming daily reward:', error);
    return res.status(StatusCodes.OK).json({ success: false, hours: 0 });
  }
};

const getLeaderboard = async (req, res) => {
  try {
    const type = req.body.type;
    var users = null;
    if (type == "week"){
      users = User.find({}).sort('-weeklyToken').limit(10).select('-password');
    }else if (type == "month"){
      users = User.find({}).sort('-monthlyToken').limit(10).select('-password');
    }else if (type == "all"){
      users = User.find({}).sort("-token").limit(10).select('-password');
    }
    users.exec((err,values) => {
      return res.status(StatusCodes.OK).json({users : values});
    })

  }catch(error){
    console.log(error);
  }
}
module.exports = {
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
  getLeaderboard,
};
