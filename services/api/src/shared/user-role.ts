// Shared UserRole enum used across the API when Prisma's UserRole type is unavailable
export enum UserRole {
  PARENT = 'PARENT',
  CHILD = 'CHILD',
  ADMIN = 'ADMIN',
}
