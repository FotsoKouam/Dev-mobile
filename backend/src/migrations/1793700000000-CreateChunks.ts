import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChunks1793700000000 implements MigrationInterface {
  name = 'CreateChunks1793700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "chunks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "document_version_id" uuid NOT NULL,
        "page_number" integer NOT NULL,
        "chunk_index" integer NOT NULL,
        "content" text NOT NULL,
        "source" character varying(10) NOT NULL,
        CONSTRAINT "PK_chunks_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_chunks_source" CHECK ("source" IN ('native', 'ocr')),
        CONSTRAINT "CHK_chunks_page_number" CHECK ("page_number" >= 1),
        CONSTRAINT "CHK_chunks_chunk_index" CHECK ("chunk_index" >= 0),
        CONSTRAINT "UQ_chunks_version_index" UNIQUE ("document_version_id", "chunk_index"),
        CONSTRAINT "FK_chunks_document_version_id" FOREIGN KEY ("document_version_id") REFERENCES "document_versions"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "chunks"`);
  }
}
