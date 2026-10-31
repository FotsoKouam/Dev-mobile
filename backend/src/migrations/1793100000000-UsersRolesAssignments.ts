import { MigrationInterface, QueryRunner } from 'typeorm';

export class UsersRolesAssignments1793100000000 implements MigrationInterface {
  name = 'UsersRolesAssignments1793100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Types ENUM
    await queryRunner.query(
      `CREATE TYPE "public"."roles_code_enum" AS ENUM('platform_admin', 'school_admin', 'staff', 'student', 'guest', 'custom')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."roles_status_enum" AS ENUM('active', 'inactive')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_auth_method_enum" AS ENUM('google', 'password')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'inactive', 'suspended', 'invited')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."assignments_status_enum" AS ENUM('active', 'inactive')`,
    );

    // 2. Table roles
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "code" "public"."roles_code_enum" NOT NULL,
        "name" character varying(150) NOT NULL,
        "description" text,
        "is_system" boolean NOT NULL DEFAULT false,
        "status" "public"."roles_status_enum" NOT NULL DEFAULT 'active',
        CONSTRAINT "UQ_roles_code" UNIQUE ("code"),
        CONSTRAINT "PK_roles_id" PRIMARY KEY ("id")
      )
    `);

    // 3. Table role_permissions
    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "role_id" uuid NOT NULL,
        "permission_code" character varying(100) NOT NULL,
        CONSTRAINT "PK_role_permissions" PRIMARY KEY ("role_id", "permission_code"),
        CONSTRAINT "FK_role_permissions_role_id" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // 4. Table users
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "email" character varying(255) NOT NULL,
        "first_name" character varying(100) NOT NULL,
        "last_name" character varying(100) NOT NULL,
        "phone" character varying(50),
        "auth_method" "public"."users_auth_method_enum" NOT NULL,
        "status" "public"."users_status_enum" NOT NULL DEFAULT 'invited',
        "last_login_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    // 5. Table assignments
    await queryRunner.query(`
      CREATE TABLE "assignments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "user_id" uuid NOT NULL,
        "role_id" uuid NOT NULL,
        "school_id" uuid,
        "program_id" uuid,
        "status" "public"."assignments_status_enum" NOT NULL DEFAULT 'active',
        CONSTRAINT "PK_assignments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_assignments_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_assignments_role_id" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_assignments_school_id" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_assignments_program_id" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);

    // Index unique avec COALESCE pour gérer l'unicité stricte y compris avec des NULL
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_assignments_unique_assignment" ON "assignments" (
        "user_id",
        "role_id",
        COALESCE("school_id", '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE("program_id", '00000000-0000-0000-0000-000000000000'::uuid)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_assignments_unique_assignment"`);
    await queryRunner.query(`DROP TABLE "assignments"`);
    await queryRunner.query(`DROP TYPE "public"."assignments_status_enum"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_auth_method_enum"`);
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP TYPE "public"."roles_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."roles_code_enum"`);
  }
}
