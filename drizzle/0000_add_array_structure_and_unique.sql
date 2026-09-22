CREATE TABLE "connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"source_port_id" uuid NOT NULL,
	"target_port_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'VALUE' NOT NULL,
	"base_type" text DEFAULT 'uint16' NOT NULL,
	"lower_limit" text DEFAULT '0' NOT NULL,
	"upper_limit" text DEFAULT '65535' NOT NULL,
	"unit" text DEFAULT '' NOT NULL,
	"element_type" text DEFAULT '' NOT NULL,
	"max_size" integer DEFAULT 0 NOT NULL,
	"elements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interfaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'sender-receiver' NOT NULL,
	"elements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"component_id" uuid NOT NULL,
	"name" text NOT NULL,
	"direction" text DEFAULT 'required' NOT NULL,
	"interface_id" uuid,
	"queued" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"ar_package_root" text NOT NULL,
	"autosar_version" text DEFAULT 'R23-11' NOT NULL,
	"schema" text DEFAULT 'classic' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runnables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"component_id" uuid NOT NULL,
	"name" text NOT NULL,
	"event_type" text DEFAULT 'timing' NOT NULL,
	"period_ms" integer DEFAULT 10 NOT NULL,
	"operation_port" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "software_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'application' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"x" integer DEFAULT 80 NOT NULL,
	"y" integer DEFAULT 80 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_source_port_id_ports_id_fk" FOREIGN KEY ("source_port_id") REFERENCES "public"."ports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_target_port_id_ports_id_fk" FOREIGN KEY ("target_port_id") REFERENCES "public"."ports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_types" ADD CONSTRAINT "data_types_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interfaces" ADD CONSTRAINT "interfaces_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ports" ADD CONSTRAINT "ports_component_id_software_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."software_components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ports" ADD CONSTRAINT "ports_interface_id_interfaces_id_fk" FOREIGN KEY ("interface_id") REFERENCES "public"."interfaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runnables" ADD CONSTRAINT "runnables_component_id_software_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."software_components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "software_components" ADD CONSTRAINT "software_components_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dt_name_uq" ON "data_types" USING btree ("project_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "iface_name_uq" ON "interfaces" USING btree ("project_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "swc_name_uq" ON "software_components" USING btree ("project_id","name");