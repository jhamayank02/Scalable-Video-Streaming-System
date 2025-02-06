const { deleteObject } = require("../aws/s3");
const prisma = require("../prisma/prismaClient");

exports.processVideosFromS3 = async (video_key)=>{
    const unprocessedVideo = await prisma.UnprocessedVideo.findUnique({
        where: {
            video_key
        }
    });

    if (!unprocessedVideo) {
        // Delete this video from s3
        await deleteObject(video_key);
    }
    else {
        const { id, title, description, video_key, duration, sectionId } = unprocessedVideo;
        // Update in the database that the video is uploaded successfully
        await prisma.Video.create({
            data: {
                title, description, video_key, duration, sectionId
            }
        });
        // Delete the unprocessed video data from the database
        await prisma.UnprocessedVideo.delete({
            where: {
                id: id
            }
        });
    }
}