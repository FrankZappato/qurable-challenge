import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1770265209754 implements MigrationInterface {
    name = 'InitialSchema1770265209754'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "coupon_assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code_id" uuid NOT NULL, "user_id" uuid NOT NULL, "book_id" uuid NOT NULL, "assigned_at" TIMESTAMP NOT NULL DEFAULT now(), "locked_at" TIMESTAMP, "locked_until" TIMESTAMP, "redeemed_at" TIMESTAMP, "redeem_count" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_3a6770fd1017894867bb5b37409" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7aa46204c0837a9be86b9220dd" ON "coupon_assignments" ("locked_until") `);
        await queryRunner.query(`CREATE INDEX "IDX_28ff6cd34f3f756b2fc0227fb0" ON "coupon_assignments" ("code_id", "user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_ac1dcfd1ff4bf650739887a7a5" ON "coupon_assignments" ("user_id", "book_id") `);
        await queryRunner.query(`CREATE TYPE "public"."coupon_codes_status_enum" AS ENUM('AVAILABLE', 'ASSIGNED', 'LOCKED', 'REDEEMED', 'EXPIRED')`);
        await queryRunner.query(`CREATE TABLE "coupon_codes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "book_id" uuid NOT NULL, "code" character varying(50) NOT NULL, "status" "public"."coupon_codes_status_enum" NOT NULL DEFAULT 'AVAILABLE', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8b05c8017abc4f01fff1254671a" UNIQUE ("code"), CONSTRAINT "PK_5ac86428f1fa43972e1ea4a23e0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1f29e48add7bbdea9d5465dba3" ON "coupon_codes" ("status") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8b05c8017abc4f01fff1254671" ON "coupon_codes" ("code") `);
        await queryRunner.query(`CREATE INDEX "IDX_c8190df4a61b2df2f9a20db30f" ON "coupon_codes" ("book_id", "status") `);
        await queryRunner.query(`CREATE TYPE "public"."coupon_books_status_enum" AS ENUM('DRAFT', 'ACTIVE', 'CLOSED')`);
        await queryRunner.query(`CREATE TABLE "coupon_books" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "business_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "description" text, "max_redeems_per_user" integer, "max_codes_per_user" integer, "status" "public"."coupon_books_status_enum" NOT NULL DEFAULT 'DRAFT', "total_codes_expected" integer, "generated_count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "expires_at" TIMESTAMP, CONSTRAINT "PK_a56956ef618857f260cb9c3b5c3" PRIMARY KEY ("id")); COMMENT ON COLUMN "coupon_books"."max_redeems_per_user" IS 'null = unlimited, 1 = single use, N = reusable N times'; COMMENT ON COLUMN "coupon_books"."max_codes_per_user" IS 'null = unlimited, N = max codes per user'`);
        await queryRunner.query(`CREATE TYPE "public"."redemption_audit_action_enum" AS ENUM('ASSIGN', 'LOCK', 'UNLOCK', 'REDEEM', 'EXPIRE')`);
        await queryRunner.query(`CREATE TABLE "redemption_audit" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code_id" uuid NOT NULL, "user_id" uuid NOT NULL, "action" "public"."redemption_audit_action_enum" NOT NULL, "status_before" character varying(50), "status_after" character varying(50) NOT NULL, "ip_address" character varying(45), "user_agent" text, "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_eab39a3d77da4102e936f7c9424" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a483ad5433cd0d8a5fe188bb20" ON "redemption_audit" ("user_id", "created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_9bd52b5c4c00a3609a185dbfb9" ON "redemption_audit" ("code_id", "created_at") `);
        await queryRunner.query(`ALTER TABLE "coupon_assignments" ADD CONSTRAINT "FK_433cd66f460435f44620e20e301" FOREIGN KEY ("code_id") REFERENCES "coupon_codes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "coupon_codes" ADD CONSTRAINT "FK_89c8467b2ce6860a3691aa4ec48" FOREIGN KEY ("book_id") REFERENCES "coupon_books"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "coupon_codes" DROP CONSTRAINT "FK_89c8467b2ce6860a3691aa4ec48"`);
        await queryRunner.query(`ALTER TABLE "coupon_assignments" DROP CONSTRAINT "FK_433cd66f460435f44620e20e301"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9bd52b5c4c00a3609a185dbfb9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a483ad5433cd0d8a5fe188bb20"`);
        await queryRunner.query(`DROP TABLE "redemption_audit"`);
        await queryRunner.query(`DROP TYPE "public"."redemption_audit_action_enum"`);
        await queryRunner.query(`DROP TABLE "coupon_books"`);
        await queryRunner.query(`DROP TYPE "public"."coupon_books_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c8190df4a61b2df2f9a20db30f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8b05c8017abc4f01fff1254671"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1f29e48add7bbdea9d5465dba3"`);
        await queryRunner.query(`DROP TABLE "coupon_codes"`);
        await queryRunner.query(`DROP TYPE "public"."coupon_codes_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ac1dcfd1ff4bf650739887a7a5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_28ff6cd34f3f756b2fc0227fb0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7aa46204c0837a9be86b9220dd"`);
        await queryRunner.query(`DROP TABLE "coupon_assignments"`);
    }

}
