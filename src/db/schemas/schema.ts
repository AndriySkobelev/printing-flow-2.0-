import { integer, jsonb, pgTable, serial, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const ordersTable = pgTable("orders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	externalId: integer().notNull(),
	status: integer().notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	products: jsonb().notNull(),
	identifierName: text(),
	tags: jsonb(),
	attached: jsonb().notNull(),
	shipping: jsonb().notNull(),
	comment: text(),
});
