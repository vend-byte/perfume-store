import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

/* ---------- Live client comments wall ---------- */
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 60 }).notNull(),
  message: text("message").notNull(),
  rating: integer("rating").notNull().default(5),
  approved: boolean("approved").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------- Website settings (key/value, fully dynamic) ---------- */
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 80 }).notNull().unique(),
  value: text("value").notNull().default(""),
});

/* ---------- Taxonomies: categories, brands, families, collections ---------- */
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  image: text("image").notNull().default(""),
  description: text("description").notNull().default(""),
  enabled: boolean("enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  logo: text("logo").notNull().default(""),
  country: varchar("country", { length: 60 }).notNull().default(""),
  description: text("description").notNull().default(""),
  website: varchar("website", { length: 200 }).notNull().default(""),
  enabled: boolean("enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const fragranceFamilies = pgTable("fragrance_families", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 60 }).notNull(),
  enabled: boolean("enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const collections = pgTable("collections", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 60 }).notNull(),
  enabled: boolean("enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

/* Many-to-many junctions */
export const productFamilies = pgTable("product_fragrance_family", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  familyId: integer("family_id").notNull(),
});

export const productCollections = pgTable("product_collection", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  collectionId: integer("collection_id").notNull(),
});

/* ---------- Products with unlimited sizes ---------- */
export type ProductSize = {
  label: string;
  price: number;
  discountPrice?: number | null;
  stock: number;
  weight?: string;
};

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().default(""),
  name: varchar("name", { length: 140 }).notNull(),
  brand: varchar("brand", { length: 80 }).notNull().default(""),
  category: varchar("category", { length: 60 }).notNull().default("Oud"),
  gender: varchar("gender", { length: 20 }).notNull().default("Unisex"),
  fragranceFamily: varchar("fragrance_family", { length: 80 }).notNull().default(""),
  description: text("description").notNull().default(""),
  topNotes: varchar("top_notes", { length: 200 }).notNull().default(""),
  middleNotes: varchar("middle_notes", { length: 200 }).notNull().default(""),
  baseNotes: varchar("base_notes", { length: 200 }).notNull().default(""),
  image: text("image").notNull().default(""),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  video: text("video").notNull().default(""),
  status: varchar("status", { length: 30 }).notNull().default("In Stock"),
  views: integer("views").notNull().default(0),
  sizes: jsonb("sizes").$type<ProductSize[]>().notNull().default([]),
  categoryId: integer("category_id"),
  brandId: integer("brand_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------- Orders ---------- */
export type OrderItem = {
  productId: number;
  name: string;
  size: string;
  quantity: number;
  price: number;
};

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 30 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 30 }).notNull(),
  email: varchar("email", { length: 120 }).notNull().default(""),
  address: text("address").notNull().default(""),
  city: varchar("city", { length: 60 }).notNull().default("Nairobi"),
  payment: varchar("payment", { length: 30 }).notNull().default("M-Pesa"),
  items: jsonb("items").$type<OrderItem[]>().notNull().default([]),
  total: integer("total").notNull().default(0),
  status: varchar("status", { length: 30 }).notNull().default("Pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------- Verified-purchase product reviews ---------- */
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  orderCode: varchar("order_code", { length: 30 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  rating: integer("rating").notNull().default(5),
  message: text("message").notNull(),
  approved: boolean("approved").notNull().default(false),
  pinned: boolean("pinned").notNull().default(false),
  adminReply: text("admin_reply").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Comment = typeof comments.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Setting = typeof settings.$inferSelect;
