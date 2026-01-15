const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3Client = new S3Client({
    region: "ap-south-1",
    credentials: {
        accessKeyId: process.env.AWS_S3_ACCESS_KEY,
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
    }
});

async function getObjectUrl(key) {
    const command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: "processed/1739866180204-70nrl3u580j-firstvideo/",
    });
    const result = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    console.log(result)
    return result;
}

getObjectUrl()

async function putObjectUrl(filename, contentType) {
    const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: `unprocessed/${filename}`,
        ContentType: `${contentType}`
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 90 });
    return url;
}

async function deleteObject(key) {
    const command = new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key
    });
    const result = await s3Client.send(command);
    console.log(result);
}

module.exports = {
    getObjectUrl,
    putObjectUrl,
    deleteObject
}