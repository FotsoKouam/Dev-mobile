import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDocuments1793400000000 implements MigrationInterface {
  name = 'CreateDocuments1793400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Table documents
    await queryRunner.query(`
      CREATE TABLE "documents" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "space_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "file_type" character varying(20) NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'pending',
        "current_version_id" uuid,
        "uploaded_by_id" uuid NOT NULL,
        CONSTRAINT "PK_documents_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_documents_status" CHECK ("status" IN ('pending','ocr','segmentation','indexing','available','error')),
        CONSTRAINT "CHK_documents_file_type" CHECK ("file_type" IN ('pdf','scanned_pdf','image')),
        CONSTRAINT "FK_documents_space_id" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_documents_uploaded_by_id" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);

    // 2. Table document_versions
    await queryRunner.query(`
      CREATE TABLE "document_versions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "document_id" uuid NOT NULL,
        "version_number" integer NOT NULL,
        "storage_key" character varying(255) NOT NULL,
        "original_filename" character varying(255) NOT NULL,
        "mime_type" character varying(100) NOT NULL,
        "size_bytes" bigint NOT NULL,
        "checksum_sha256" character varying(64) NOT NULL,
        "uploaded_by_id" uuid NOT NULL,
        CONSTRAINT "PK_document_versions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_document_versions_doc_version" UNIQUE ("document_id", "version_number"),
        CONSTRAINT "CHK_document_versions_size_bytes" CHECK ("size_bytes" > 0),
        CONSTRAINT "FK_document_versions_document_id" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_document_versions_uploaded_by_id" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);

    // 3. Clé étrangère circulaire documents.current_version_id -> document_versions.id
    await queryRunner.query(`
      ALTER TABLE "documents"
      ADD CONSTRAINT "FK_documents_current_version_id"
      FOREIGN KEY ("current_version_id") REFERENCES "document_versions"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "FK_documents_current_version_id"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "document_versions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "documents"`);
  }
}
