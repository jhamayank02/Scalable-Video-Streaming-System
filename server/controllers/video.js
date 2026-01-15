const { putObjectUrl } = require('../aws/s3');
const prisma = require('../prisma/prismaClient');
const { TryCatch, ErrorHandler } = require('../utils/error');
const { getVideoUploadUrlSchema, getVideoSchema } = require('../zod/video');

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

    const filenameWithoutSpaces = filename.replace(' ', '-');
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2)}-${filenameWithoutSpaces}`;
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
exports.getVideo = TryCatch(async (req, res) => {
    const parsedData = getVideoSchema.parse(req.body);
    const { videoId } = parsedData;
    const video = await prisma.Video.findUnique({
        where: {
            id: videoId
        }
    });
    if(!video){
        throw new ErrorHandler("Video not found", 400);
    }
    res.status(200).json({
        status: 200,
        success: true,
        video
    });
})