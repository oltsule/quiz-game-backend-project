const express = require('express');
const router = express.Router();

const questions = require ("../data/questions");

// GET /api/questions/, /api/questions?=keyword=http
router.get("/", (req, res) => {
    const {keyword} = req.query;
    if(!keyword){
        return res.json(questions);
    }
    const filteredQuestions = questions.filter (q=> q.keywords.includes(keyword));
    res.json(filteredQuestions);
})

// GET /api/questions/:questionId
router.get("/:questionId", (req, res) => {
    const questionId = Number(req.params.questionId);
    const question = questions.find(q=> q.id === questionId);
    if (!question){
        return res.status(404).json({msg: "Question not found"});

    }
    res.json(question);
});

// POST /api/questions
router.post("/", (req, res) => {
    const {question, date, answer, keywords} = req.body;
    if(!question || !answer || !date) {
        return res.status(400).json({msg: "question, date and title are required!"});
    }

    const existingIds = questions.map(q=>q.id)
    const madId = Math.max(...existingIds)


    const newQuestion = {
        id: questions.length ? madId + 1: 1,
        question, date, answer,
        keywords: Array.isArray(keywords) ? keywords : []
    }

    questions.push(newQuestion);
    res.status(201).json(newQuestion);
});

//PUT /api/questions/:questionId
router.put("/:questionId", (req, res) => {
    const questionId = Number(req.params.questionId);
    const existingQuestion = questions.find(q=> q.id === questionId);
    if (!existingQuestion){
        return res.status(404).json({msg: "Question not found"});

    }


    const {question, date, answer, keywords} = req.body;
    if( !question || !date || !answer) {
        return res.status(400).json({msg: "Question, date and answer are required!"});
    }
    existingQuestion.question= question;
    existingQuestion.date = date;
    existingQuestion.answer = answer;
    existingQuestion.keywords = Array.isArray(keywords) ? keywords : [];

    res.json(existingQuestion);
})

// DELETE /api/questions/:questionId
router.delete("/:questionId", (req, res) => {
    const questionId = Number(req.params.questionId);
    const questionIndex = questions.findIndex(q=> q.id === questionId);

    if(questionIndex === -1){
        return res.status(404).json({msg:"Post not found"})
    }

    const deletedQuestion = questions.splice(questionIndex, 1);
    res.json({
        msg: "Question deleted succesfully",
        question: deletedQuestion
    });

});

module.exports = router;