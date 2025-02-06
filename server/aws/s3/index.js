const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// *************** TODO -> CHANGE NODE JS USER PERMISSION TO SINGLE BUCKET ONLY
const s3Client = new S3Client({
    region: "ap-south-1",
    credentials: {
        accessKeyId: process.env.AWS_S3_ACCESS_KEY,
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
    }
});

async function getObjectUrl(key) {

}

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