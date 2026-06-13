export interface FileInfo {
  path: string
  source: string
  hash: string
  mtime: number
  size: number
  chunks: number
}

export interface ChunkInfo {
  id: string
  path: string
  source: string
  start_line: number
  end_line: number
  model: string
  text: string
}

export interface Stats {
  files: number; chunks: number; fts_entries: number
  embedding_cache: number; models: number; name: string
  dbPath: string; dbSize: string; workspaceDir: string
}

export interface WorkspaceFileInfo {
  path: string; fullPath: string
  size: number; mtime: number; isDir: boolean
}

export interface SkillInfo {
  name: string; location: string
  description: string; version: string
  skillDir: string
}
