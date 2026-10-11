import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const archive = sqliteTable('archive', { id: text('id').primaryKey(), payload: text('payload').notNull(), revision: integer('revision').notNull().default(0) });
export const editorSessions = sqliteTable('editor_sessions', { tokenHash:text('token_hash').primaryKey(), expiresAt:integer('expires_at').notNull(), credentialTag:text('credential_tag').notNull() });
export const editorLoginAttempts = sqliteTable('editor_login_attempts', { key:text('key').primaryKey(), attempts:integer('attempts').notNull(), resetsAt:integer('resets_at').notNull() });
