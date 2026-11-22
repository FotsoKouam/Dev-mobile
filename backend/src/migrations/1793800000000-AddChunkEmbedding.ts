import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChunkEmbedding1793800000000 implements MigrationInterface {
  name = 'AddChunkEmbedding1793800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
    await queryRunner.query(
      `ALTER TABLE "chunks" ADD COLUMN "embedding" vector(768) NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_chunks_embedding_hnsw" ON "chunks" USING hnsw ("embedding" vector_cosine_ops);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chunks_embedding_hnsw";`);
    await queryRunner.query(
      `ALTER TABLE "chunks" DROP COLUMN IF EXISTS "embedding";`,
    );
  }
}
