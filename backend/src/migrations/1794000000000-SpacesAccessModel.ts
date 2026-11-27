import { MigrationInterface, QueryRunner } from 'typeorm';

export class SpacesAccessModel1794000000000 implements MigrationInterface {
  name = 'SpacesAccessModel1794000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Vérifier si des espaces personnels existent
    const personalSpaces: Array<{ count: string }> = await queryRunner.query(
      `SELECT COUNT(*)::text as count FROM "spaces" WHERE "type" = 'personal'`,
    );
    if (personalSpaces.length > 0 && parseInt(personalSpaces[0].count, 10) > 0) {
      throw new Error(
        `Migration impossible : ${personalSpaces[0].count} espaces personnels détectés dans "spaces". Le modèle ADR 0003 ne prend plus en charge les espaces personnels.`,
      );
    }

    // 2. Ajouter les nouvelles colonnes de spaces (temporairement nullables pour permettre la conversion des données)
    await queryRunner.query(`ALTER TABLE "spaces" ADD COLUMN "school_id" uuid`);
    await queryRunner.query(`ALTER TABLE "spaces" ADD COLUMN "scope" character varying(20)`);
    await queryRunner.query(`ALTER TABLE "spaces" ADD COLUMN "scope_program_id" uuid`);
    await queryRunner.query(`ALTER TABLE "spaces" ADD COLUMN "scope_role_code" character varying(20)`);

    // 3. Convertir les données existantes (espaces institutionnels de démo)
    // Récupérer le school_id depuis la filière rattachée via program_id
    await queryRunner.query(`
      UPDATE "spaces" s
      SET "school_id" = p."school_id",
          "scope" = 'program',
          "scope_program_id" = s."program_id"
      FROM "programs" p
      WHERE s."program_id" = p."id"
    `);

    // Pour tout espace qui n'aurait pas de filière liée (au cas où), rattacher à la première école et passer en scope 'school'
    await queryRunner.query(`
      UPDATE "spaces"
      SET "school_id" = (SELECT "id" FROM "schools" LIMIT 1),
          "scope" = 'school'
      WHERE "school_id" IS NULL
    `);

    // 4. Supprimer les contraintes et colonnes obsolètes de spaces
    await queryRunner.query(`ALTER TABLE "spaces" DROP CONSTRAINT IF EXISTS "CHK_spaces_type_program_owner"`);
    await queryRunner.query(`ALTER TABLE "spaces" DROP CONSTRAINT IF EXISTS "UQ_spaces_program_id_name"`);
    await queryRunner.query(`ALTER TABLE "spaces" DROP CONSTRAINT IF EXISTS "FK_spaces_program_id"`);
    await queryRunner.query(`ALTER TABLE "spaces" DROP CONSTRAINT IF EXISTS "FK_spaces_owner_id"`);

    await queryRunner.query(`ALTER TABLE "spaces" DROP COLUMN "type"`);
    await queryRunner.query(`ALTER TABLE "spaces" DROP COLUMN "owner_id"`);
    await queryRunner.query(`ALTER TABLE "spaces" DROP COLUMN "program_id"`);

    // 5. Rendre school_id et scope NOT NULL et poser les contraintes d'intégrité
    await queryRunner.query(`ALTER TABLE "spaces" ALTER COLUMN "school_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "spaces" ALTER COLUMN "scope" SET NOT NULL`);

    await queryRunner.query(`
      ALTER TABLE "spaces"
      ADD CONSTRAINT "FK_spaces_school_id"
      FOREIGN KEY ("school_id") REFERENCES "schools"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "spaces"
      ADD CONSTRAINT "FK_spaces_scope_program_id"
      FOREIGN KEY ("scope_program_id") REFERENCES "programs"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "spaces"
      ADD CONSTRAINT "CHK_spaces_scope"
      CHECK ("scope" IN ('school', 'program', 'role', 'individual'))
    `);

