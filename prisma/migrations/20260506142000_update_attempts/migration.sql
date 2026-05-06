-- DropForeignKey
ALTER TABLE `attempts` DROP FOREIGN KEY `attempts_questionId_fkey`;

-- DropIndex
DROP INDEX `attempts_questionId_fkey` ON `attempts`;

-- AddForeignKey
ALTER TABLE `attempts` ADD CONSTRAINT `attempts_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
