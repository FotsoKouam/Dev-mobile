import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminStaffRole1794100000000 implements MigrationInterface {
  name = 'AddAdminStaffRole1794100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "public"."roles_code_enum" ADD VALUE IF NOT EXISTS 'admin_staff'`);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Note : PostgreSQL ne permet pas facilement de DROP VALUE d'un ENUM sans recréer le type.
    // Les rôles restent rétro-compatibles si admin_staff n'est pas utilisé.
  }
}