    await queryRunner.query(`
      ALTER TABLE "spaces"
      ADD CONSTRAINT "CHK_spaces_scope_coherence"
      CHECK (
        ("scope" = 'program' AND "scope_program_id" IS NOT NULL AND "scope_role_code" IS NULL) OR
        ("scope" = 'role' AND "scope_role_code" IS NOT NULL AND "scope_program_id" IS NULL) OR
        ("scope" IN ('school', 'individual') AND "scope_program_id" IS NULL AND "scope_role_code" IS NULL)
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "spaces"
      ADD CONSTRAINT "UQ_spaces_school_id_name"
      UNIQUE ("school_id", "name")
    `);

    // 6. Créer la table space_members
    await queryRunner.query(`
      CREATE TABLE "space_members" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "space_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "created_by_id" uuid,
        CONSTRAINT "PK_space_members_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_space_members_space_id_user_id" UNIQUE ("space_id", "user_id"),
        CONSTRAINT "FK_space_members_space_id" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_space_members_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_space_members_created_by_id" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_space_members_user_id" ON "space_members" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Supprimer space_members
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_space_members_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "space_members"`);

    // 2. Supprimer les contraintes ajoutées sur spaces
    await queryRunner.query(`ALTER TABLE "spaces" DROP CONSTRAINT IF EXISTS "UQ_spaces_school_id_name"`);
    await queryRunner.query(`ALTER TABLE "spaces" DROP CONSTRAINT IF EXISTS "CHK_spaces_scope_coherence"`);
    await queryRunner.query(`ALTER TABLE "spaces" DROP CONSTRAINT IF EXISTS "CHK_spaces_scope"`);
    await queryRunner.query(`ALTER TABLE "spaces" DROP CONSTRAINT IF EXISTS "FK_spaces_scope_program_id"`);
    await queryRunner.query(`ALTER TABLE "spaces" DROP CONSTRAINT IF EXISTS "FK_spaces_school_id"`);

    // 3. Recréer les colonnes supprimées
    await queryRunner.query(`ALTER TABLE "spaces" ADD COLUMN "type" character varying(20) NOT NULL DEFAULT 'institutional'`);
    await queryRunner.query(`ALTER TABLE "spaces" ADD COLUMN "program_id" uuid`);
    await queryRunner.query(`ALTER TABLE "spaces" ADD COLUMN "owner_id" uuid`);

    // Restaurer program_id à partir de scope_program_id ou par défaut sur la première filière de l'école
    await queryRunner.query(`
      UPDATE "spaces"
      SET "program_id" = COALESCE("scope_program_id", (SELECT "id" FROM "programs" WHERE "school_id" = "spaces"."school_id" LIMIT 1))
    `);

    // 4. Supprimer les colonnes ajoutées
    await queryRunner.query(`ALTER TABLE "spaces" DROP COLUMN "scope_role_code"`);
    await queryRunner.query(`ALTER TABLE "spaces" DROP COLUMN "scope_program_id"`);
    await queryRunner.query(`ALTER TABLE "spaces" DROP COLUMN "scope"`);
    await queryRunner.query(`ALTER TABLE "spaces" DROP COLUMN "school_id"`);

    // 5. Rétablir les contraintes d'origine
    await queryRunner.query(`
      ALTER TABLE "spaces"
      ADD CONSTRAINT "FK_spaces_program_id"
      FOREIGN KEY ("program_id") REFERENCES "programs"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "spaces"
      ADD CONSTRAINT "FK_spaces_owner_id"
      FOREIGN KEY ("owner_id") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "spaces"
      ADD CONSTRAINT "UQ_spaces_program_id_name"
      UNIQUE ("program_id", "name")
    `);

    await queryRunner.query(`
      ALTER TABLE "spaces"
      ADD CONSTRAINT "CHK_spaces_type_program_owner"
      CHECK (
        ("type" = 'institutional' AND "program_id" IS NOT NULL AND "owner_id" IS NULL) OR
        ("type" = 'personal' AND "owner_id" IS NOT NULL AND "program_id" IS NULL)
      )
    `);
  }
}
