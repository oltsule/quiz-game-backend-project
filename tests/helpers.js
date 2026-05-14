const prisma = require("../src/lib/prisma");
const request = require("supertest");
const app = require("../src/app");

async function resetDb() {
    await prisma.question.deleteMany();
    await prisma.keyword.deleteMany();
    await prisma.user.deleteMany();
}

async function registerAndLogin(email= "a@test.io", name = "A") {
    await request(app).post("/api/auth/register").send({email, name, password: "pw12345"});
    const res = await request(app).post("/api/auth/login").send({email, password: "pw12345"});
    return res.body.token;
}

async function createQuestion(token, overrides={}){
    const res = await request(app).post("/api/questions")
    .set("Authorization",`Bearer ${token}`)
    .send({title: "T", date: "2026-02-01", content: "C", ...overrides})
    return res.body;
}

module.exports = {resetDb, registerAndLogin, createQuestion, request, app, prisma};