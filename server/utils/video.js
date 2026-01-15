const { deleteObject } = require("../aws/s3");
const prisma = require("../prisma/prismaClient");

exports.processVideosFromS3 = async (video_key) => {
    const unprocessedVideo = await prisma.UnprocessedVideo.findUnique({
        where: {
            video_key
        }
    });

    const { id, title, description, duration, sectionId } = unprocessedVideo;
    let newVideoKey = video_key.split('/')[1];
    // Update in the database that the video is uploaded successfully
    await prisma.Video.create({
        data: {
            title, description, video_key: `processed/${newVideoKey}`, duration, sectionId
        }
    });
    // Delete the unprocessed video data from the database
    await prisma.UnprocessedVideo.delete({
        where: {
            id: id
        }
    });
}