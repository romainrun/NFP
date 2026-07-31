export type EmployeeNote = {
  id: string;
  authorId: string;
  authorName: string;
  recipientId: string | null;
  recipientName: string | null;
  body: string;
  createdAt: string;
};

export type CreateEmployeeNoteInput = {
  authorId: string;
  recipientId: string | null;
  body: string;
};
