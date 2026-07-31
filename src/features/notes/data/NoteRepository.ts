import type { Result } from '@/core/types/Result';
import type { CreateEmployeeNoteInput, EmployeeNote } from '@/features/notes/domain/types';

export interface INoteRepository {
  listForUser(userId: string, limit?: number): Promise<Result<EmployeeNote[]>>;
  create(input: CreateEmployeeNoteInput): Promise<Result<EmployeeNote>>;
  deleteOwn(noteId: string, authorId: string): Promise<Result<void>>;
}
