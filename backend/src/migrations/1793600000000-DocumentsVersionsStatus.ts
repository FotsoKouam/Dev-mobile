import { MigrationInterface, QueryRunner } from 'typeorm';

export class DocumentsVersionsStatus1793600000000 implements MigrationInterface {
  name = 'DocumentsVersionsStatus1793600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "documents"
      ADD COLUMN IF NOT EXISTS "error_message" character varying(500)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "documents"
      DROP COLUMN IF EXISTS "error_message"
    `);
  }
}
