export interface Repository<T> {
  findAll(): Promise<T[]>
  findOne(id: string): Promise<T | undefined>
  create(item: T): Promise<T>
  update(id: string, item: Partial<T>): Promise<T | undefined>
  delete(id: string): Promise<{ id: string } | undefined>
}
