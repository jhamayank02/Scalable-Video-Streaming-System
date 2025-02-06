const prisma = require("../prisma/prismaClient");
const { TryCatch, ErrorHandler } = require("../utils/error");
const { createSectionSchema, updateSectionSchema } = require("../zod/section");

exports.create = TryCatch(async (req, res) => {
    if(!req.user.is_instructor){
        throw new ErrorHandler("You are not an instructor", 401);
    }
    const parsedData = createSectionSchema.parse(req.body);

    const section = await prisma.Section.create({
        data: {
            ...parsedData
        }
    });

    res.status(200).json({
        status: 200,
        success: true,
        message: "Section has been added successfully",
        section
    });
})
exports.update = TryCatch(async (req, res) => {
    const parsedData = updateSectionSchema.parse(req.body);
    const { sectionId, title } = parsedData;

    const section = await prisma.Section.update({
        where: {
            id: sectionId
        },
        data: {
            title: title
        }
    });

    res.status(200).json({
        status: 200,
        success: true,
        message: "Section has been updated successfully",
        section
    });
})
exports.remove = TryCatch(async (req, res) => {
    const { sectionId } = req.body;
    if(!sectionId){
        throw new ErrorHandler("Section id not provided", 400);
    }
    
    const deletedSection = await prisma.Section.delete({
        where: {
            id: sectionId
        }
    });

    res.status(200).json({
        status: 200,
        success: true,
        message: "Section has been deleted successfully",
        section: deletedSection
    })
})
exports.details = TryCatch(async (req, res)=>{
    const {sectionId} = req.params;
    if(!sectionId){
        throw new ErrorHandler("Section id not provided", 400);
    }

    const section = await prisma.Section.findUnique({
        where: {
            id: sectionId
        }
    });
    if(!section){
        throw new ErrorHandler("Section not found", 400);
    }

    res.status(200).json({
        status: 200,
        success: true,
        section: section
    })
})
exports.list = TryCatch(async (req, res)=>{
    const sections = await prisma.Section.findMany({
        include: {
            course: true,
            video: true
        }
    });
    res.status(200).json({
        status: 200,
        success: true,
        sections
    })
})