import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { AppError } from '@/core/errors/AppError';
import { err, ok, type Result } from '@/core/types/Result';
import type { INoteRepository } from '@/features/notes/data/NoteRepository';
import type { CreateEmployeeNoteInput, EmployeeNote } from '@/features/notes/domain/types';

type NoteRow = {
  id: string;
  author_id: string;
  author_name: string;
  recipient_id: string | null;
  recipient_name: string | null;
  body: string;
  created_at: string;
};

function mapRow(row: NoteRow): EmployeeNote {
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author_name,
    recipientId: row.recipient_id,
    recipientName: row.recipient_name,
    body: row.body,
    createdAt: row.created_at,
  };
}

export class SqliteNoteRepository implements INoteRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async listForUser(userId: string, limit = 40): Promise<Result<EmployeeNote[]>> {
    try {
      const rows = await this.db.getAllAsync<NoteRow>(
        `
        SELECT
          n.id,
          n.author_id,
          a.display_name AS author_name,
          n.recipient_id,
          r.display_name AS recipient_name,
          n.body,
          n.created_at
        FROM employee_notes n
        INNER JOIN users a ON a.id = n.author_id
        LEFT JOIN users r ON r.id = n.recipient_id
        WHERE n.recipient_id IS NULL
           OR n.recipient_id = ?
           OR n.author_id = ?
        ORDER BY n.created_at DESC
        LIMIT ?
        `,
        userId,
        userId,
        limit,
      );
      return ok(rows.map(mapRow));
    } catch (cause) {
      return err(AppError.database('Impossible de lire les notes', cause));
    }
  }

  async create(input: CreateEmployeeNoteInput): Promise<Result<EmployeeNote>> {
    const body = input.body.trim();
    if (!body) return err(AppError.validation('La note est vide'));
    if (body.length > 2000) return err(AppError.validation('Note trop longue (max 2000 caractères)'));

    const id = Crypto.randomUUID();
    const createdAt = new Date().toISOString();

    try {
      const author = await this.db.getFirstAsync<{ display_name: string }>(
        `SELECT display_name FROM users WHERE id = ? AND is_active = 1`,
        input.authorId,
      );
      if (!author) return err(AppError.notFound('Auteur introuvable'));

      let recipientName: string | null = null;
      if (input.recipientId) {
        const recipient = await this.db.getFirstAsync<{ display_name: string }>(
          `SELECT display_name FROM users WHERE id = ? AND is_active = 1`,
          input.recipientId,
        );
        if (!recipient) return err(AppError.notFound('Destinataire introuvable'));
        recipientName = recipient.display_name;
      }

      await this.db.runAsync(
        `INSERT INTO employee_notes (id, author_id, recipient_id, body, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        id,
        input.authorId,
        input.recipientId,
        body,
        createdAt,
      );

      return ok({
        id,
        authorId: input.authorId,
        authorName: author.display_name,
        recipientId: input.recipientId,
        recipientName,
        body,
        createdAt,
      });
    } catch (cause) {
      return err(AppError.database('Impossible d’enregistrer la note', cause));
    }
  }

  async deleteOwn(noteId: string, authorId: string): Promise<Result<void>> {
    try {
      const row = await this.db.getFirstAsync<{ author_id: string }>(
        `SELECT author_id FROM employee_notes WHERE id = ?`,
        noteId,
      );
      if (!row) return err(AppError.notFound('Note introuvable'));
      if (row.author_id !== authorId) {
        return err(AppError.forbidden('Seul l’auteur peut supprimer cette note'));
      }
      await this.db.runAsync(`DELETE FROM employee_notes WHERE id = ?`, noteId);
      return ok(undefined);
    } catch (cause) {
      return err(AppError.database('Impossible de supprimer la note', cause));
    }
  }
}
