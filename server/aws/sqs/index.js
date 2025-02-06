const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const prisma = require('../../prisma/prismaClient');
const { deleteObject } = require('../s3');
const { processVideosFromS3 } = require('../../utils/video');

const sqsClient = new SQSClient({
    region: "ap-south-1",
    credentials: {
        accessKeyId: process.env.AWS_SQS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SQS_SECRET_ACCESS_KEY,
    }
});

const queueUrl = process.env.AWS_SQS_QUEUE_URL;

async function receiveMessage() {
    const params = {
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 5,
        WaitTimeSeconds: 20
    };

    try {
        const data = await sqsClient.send(new ReceiveMessageCommand(params));
        if (data.Messages && data.Messages.length > 0) {
            console.log(`Received ${data.Messages.length} messages`);

            for (let message of data.Messages) {
                console.log('Processing message:', message);

                const body = JSON.parse(message.Body);
                const records = body.Records[0];
                const s3 = records.s3;
                const video_key = s3.object.key;

                // Process video
                await processVideosFromS3(video_key);

                // After processing, delete the message from SQS
                const deleteParams = {
                    QueueUrl: queueUrl,
                    ReceiptHandle: message.ReceiptHandle,
                };
                await sqsClient.send(new DeleteMessageCommand(deleteParams));
                console.log('Message deleted from SQS');
            }
        }
        else {
            console.log("No messages available");
        }
    } catch (error) {
        console.error('Error receiving messages:', error);
    }
}

module.exports = {
    receiveMessage
}