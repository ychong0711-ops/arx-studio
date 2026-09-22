import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** AUTOSAR 프로젝트 (AR-PACKAGE 루트 단위) */
export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  arPackageRoot: text("ar_package_root").notNull(),
  autosarVersion: text("autosar_version").notNull().default("R23-11"),
  schema: text("schema").notNull().default("classic"), // classic | adaptive
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** SW-COMPONENT-TYPE (Atom ic / Sensor-Actuator / Composition ...) */
export const softwareComponents = pgTable(
  "software_components",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    category: text("category").notNull().default("application"),
    description: text("description").notNull().default(""),
    x: integer("x").notNull().default(80),
    y: integer("y").notNull().default(80),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("swc_name_uq").on(t.projectId, t.name)],
);

/** PORT-INTERFACE (SENDER-RECEIVER / CLIENT-SERVER) */
export const interfaces = pgTable(
  "interfaces",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    kind: text("kind").notNull().default("sender-receiver"), // sender-receiver | client-server
    // SR: { name, typeRef }[] / CS: { name, args: { name, direction, typeRef }[] }[]
    elements: jsonb("elements")
      .$type<unknown[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("iface_name_uq").on(t.projectId, t.name)],
);

/** APPLICATION-PRIMITIVE / RECORD / ARRAY DATA-TYPE */
export const dataTypes = pgTable(
  "data_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    category: text("category").notNull().default("VALUE"), // VALUE | ARRAY | STRUCTURE | BOOLEAN
    baseType: text("base_type").notNull().default("uint16"),
    lowerLimit: text("lower_limit").notNull().default("0"),
    upperLimit: text("upper_limit").notNull().default("65535"),
    unit: text("unit").notNull().default(""),
    elementType: text("element_type").notNull().default(""), // ARRAY의 요소 응용 타입 이름
    maxSize: integer("max_size").notNull().default(0), // ARRAY의 최대 요소 수
    elements: jsonb("elements")
      .$type<{ name: string; typeRef: string }[]>()
      .notNull()
      .default(sql`'[]'::jsonb`), // STRUCTURE 멤버 [{name,typeRef}]
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("dt_name_uq").on(t.projectId, t.name)],
);

/** PORT-PROTOTYPE (P-PORT / R-PORT) */
export const ports = pgTable("ports", {
  id: uuid("id").defaultRandom().primaryKey(),
  componentId: uuid("component_id")
    .references(() => softwareComponents.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  direction: text("direction").notNull().default("required"), // provided | required
  interfaceId: uuid("interface_id").references(() => interfaces.id, {
    onDelete: "set null",
  }),
  queued: boolean("queued").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** RUNNABLE-ENTITY + RTE-EVENT */
export const runnables = pgTable("runnables", {
  id: uuid("id").defaultRandom().primaryKey(),
  componentId: uuid("component_id")
    .references(() => softwareComponents.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  eventType: text("event_type").notNull().default("timing"), // timing | init | operation-invoked
  periodMs: integer("period_ms").notNull().default(10),
  operationPort: text("operation_port").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** ASSEMBLY-SW-CONNECTOR */
export const connections = pgTable("connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  sourcePortId: uuid("source_port_id")
    .references(() => ports.id, { onDelete: "cascade" })
    .notNull(),
  targetPortId: uuid("target_port_id")
    .references(() => ports.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type ProjectRow = typeof projects.$inferSelect;
export type SwcRow = typeof softwareComponents.$inferSelect;
export type InterfaceRow = typeof interfaces.$inferSelect;
export type DataTypeRow = typeof dataTypes.$inferSelect;
export type PortRow = typeof ports.$inferSelect;
export type RunnableRow = typeof runnables.$inferSelect;
export type ConnectionRow = typeof connections.$inferSelect;
