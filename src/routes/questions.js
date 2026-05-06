const express = require('express');
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require('../middleware/auth');
const isOwner = require('../middleware/isOwner');
const multer = require("multer");
const path = require("path");


const storage = multer.diskStorage({
    destination: path.join(__dirname,"..", "..", "public", "uploads"),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const newName= `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`;
        cb(null, newName)

    }
})

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image")){
            cb(null, true)
        } else {
            cb(new Error("Only images allowed"))
        }
    },
    limits: {fileSize: 5 * 1024 * 1024}

})


function formatQuestion(question) {
    return {
        ...question,
        date: question.date.toISOString().split("T") [0],
        keywords: question.keywords.map((k) => k.name),
        userName: question.user ? question.user.name : null,
        user: undefined,
        attempts: undefined,
        solved: question.attempts && question.attempts.some(a => a.correct)
        };
}

router.use(authenticate);



// GET /api/questions/, /api/questions?=keyword=http&page=1&limit=5
router.get("/", async (req, res) => {
    const {keyword} = req.query;

    const where = keyword ?
    {keywords: {some: {name: keyword}}}: {};

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 5));
    const skip = (page - 1) * limit;

    const [filteredQuestions, total] = await Promise.all([prisma.question.findMany({
        where,
        include: {
            keywords: true, 
            user: true,
            likes: {where: {userId: req.user.userId}, take: 1},
            _count: {select: {likes: true}},
            attempts: { where: { userId: req.user.userId, correct: true }, take: 1 }
        },
        orderBy: {id: "asc"},
        skip,
        take: limit
    }), prisma.question.count({where})]);

    res.json({
        data: filteredQuestions.map(formatQuestion),
        page,
        limit,
        total,
        totalPages: Math.ceil(total/limit)
    })
});

// GET /api/questions/:questionId
router.get("/:questionId", async (req, res) => {
    const questionId = Number(req.params.questionId);
    const question = await prisma.question.findUnique({
    where: {id: questionId},
    include: { 
        keywords: true,
        user: true,
        attempts: { where: { userId: req.user.userId, correct: true }, take: 1 }
    }
    });

    if (!question){
        return res.status(404).json({msg: "Question not found"});

    }
    res.json(formatQuestion(question));
});

// POST /api/questions
router.post("/", upload.single("image"), async (req, res) => {
    const {question, date, answer, keywords} = req.body;
    if(!question || !answer || !date) {
        return res.status(400).json({msg: "question, answer and date are required!"});
    }

    const keywordsArray = Array.isArray(keywords) ? keywords : [];
    const imageUrl = req.file ? `/uploads/${req.file.filename}`:null;
    const newQuestion = await prisma.question.create({
        data: {
            question, date: new Date(date), answer, imageUrl,
            user: {
                    connect: { id: req.user.userId }
                },
            
            keywords: {
                connectOrCreate: keywordsArray.map((kw) => ({
                    where: {name: kw}, create: {name:kw},
                    })), }
        },
        include:{keywords: true,
            user: true
        },
    })

    res.status(201).json(formatQuestion(newQuestion));
});

//PUT /api/questions/:questionId
router.put("/:questionId", isOwner, upload.single("image"), async (req, res) => {
    const questionId = Number(req.params.questionId);

    const existingQuestion = await prisma.question.findUnique({where: {id:questionId}});

    if (!existingQuestion){
        return res.status(404).json({msg: "Question not found"});
    }

    const {question, date, answer, keywords} = req.body;

    if( !question || !date || !answer) {
        return res.status(400).json({msg: "Question, date and answer are required!"});
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}`:null;

    const keywordsArray = Array.isArray(keywords) ? keywords : [];
    const updatedQuestion = await prisma.question.update({
        where: {id: questionId},
        data:{
        question, date: new Date(date), answer, imageUrl,
        keywords: {
            set:[],
            connectOrCreate: keywordsArray.map((kw) => ({
            where: {name: kw},
            create: {name: kw},
            })),
        },
        },
        include:{
            keywords: true,
            user: true,
        },
    });
    res.json(formatQuestion(updatedQuestion));
});

// DELETE /api/questions/:questionId
router.delete("/:questionId", isOwner, async (req, res) => {
    const questionId = Number(req.params.questionId);
    
    const question = await prisma.question.findUnique({
    where: {id: questionId},
    include:{keywords: true, user: true},
    });

    if (!question){
        return res.status(404).json({message: "Question not found"});
    }

    await prisma.question.delete({where: {id: questionId}});

    
    res.json({
        message: "Question deleted succesfully",
        question: formatQuestion(question),
    });

});

//POST /api/questions/:questionId/like
router.post("/:questionId/like", async (req, res) =>{
    const questionId = Number(req.params.questionId);
    const question = await prisma.question.findUnique({where: {id: questionId}});
    if(!question){
        return res.status(404).json({message: "Question not found"});
    }
    const like = await prisma.like.upsert({
        where: {userId_questionId: {userId: req.user.userId, questionId}},
        update: {},
        create: {userId: req.user.userId, questionId}
    });
    const likeCount = await prisma.like.count({where: {questionId}})

    res.status(201).json({
        id: like.id,
        questionId,
        liked: true,
        likeCount,
        createdAt: like.createdAt
    });
});  

//DELETE /api/questions/:questionId/like
router.delete("/:questionId/like", async (req, res) =>{
    const questionId = Number(req.params.questionId);
    const question = await prisma.question.findUnique({where: {id: questionId}});
    if(!question){
        return res.status(404).json({message: "Question not found"});
    }

    const like = await prisma.like.deleteMany({
        where: {userId: req.user.userId, questionId},
    });

    const likeCount = await prisma.like.count({where: {questionId}})

    res.json({
        questionId,
        liked: false,
        likeCount
    });
});

// POST /api/questions/:questionId/play
router.post("/:questionId/play", async (req, res) => {
    const questionId = Number(req.params.questionId);
    const { answer } = req.body;

    if (!answer) {
        return res.status(400).json({ msg: "Answer is required" });
    }

    const question = await prisma.question.findUnique({
        where: { id: questionId }
    });

    if (!question) {
        return res.status(404).json({ msg: "Question not found" });
    }

    const isCorrect = question.answer.toLowerCase().trim() === answer.toLowerCase().trim();

    await prisma.attempt.create({
        data: {
            userId: req.user.userId,
            questionId: questionId,
            correct: isCorrect
        }
    });

    res.json({
        correct: isCorrect,
        correctAnswer: isCorrect ? null : question.answer
    });
});

module.exports = router;