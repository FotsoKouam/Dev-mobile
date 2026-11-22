import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOfficeFileTypes1793900000000 implements MigrationInterface {
  name = 'AddOfficeFileTypes1793900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "CHK_documents_file_type";`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ADD CONSTRAINT "CHK_documents_file_type" CHECK ("file_type" IN ('pdf','scanned_pdf','image','docx','pptx'));`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "CHK_documents_file_type";`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ADD CONSTRAINT "CHK_documents_file_type" CHECK ("file_type" IN ('pdf','scanned_pdf','image'));`,
    );
  }
}
