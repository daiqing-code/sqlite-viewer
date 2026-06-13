const BASE = ''

async function get<T>(url: string): Promise<T> {
  const r = await fetch(`${BASE}${url}`)
  const b = await r.json()
  if (!b.ok) throw new Error(b.error || '请求失败')
  return b
}
async function post<T>(url: string, d: unknown): Promise<T> {
  const r = await fetch(`${BASE}${url}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(d) })
  const b = await r.json()
  if (!b.ok) throw new Error(b.error || '请求失败')
  return b
}

export const api = {
  stats:     () => get<{ok:boolean;stats:import('@/types').Stats}>('/api/stats'),
  files:     () => get<{ok:boolean;files:import('@/types').FileInfo[];total:number}>('/api/files'),
  memoryFiles:()=>get<{ok:boolean;files:import('@/types').WorkspaceFileInfo[];total:number}>('/api/memory-files'),
  chunks:    (path:string,search?:string) => {
    const p=new URLSearchParams({path,limit:'1000'}); if(search) p.set('search',search)
    return get<{ok:boolean;chunks:import('@/types').ChunkInfo[];total:number}>(`/api/chunks?${p}`)
  },
  raw:       (path:string) => get<{ok:boolean;content:string;lineCount:number}>(`/api/raw?path=${encodeURIComponent(path)}`),
  wsFiles:   () => get<{ok:boolean;files:import('@/types').WorkspaceFileInfo[];total:number}>('/api/workspace-files'),
  wsRead:    (path:string) => get<{ok:boolean;content:string;path:string}>(`/api/workspace-read?path=${encodeURIComponent(path)}`),
  wsSave:    (path:string,content:string) => post<{ok:boolean;message:string}>('/api/workspace-save',{path,content}),
  memRead:   (path:string) => get<{ok:boolean;content:string;path:string}>(`/api/memory-read?path=${encodeURIComponent(path)}`),
  memSave:   (path:string,content:string) => post<{ok:boolean;message:string}>('/api/memory-save',{path,content}),
  skills:    () => get<{ok:boolean;skills:import('@/types').SkillInfo[];total:number}>('/api/skills'),
  skillRead: (name:string) => get<{ok:boolean;content:string;name:string}>(`/api/skill-read?name=${encodeURIComponent(name)}`),
  skillDelete:(name:string) => post<{ok:boolean;message:string}>('/api/skill-delete',{name}),
  skillFiles:(name:string) => get<{ok:boolean;files:{name:string;path:string;size:number;mtime:number;isDir:boolean}[];total:number}>(`/api/skill-files?name=${encodeURIComponent(name)}`),
  skillFileRead:(path:string)=>get<{ok:boolean;content:string}>(`/api/skill-file-read?path=${encodeURIComponent(path)}`),
  skillFileSave:(path:string,content:string)=>post<{ok:boolean;message:string}>('/api/skill-file-save',{path,content}),
}
