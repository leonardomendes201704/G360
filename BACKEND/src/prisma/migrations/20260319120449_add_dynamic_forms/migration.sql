-- AlterTable
ALTER TABLE "ServiceCatalog" ADD COLUMN     "formSchema" JSONB DEFAULT '{}';

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "customAnswers" JSONB DEFAULT '{}';
