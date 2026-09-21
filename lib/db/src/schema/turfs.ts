import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const approvalStatusEnum = pgEnum("approval_status", [
  "pending",
  "approved",
  "rejected",
]);
export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "refunded",
]);
export const blockReasonEnum = pgEnum("block_reason", [
  "maintenance",
  "owner_use",
]);

export const turfsTable = pgTable("turfs", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  city: text("city").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  gallery: text("gallery").array().notNull().default([]),
  games: text("games").array().notNull().default([]),
  amenities: text("amenities").array().notNull().default([]),
  rating: numeric("rating", { precision: 3, scale: 2 }).notNull().default("0"),
  reviewCount: integer("review_count").notNull().default(0),
  startingPrice: numeric("starting_price", { precision: 10, scale: 2 }).notNull(),
  ownerName: text("owner_name").notNull(),
  approvalStatus: approvalStatusEnum("approval_status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const turfBlocksTable = pgTable("turf_blocks", {
  id: uuid("id").defaultRandom().primaryKey(),
  turfId: uuid("turf_id").notNull().references(() => turfsTable.id, { onDelete: "cascade" }),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  reason: blockReasonEnum("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bookingsTable = pgTable("bookings", {
  id: uuid("id").defaultRandom().primaryKey(),
  turfId: uuid("turf_id").notNull().references(() => turfsTable.id),
  turfName: text("turf_name").notNull(),
  game: text("game").notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  players: integer("players").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  commission: numeric("commission", { precision: 10, scale: 2 }).notNull(),
  status: bookingStatusEnum("status").notNull().default("confirmed"),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("paid"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reviewsTable = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  turfId: uuid("turf_id").notNull().references(() => turfsTable.id, { onDelete: "cascade" }),
  bookingId: uuid("booking_id").notNull().references(() => bookingsTable.id),
  authorName: text("author_name").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  ownerReply: text("owner_reply"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTurfSchema = createInsertSchema(turfsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertTurfBlockSchema = createInsertSchema(turfBlocksTable).omit({
  id: true,
  createdAt: true,
});
export const insertBookingSchema = createInsertSchema(bookingsTable).omit({
  id: true,
  createdAt: true,
});
export const insertReviewSchema = createInsertSchema(reviewsTable).omit({
  id: true,
  createdAt: true,
});

export type Turf = typeof turfsTable.$inferSelect;
export type TurfBlock = typeof turfBlocksTable.$inferSelect;
export type Booking = typeof bookingsTable.$inferSelect;
export type Review = typeof reviewsTable.$inferSelect;
export type InsertTurf = z.infer<typeof insertTurfSchema>;
export type InsertTurfBlock = z.infer<typeof insertTurfBlockSchema>;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type InsertReview = z.infer<typeof insertReviewSchema>;