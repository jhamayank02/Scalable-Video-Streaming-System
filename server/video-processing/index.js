const { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, S3 } = require('@aws-sdk/client-s3');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
require('dotenv').config(); // REMOVE

const RESOLUTIONS = [
  {
    name: '360p',
    width: 480,
    height: 360,
    bandwidth: 800_000 // 800 kbps
  },
  {
    name: '480p',
    width: 858,
    height: 480,
    bandwidth: 1_400_000 // 1.4 Mbps
  },
  {
    name: '720p',
    width: 1280,
    height: 720,
    bandwidth: 2_800_000 // 2.8 Mbps
  }
]

const s3Client = new S3Client({
  region: 'ap-south-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
  }
});

const sqsClient = new SQSClient({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.SQS_ACCESS_KEY_ID,
    secretAccessKey: process.env.SQS_SECRET_ACCESS_KEY,
  }
});

const QUEUE_URL = process.env.SQS_URL;
const BUCKET_NAME = process.env.BUCKET_NAME;
const KEY = process.env.KEY;

async function downloadVideo(BUCKET_NAME, KEY, originalVideoPath) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: KEY
    });
    const result = await s3Client.send(command);
    await fs.promises.writeFile(originalVideoPath, result.Body);
    console.log("Video downloaded and written successfully");
  } catch (error) {
    console.log(`Error occurred while downloading and saving the video`, error);
    process.exit(1);
  }
}

async function createMasterPlaylist(outputDir, variants) {
  let content = '#EXTM3U\n#EXT-X-VERSION:3\n';

  for (const v of variants) {
    content += `#EXT-X-STREAM-INF:BANDWIDTH=${v.bandwidth},RESOLUTION=${v.width}x${v.height}\n`;
    content += `${v.name}/index.m3u8\n`;
  }

  await fs.writeFile(path.join(outputDir, 'master.m3u8'), content, (err) => {
    if (err) throw err;
  });
}

async function transcodeVideo(absoluteVideoPath) {
  try {
    // Create separate directories for each resolution
    const dirs = await Promise.all(RESOLUTIONS.map(resolution => {
      const resolutionPath = path.join("hls", `${resolution.name}`);
      return fs.promises.mkdir(resolutionPath, { recursive: true });
    }));

    // Process the video
    const promises = RESOLUTIONS.map(resolution => {
      const resolutionPath = path.join("hls", `${resolution.name}`);
      const outputFile = path.join(resolutionPath, `${resolution.name}.m3u8`);
      const segmentFile = path.join(resolutionPath, `${resolution.name}_%03d.ts`);

      return new Promise((resolve, reject) => {
        ffmpeg(absoluteVideoPath)
          .output(outputFile)
          .outputOptions([
            `-s`, `${resolution.width}x${resolution.height}`,
            `-c:v`, `libx264`,
            `-preset`, `fast`,
            `-crf`, `22`,
            `-c:a`, `aac`,
            `-b:a`, `128k`,
            `-f`, `hls`,
            `-hls_time`, `10`,
            `-hls_list_size`, `0`,
            `-hls_segment_filename`, segmentFile
          ])
          .on('start', () => {
            console.log(`HLS Conversion started for ${resolution.name}`);
          })
          .on('end', () => {
            console.log(`HLS Conversion completed for ${resolution.name}`);
            resolve();
          })
          .on('error', (err) => {
            console.log(`HLS conversion error for ${resolution.name}: ${err}`);
            reject(err);
          })
          .run();
      });
    });
    await Promise.all(promises);
    const masterPlaylistFilePath = path.join("hls");
    console.log(masterPlaylistFilePath)
    createMasterPlaylist(masterPlaylistFilePath, RESOLUTIONS);
  } catch (error) {
    console.log(`Error occurred while creating directories and transcoding videos: ${error}`);
    process.exit(1);
  }
}

async function deleteVideoFromS3(BUCKET_NAME, KEY) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: KEY
    });
    const result = await s3Client.send(command);
    console.log(`Deleted ${KEY} successfully from S3`);
  } catch (error) {
    console.log(`Error occurred while deleting the original video from S3: ${error}`);
  }
}

async function uploadVideos(BUCKET_NAME, KEY) {
  const rootDir = path.resolve('hls');
  await uploadVideosToS3(rootDir, BUCKET_NAME, KEY, rootDir)
}

async function uploadVideosToS3(dir, BUCKET_NAME, KEY, rootDir) {
  const files = await fs.promises.readdir(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);

    const stat = await fs.promises.stat(filePath);
    if (stat.isDirectory()) {
      // Upload directory to s3
      console.log(`Uploading ${file} directory`);
      await uploadVideosToS3(filePath, BUCKET_NAME, KEY, rootDir);
    }
    else {
      // Upload files to s3
      const relativePath = path.relative(rootDir, filePath);
      const fileStream = fs.createReadStream(filePath);
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `${KEY}/${relativePath.replace(/\\/g, '/')}`,
        Body: fileStream
      });

      try {
        const result = await s3Client.send(command);
        console.log(`Uploaded ${KEY}/${path.basename(dir)}/${file} successfully`);
      } catch (error) {
        console.log(`Error occurred while uploading ${filePath}: ${error}`);
        process.exit(1);
      }
    }
  }
}

async function notifyServer(key) {
  try {
    const params = {
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify({ key })
    };
    const command = new SendMessageCommand(params);
    const result = await sqsClient.send(command);
    console.log(`Notified the server for the successful processing of ${key}`);
  } catch (error) {
    console.log(`Failed to notify the server for the successful processing of ${key}: ${error}`);
    process.exit(1);
  }
}

async function init() {
  // Download the original video
  const originalVideoPath = `original-video.mp4`;
  await downloadVideo(BUCKET_NAME, KEY, originalVideoPath);
  const absoluteVideoPath = path.resolve(originalVideoPath);

  // Start the transcoder
  await transcodeVideo(absoluteVideoPath);

  // Upload the transcoded videos to s3
  // const s3Key = KEY.split('/')[1];
  const s3Key = KEY.split('/')[1].split('.')[0];
  await uploadVideos(BUCKET_NAME, `processed/${s3Key}`);

  // Delete the original video from s3
  await deleteVideoFromS3(BUCKET_NAME, KEY);

  // Notify the server that the video has been processed
  await notifyServer(`processed/${s3Key}`);
}

init();