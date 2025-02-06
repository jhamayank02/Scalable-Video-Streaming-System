const { putObjectUrl } = require('../aws/s3');
const prisma = require('../prisma/prismaClient');
const { TryCatch, ErrorHandler } = require('../utils/error');
const { getVideoUploadUrlSchema } = require('../zod/video');

exports.getUploadUrl = TryCatch(async (req, res) => {
    const parsedData = getVideoUploadUrlSchema.parse(req.body);
    const { filename, contentType, title, description, sectionId, duration } = parsedData;

    const isSectionExists = await prisma.section.findUnique({
        where: {
            id: sectionId
        }
    });
    if (!isSectionExists) {
        throw new ErrorHandler("It seems like the course section in which you are trying to upload is deleted.", 400);
    }

    const allowedVideoContentTypes = [
        'video/mp4',
        'video/webm',
        'video/avi'
    ];
    if (!allowedVideoContentTypes.includes(contentType)) {
        throw new ErrorHandler("Invalid content type", 400);
    }
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2)}-${filename}`;
    const unprocessedVideo = await prisma.UnprocessedVideo.create({
        data: {
            title, description, video_key: `unprocessed/${uniqueFilename}`, sectionId, duration
        }
    });
    const presignedUrl = await putObjectUrl(uniqueFilename, contentType);
    unprocessedVideo.video_key = undefined;
    res.status(200).json({
        status: 200,
        success: true,
        uploadUrl: presignedUrl,
        videoDetails: unprocessedVideo
    })
});