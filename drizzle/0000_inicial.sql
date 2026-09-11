CREATE TABLE "alumnos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"creado_por" uuid NOT NULL,
	"dia" text,
	"horario" text,
	"legacy_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alumnos_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE "evaluacion_fotos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alumno_id" uuid NOT NULL,
	"orden" integer NOT NULL,
	"data_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluaciones" (
	"alumno_id" uuid PRIMARY KEY NOT NULL,
	"datos" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "rutina_accesos" (
	"rutina_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"otorgado_por" uuid NOT NULL,
	"google_drive_file_id" varchar(200),
	"google_drive_link" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rutina_accesos_rutina_id_usuario_id_pk" PRIMARY KEY("rutina_id","usuario_id")
);
--> statement-breakpoint
CREATE TABLE "rutinas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alumno_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"nombre" varchar(200) NOT NULL,
	"datos" jsonb NOT NULL,
	"google_drive_file_id" varchar(200),
	"google_drive_link" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rutinas_alumno_id_unique" UNIQUE("alumno_id")
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"nombre" text NOT NULL,
	"password_hash" text NOT NULL,
	"es_admin" boolean DEFAULT false NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"debe_cambiar_password" boolean DEFAULT false NOT NULL,
	"google_email" text,
	"google_refresh_token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "alumnos" ADD CONSTRAINT "alumnos_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluacion_fotos" ADD CONSTRAINT "evaluacion_fotos_alumno_id_alumnos_id_fk" FOREIGN KEY ("alumno_id") REFERENCES "public"."alumnos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluaciones" ADD CONSTRAINT "evaluaciones_alumno_id_alumnos_id_fk" FOREIGN KEY ("alumno_id") REFERENCES "public"."alumnos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluaciones" ADD CONSTRAINT "evaluaciones_updated_by_usuarios_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rutina_accesos" ADD CONSTRAINT "rutina_accesos_rutina_id_rutinas_id_fk" FOREIGN KEY ("rutina_id") REFERENCES "public"."rutinas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rutina_accesos" ADD CONSTRAINT "rutina_accesos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rutina_accesos" ADD CONSTRAINT "rutina_accesos_otorgado_por_usuarios_id_fk" FOREIGN KEY ("otorgado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rutinas" ADD CONSTRAINT "rutinas_alumno_id_alumnos_id_fk" FOREIGN KEY ("alumno_id") REFERENCES "public"."alumnos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rutinas" ADD CONSTRAINT "rutinas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alumnos_creado_por_idx" ON "alumnos" USING btree ("creado_por");--> statement-breakpoint
CREATE INDEX "evaluacion_fotos_alumno_idx" ON "evaluacion_fotos" USING btree ("alumno_id");--> statement-breakpoint
CREATE INDEX "rutina_accesos_usuario_idx" ON "rutina_accesos" USING btree ("usuario_id");