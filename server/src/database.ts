export type Database = {
  prepare(sql: string): {
    bind(...values: (string | number)[]): {
      first<T>(): Promise<T | null>
      run(): Promise<{ meta: { changes: number } }>
    }
  }
}
