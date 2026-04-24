const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");





const seedQuestions = [
  {
    question: "What is the capital of Finland",
    date: new Date("2026-03-20"),
    answer:
      "Helsinki",
    keywords: ["capital", "city"],
  },
  {
    question: "What is 2+2",
    date: new Date("2026-03-22"),
    answer:
      "4",
    keywords: ["calculation", "math"],
  },
  {
    question: "What does UEF stand for?",
    date: new Date("2026-03-25"),
    answer:
      "University of Eastern Finland",
    keywords: ["school", "kuopio", "uef"],
  },
  {
    question: "What sport team is Kalpa?",
    date: new Date("2026-03-26"),
    answer:
      "Ice hockey",
    keywords: ["ice hockey", "sport"],
  },
];

async function main() {
  await prisma.question.deleteMany();
  await prisma.keyword.deleteMany();
  await prisma.user.deleteMany();


  const hashedPassword=await bcrypt.hash("1234", 10);

  const user = await prisma.user.create({
    data: {
      email: "example@example.com",
      password: hashedPassword,
      name: "Example user" 
    }
  });


  for (const question of seedQuestions) {
    await prisma.question.create({
      data: {
        question: question.question,
        date: question.date,
        answer: question.answer,
        userId: user.id,
        keywords: {
          connectOrCreate: question.keywords.map((kw) => ({
            where: { name: kw },
            create: { name: kw },
          })),
        },
      },
    });
  }

  console.log("Seed data inserted successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
