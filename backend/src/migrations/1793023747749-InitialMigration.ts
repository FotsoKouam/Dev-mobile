import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1793023747749 implements MigrationInterface {
    name = 'InitialMigration1793023747749'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."programs_status_enum" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "programs" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "school_id" uuid NOT NULL, "name" character varying(150) NOT NULL, "description" text, "status" "public"."programs_status_enum" NOT NULL DEFAULT 'active', CONSTRAINT "UQ_1b892850ea32cf828b136fce4e3" UNIQUE ("school_id", "name"), CONSTRAINT "PK_d43c664bcaafc0e8a06dfd34e05" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."schools_type_enum" AS ENUM('public', 'private')`);
        await queryRunner.query(`CREATE TYPE "public"."schools_status_enum" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "schools" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying(150) NOT NULL, "type" "public"."schools_type_enum" NOT NULL, "city" character varying(150) NOT NULL, "address" character varying(255), "phone" character varying(50), "description" text, "google_workspace_domain" character varying(255), "main_language" character varying(10) NOT NULL DEFAULT 'fr', "status" "public"."schools_status_enum" NOT NULL DEFAULT 'active', CONSTRAINT "UQ_32fbaf4feccea51ef7aeefa62bb" UNIQUE ("name"), CONSTRAINT "PK_95b932e47ac129dd8e23a0db548" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "programs" ADD CONSTRAINT "FK_d7a5344bdbf4566726fdc7c0a27" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "programs" DROP CONSTRAINT "FK_d7a5344bdbf4566726fdc7c0a27"`);
        await queryRunner.query(`DROP TABLE "schools"`);
        await queryRunner.query(`DROP TYPE "public"."schools_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."schools_type_enum"`);
        await queryRunner.query(`DROP TABLE "programs"`);
        await queryRunner.query(`DROP TYPE "public"."programs_status_enum"`);
    }

}
