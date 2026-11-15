import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuditLogsIndexes1793500000000 implements MigrationInterface {
  name = 'AuditLogsIndexes1793500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_created_at" ON "audit_logs" ("created_at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_action" ON "audit_logs" ("action")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_action"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_created_at"`);
  }
}
