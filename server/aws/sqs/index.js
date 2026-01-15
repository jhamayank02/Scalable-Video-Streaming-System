const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const { ECSClient, RunTaskCommand } = require('@aws-sdk/client-ecs');
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

const ecsClient = new ECSClient({
    region: "ap-south-1",
    credentials: {
        accessKeyId: process.env.AWS_SQS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SQS_SECRET_ACCESS_KEY,
    }
});

async function receiveVideoUploadedMessage() {
    const params = {
        QueueUrl: process.env.AWS_SQS_QUEUE_URL,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 20
    };

    try {
        const data = await sqsClient.send(new ReceiveMessageCommand(params));
        console.log(data)
        if (data.Messages && data.Messages.length > 0) {
            console.log(`VIDEO_UPLOADED: Received ${data.Messages.length} messages`);

            for (let message of data.Messages) {
                console.log('VIDEO_UPLOADED: Processing message:', message);

                const body = JSON.parse(message.Body);
                const event = body.Event;
                if (event !== "s3:TestEvent") {
                    const records = body.Records[0];
                    const s3 = records.s3;
                    const video_key = s3.object.key;
                    const bucket = s3.bucket;

                    const isDirectory = video_key.endsWith('/');
                    console.log(process.env.AWS_SQS_ACCESS_KEY, process.env.AWS_SQS_SECRET_ACCESS_KEY, process.env.NOTIFY_VIDEO_PROCESSED_SQS, video_key)

                    if (!isDirectory) {
                        // Spin the docker container
                        const runTaskCommand = new RunTaskCommand({
                            taskDefinition: 'arn:aws:ecs:ap-south-1:802249258452:task-definition/scalable-video-streaming-service-task:1',
                            cluster: 'arn:aws:ecs:ap-south-1:802249258452:cluster/scalable-video-streaming-service-cluster',
                            launchType: 'FARGATE',
                            networkConfiguration: {
                                awsvpcConfiguration: {
                                    assignPublicIp: "ENABLED",
                                    securityGroups: ['sg-03b742963714a6cd9'],
                                    subnets: ['subnet-01fb277a617987831', 'subnet-0bce79c0920ccb492', 'subnet-01403eafa3018988b']
                                }
                            },
                            overrides: {
                                containerOverrides: [{
                                    name: "video-transcoder", environment: [
                                        { name: 'BUCKET_NAME', value: bucket.name },
                                        { name: 'KEY', value: video_key },
                                        { name: 'SQS_ACCESS_KEY_ID', value: process.env.SQS_ACCESS_KEY_ID },
                                        { name: 'SQS_SECRET_ACCESS_KEY', value: process.env.SQS_SECRET_ACCESS_KEY },
                                        { name: 'S3_ACCESS_KEY_ID', value: process.env.S3_ACCESS_KEY_ID },
                                        { name: 'S3_SECRET_ACCESS_KEY', value: process.env.S3_SECRET_ACCESS_KEY },
                                        { name: 'SQS_URL', value: process.env.NOTIFY_VIDEO_PROCESSED_SQS },
                                    ]
                                }]
                            }
                        });
                        await ecsClient.send(runTaskCommand);

                        // Process video
                        await processVideosFromS3(video_key);
                    }
                }
                // After processing, delete the message from SQS
                const deleteParams = {
                    QueueUrl: process.env.AWS_SQS_QUEUE_URL,
                    ReceiptHandle: message.ReceiptHandle,
                };
                await sqsClient.send(new DeleteMessageCommand(deleteParams));
                console.log('VIDEO_UPLOADED: Message deleted from SQS');
            }
        }
        else {
            console.log("VIDEO_UPLOADED: No messages available");
        }
    } catch (error) {
        console.error('VIDEO_UPLOADED: Error receiving messages:', error);
    }
}

async function receiveVideoProcessedMessage() {
    const params = {
        QueueUrl: process.env.NOTIFY_VIDEO_PROCESSED_SQS,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 20
    };

    try {
        const data = await sqsClient.send(new ReceiveMessageCommand(params));
        console.log(data)
        if (data.Messages && data.Messages.length > 0) {
            console.log(`VIDEO_PROCESSED: Received ${data.Messages.length} messages`);

            for (let message of data.Messages) {
                console.log('VIDEO_PROCESSED: Processing message:', message);

                const body = JSON.parse(message.Body);
                const event = body.Event;
                const video_key = body.key;

                if (video_key) {
                    const isVideoAvailable = await prisma.Video.findUnique({
                        where: {
                            video_key
                        }
                    });
                    if (isVideoAvailable) {
                        await prisma.Video.update({
                            where: {
                                video_key
                            },
                            data: {
                                isProcessed: true
                            }
                        });
                    }
                    else {
                        // Delete from s3
                        await deleteObject(video_key);
                    }
                }
                // After processing, delete the message from SQS
                const deleteParams = {
                    QueueUrl: process.env.NOTIFY_VIDEO_PROCESSED_SQS,
                    ReceiptHandle: message.ReceiptHandle,
                };
                await sqsClient.send(new DeleteMessageCommand(deleteParams));
                console.log('VIDEO_PROCESSED: Message deleted from SQS');
            }
        }
        else {
            console.log("VIDEO_PROCESSED: No messages available");
        }
    } catch (error) {
        console.error('VIDEO_PROCESSED: Error receiving messages:', error);
    }
}

module.exports = {
    receiveVideoUploadedMessage,
    receiveVideoProcessedMessage
}

{
  Body: '{"Records":[{"eventVersion":"2.1","eventSource":"aws:s3","awsRegion":"ap-south-1","eventTime":"2026-01-14T16:23:49.360Z","eventName":"ObjectCreated:Put","userIdentity":{"principalId":"AWS:AIDA3VSOIGXKLBDDUP4QA"},"requestParameters":{"sourceIPAddress":"103.95.83.169"},"responseElements":{"x-amz-request-id":"NZ1FK25BBGK1A3JC","x-amz-id-2":"JdzbUL+l2teMHSJwDV5bW0psz8wVNuoo4F+Rsg8uHbt/CVjF5iurxlqP6n/HRtrfgQH1/J9kgSBYORMwyc+i90Fb50h3wCOz"},"s3":{"s3SchemaVersion":"1.0","configurationId":"video-uploaded","bucket":{"name":"scalable-video-streaming-service-mj","ownerIdentity":{"principalId":"A3G26V3G6N9ROK"},"arn":"arn:aws:s3:::scalable-video-streaming-service-mj"},MTM/7+DNzqT1ppThJrqyQxuaap1rhUIYl2m6mxd6BA8i9+yCg7rgpRHVYP+7Q2rig6pJlJ4rm/iyYo+wqYotlGD69LjYV+Kh4RdnzoRkXktSlHJWdTXQzzTP314CcpwMA21TlBKiSvxjNIqtvJWSkGqa53qkzEvbUfvWo9zZgp1thdPHQB0XmqdPE3vmb7JHLi3i566NBHEFPDxrfy9V17LUQQkuFN6MXzxS+CRTu4Z+ijJDGbHbDcxPQttEIv75piPAzz5l0y2A=='
}