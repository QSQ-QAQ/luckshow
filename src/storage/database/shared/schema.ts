import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod";

// 配置表
export const galleryConfig = pgTable("gallery_config", {
  id: serial("id").primaryKey(),
  configJson: text("config_json").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

// 热度表
export const imageHeat = pgTable("image_heat", {
  id: serial("id").primaryKey(),
  imageId: text("image_id").notNull().unique(),
  heat: integer("heat").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

// Zod schemas
const { createInsertSchema } = createSchemaFactory({
  coerce: { date: true },
});

export const insertGalleryConfigSchema = createInsertSchema(galleryConfig);
export const insertImageHeatSchema = createInsertSchema(imageHeat);

// TypeScript types
export type GalleryConfig = typeof galleryConfig.$inferSelect;
export type InsertGalleryConfig = z.infer<typeof insertGalleryConfigSchema>;
export type ImageHeat = typeof imageHeat.$inferSelect;
export type InsertImageHeat = z.infer<typeof insertImageHeatSchema>;
