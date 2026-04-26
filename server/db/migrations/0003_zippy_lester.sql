ALTER TABLE "document_requests" ALTER COLUMN "target_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "document_requests" ADD COLUMN "appointment_id" uuid;--> statement-breakpoint
ALTER TABLE "document_requests" ADD COLUMN "appointment_pet_id" uuid;--> statement-breakpoint
ALTER TABLE "document_requests" ADD COLUMN "token_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "document_requests" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "document_requests" ADD COLUMN "used_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_appointment_pet_id_appointment_pets_id_fk" FOREIGN KEY ("appointment_pet_id") REFERENCES "public"."appointment_pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "document_requests_token_hash_uniq" ON "document_requests" USING btree ("token_hash");