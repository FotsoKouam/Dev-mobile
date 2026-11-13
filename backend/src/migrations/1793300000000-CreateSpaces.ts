import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSpaces1793300000000 implements MigrationInterface {
  name = 'CreateSpaces1793300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "spaces" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "name" character varying(150) NOT NULL,
        "description" text,
        "type" character varying(20) NOT NULL DEFAULT 'institutional',
        "program_id" uuid,
        "owner_id" uuid,
        "status" character varying(20) NOT NULL DEFAULT 'active',
        CONSTRAINT "PK_spaces_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_spaces_program_id_name" UNIQUE ("program_id", "name"),
        CONSTRAINT "CHK_spaces_type_program_owner" CHECK (
          ("type" = 'institutional' AND "program_id" IS NOT NULL AND "owner_id" IS NULL) OR
          ("type" = 'personal' AND "owner_id" IS NOT NULL AND "program_id" IS NULL)
        ),
        CONSTRAINT "FK_spaces_program_id" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_spaces_owner_id" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "spaces"`);
  }
}

