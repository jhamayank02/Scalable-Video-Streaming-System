const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const cron = require('node-cron');

const appRoutes = require('./routes/index');
const { globalErrorHandler } = require('./middlewares/error');
const { receiveVideoUploadedMessage: unprocessedVideoInfo, receiveVideoProcessedMessage: processedVideoInfo } = require('./aws/sqs');

// Configure .env
dotenv.config();

const app = express();

const PORT = process.env.PORT || 8000;

app.use(morgan('combined'));
// TODO -> CORS
app.use(cors());
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));

// Routes
app.use('/api/v1', appRoutes);
app.use('/', (req, res) => {
    res.send("Server is running🚀🚀🚀");
});
app.use(globalErrorHandler);


// CHECK FOR UNPROCESSED VIDEOS FROM S3 (Every 1 min)
cron.schedule("* * * * *", unprocessedVideoInfo);

// CHECK FOR PROCESSED VIDEOS ECS
cron.schedule("* * * * *", processedVideoInfo);


app.listen(PORT, () => {
    console.log("Server started on PORT:", PORT);
})