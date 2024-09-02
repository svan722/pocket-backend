require('dotenv').config();
require('express-async-errors');
// express

const path = require('path');
const express = require('express');
const app = express();
// rest of the packages
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');
const rateLimiter = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');

// database
const connectDB = require('./db/connect');

//  routers
const authRouter = require('./routes/authRoutes');
const userRouter = require('./routes/userRoutes');

// middleware
const notFoundMiddleware = require('./middleware/not-found');
const errorHandlerMiddleware = require('./middleware/error-handler');

// Cron job
const cron = require("node-cron");
const User = require('./models/User');

const resetWeekly = async () => {
  await User.updateMany({}, {$set: { ["weeklyToken"]: 0}});
}

const resetMonthly = async () => {
  await User.updateMany({}, {$set: { ["monthly"]: 0}});
}

cron.schedule("0 0 1 * *",resetMonthly,{
  schedule: true,
  timezone: "America/New_York"
})

cron.schedule("0 0 * * SUN",resetWeekly,{
  schedule: true,
  timezone: "America/New_York"
})

app.set('trust proxy', 1);
app.use(
  rateLimiter({
    windowMs: 60 * 1000,
    max: 600000,
  })
);
app.use(helmet());
app.use(cors());
app.use(xss());
app.use(mongoSanitize());

app.use(express.json());
app.use(cookieParser(process.env.JWT_SECRET));

app.use(express.static('./dist'));
app.use(fileUpload());

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);

app.get('*', function(req, res) {
  res.sendFile('index.html', {root: path.join(__dirname, 'build')});
});

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

const port = process.env.PORT || 5000;
const start = async () => {
  try {
    await connectDB(process.env.MONGO_URL);
    app.listen(port, () =>
      console.log(`Server is listening on port ${port}...`)
    );
  } catch (error) {
    console.log(error);
  }
};

start();
