import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '@/utils/api'
import type { FileInfo, ChunkInfo, Stats, WorkspaceFileInfo, SkillInfo } from '@/types'

const PROTECTED = ['IDENTITY.md','MEMORY.md','SOUL.md','TOOLS.md','USER.md','AGENTS.md','HEARTBEAT.md']
const THEMES = ['indigo','emerald','amber','rose','violet'] as const
type Theme = (typeof THEMES)[number]; type ColorMode = 'dark'|'light'

function useTheme() {
  const [t,sT]=useState<Theme>(()=>(typeof window!=='undefined'?localStorage.getItem('sqlite…heme')as Theme:null)||'indigo')
  const [m,sM]=useState<ColorMode>(()=>(typeof window!=='undefined'?localStorage.getItem('sqlite…mode')as ColorMode:null)||'dark')
  useEffect(()=>{document.documentElement.setAttribute('data-theme',t);localStorage.setItem('sqlite…heme',t)},[t])
  useEffect(()=>{document.documentElement.setAttribute('data-mode',m);localStorage.setItem('sqlite…mode',m)},[m])
  return{theme:t,themes:THEMES,setTheme:sT,mode:m,toggleMode:()=>sM(p=>p==='dark'?'light':'dark')}
}

type TabId = 'workspace'|'skills'|'database'|'memories'
const TABS: {id:TabId;icon:string;label:string}[] = [
  {id:'workspace',icon:'📁',label:'工作区'},
  {id:'skills',icon:'🧩',label:'技能'},
  {id:'database',icon:'🗄️',label:'数据库'},
  {id:'memories',icon:'📝',label:'记忆'},
]

function ConfirmDialog({show,title,msg,onConfirm,onCancel}:{show:boolean;title:string;msg:string;onConfirm:()=>void;onCancel:()=>void}){
  if(!show)return null
  return <div className="modal-overlay" onClick={onCancel}>
    <div className="modal-box" onClick={e=>e.stopPropagation()}>
      <div className="modal-title">{title}</div><div className="modal-msg">{msg}</div>
      <div className="modal-actions">
        <button className="btn" onClick={onCancel}>取消</button>
        <button className="btn btn-danger" onClick={onConfirm}>确认删除</button>
      </div>
    </div>
  </div>
}

export default function App() {
  const th = useTheme()
  const [activeTab,setActiveTab] = useState<TabId>('workspace')
  const loaded = useRef(false)
  const [stats,setStats]=useState<Stats|null>(null)

  // 数据
  const [dbFiles,setDbFiles]=useState<FileInfo[]>([])
  const [wsFiles,setWsFiles]=useState<WorkspaceFileInfo[]>([])
  const [skills,setSkills]=useState<SkillInfo[]>([])
  const [skillOpen,setSkillOpen]=useState<string|null>(null)
  const [memFilesDir,setMemFilesDir]=useState<WorkspaceFileInfo[]>([])
  const [memFilePath,setMemFilePath]=useState<string|null>(null)
  const [memFileContent,setMemFileContent]=useState('')
  const [memFileOrig,setMemFileOrig]=useState('')
  const [memEditing,setMemEditing]=useState(false)
  const [skillFiles,setSkillFiles]=useState<{name:string;path:string;size:number;isDir:boolean}[]>([])

  // 编辑状态
  const [memGroupOpen,setMemGroupOpen]=useState<string|null>(null)
  const [memPath,setMemPath]=useState<string|null>(null)
  const [memChunks,setMemChunks]=useState<ChunkInfo[]>([])
  const [memTab,setMemTab]=useState<'chunks'|'raw'|'info'>('chunks')
  const [memSearch,setMemSearch]=useState('')
  const [dbTab,setDbTab]=useState<'chunks'|'raw'|'info'>('chunks')
  const [dbSearch,setDbSearch]=useState('')
  const [wsPath,setWsPath]=useState<string|null>(null)
  const [wsContent,setWsContent]=useState('')
  const [wsOrig,setWsOrig]=useState('')
  const [editSkillPath,setEditSkillPath]=useState<string|null>(null)
  const [editSkillContent,setEditSkillContent]=useState('')
  const [editSkillOrig,setEditSkillOrig]=useState('')
  const [skillSelected,setSkillSelected]=useState<string|null>(null)
  const [skillDesc,setSkillDesc]=useState('')

  // 数据库分组状态
  const [dbGroupOpen,setDbGroupOpen]=useState<string|null>(null)
  const [confirmDel,setConfirmDel]=useState<{type:'skill';name:string}|null>(null)

  useEffect(()=>{
    if(loaded.current)return;loaded.current=true
    Promise.all([api.stats(),api.files(),api.wsFiles(),api.skills(),api.memoryFiles()]).then(([s,f,w,sk,mf])=>{
      setStats(s.stats)
      // 数据库：只显示 memory/ 路径下的文件（不含根目录 MEMORY.md）
      setDbFiles(f.files.filter(f=>f.path.includes('/')))
      setWsFiles(w.files);setSkills(sk.skills);setMemFilesDir(mf.files)
    })
  },[])

  // 记忆 — 选择文件 -> 读取内容到编辑器
  const selectMemFile=useCallback(async(p:string)=>{
    setMemFilePath(p);setWsPath(null);setMemPath(null);setEditSkillPath(null);setMemFileContent('');setMemFileOrig('')
    try{const r=await api.memRead(p);setMemFileContent(r.content);setMemFileOrig(r.content)}catch{}
  },[])
  const saveMemFile=useCallback(async()=>{
    if(!memFilePath)return
    try{await api.memSave(memFilePath,memFileContent);setMemFileOrig(memFileContent);alert('已保存 ✓')}catch(e:any){alert('保存失败: '+e.message)}
  },[memFilePath,memFileContent])

  const selectDb=useCallback(async(p:string)=>{
    setMemPath(p);setWsPath(null);setEditSkillPath(null);setMemFilePath(null);setDbTab('chunks')
    try{const r=await api.chunks(p);setMemChunks(r.chunks)}catch{setMemChunks([])}
  },[])
  const searchDb=useCallback((q:string)=>{
    setDbSearch(q);clearTimeout((searchDb as any).__t)
    ;(searchDb as any).__t=setTimeout(async()=>{if(memPath)try{const r=await api.chunks(memPath,q||undefined);setMemChunks(r.chunks)}catch{}},300)
  },[memPath])

  // 工作区
  const selectWs=useCallback(async(name:string)=>{
    setWsPath(name);setMemPath(null);setEditSkillPath(null)
    try{const r=await api.wsRead(name);setWsContent(r.content);setWsOrig(r.content)}catch{}
  },[])
  const saveWs=useCallback(async()=>{
    if(!wsPath)return
    try{await api.wsSave(wsPath,wsContent);setWsOrig(wsContent);alert('已保存 ✓')}catch(e:any){alert('保存失败: '+e.message)}
  },[wsPath,wsContent])

  // 技能
  const toggleSkill=useCallback(async(name:string)=>{
    if(skillOpen===name){
      setSkillOpen(null);setSkillFiles([]);setSkillSelected(null);setSkillDesc('');setEditSkillPath(null);setEditSkillContent('');setEditSkillOrig('')
      return
    }
    setSkillOpen(name);setMemPath(null);setWsPath(null);setEditSkillPath(null)
    setSkillSelected(name);setMemFilePath(null)
    try{const r=await api.skillFiles(name);setSkillFiles(r.files.filter(f=>!f.isDir))}catch{}
    // 加载描述和 SKILL.md
    const skill = skills.find(s => s.name === name)
    setSkillDesc(skill?.description || '无描述')
    try{
      const r = await api.skillRead(name)
      setEditSkillPath('SKILL.md');setEditSkillContent(r.content);setEditSkillOrig(r.content)
    }catch{
      setEditSkillPath('SKILL.md');setEditSkillContent('');setEditSkillOrig('')
    }
  },[skillOpen,skills])
  const selectSkillFile=useCallback(async(p:string)=>{
    setEditSkillPath(p);setMemPath(null);setWsPath(null);setSkillSelected(null);setMemFilePath(null)
    try{const r=await api.skillFileRead(p);setEditSkillContent(r.content);setEditSkillOrig(r.content)}catch{}
  },[])
  const saveSkillFile=useCallback(async()=>{
    if(!editSkillPath)return
    try{
      const savePath = editSkillPath === 'SKILL.md' && skillSelected ? `skills/${skillSelected}/SKILL.md` : editSkillPath
      if(!savePath) return
      await api.skillFileSave(savePath,editSkillContent);setEditSkillOrig(editSkillContent);alert('已保存 ✓')
    }catch(e:any){alert('保存失败: '+e.message)}
  },[editSkillPath,editSkillContent])
  const deleteSkill=useCallback(async()=>{
    if(!confirmDel)return
    try{
      await api.skillDelete(confirmDel.name);setSkills(p=>p.filter(s=>s.name!==confirmDel.name))
      if(skillOpen===confirmDel.name){setSkillOpen(null);setSkillFiles([]);setSkillSelected(null);setSkillDesc('')}
      if(editSkillPath&&editSkillPath.startsWith(`skills/${confirmDel.name}/`)){setEditSkillPath(null);setEditSkillContent('');setEditSkillOrig('')}
    }catch(e:any){alert('删除失败: '+e.message)}
    setConfirmDel(null)
  },[confirmDel,skillOpen,editSkillPath])

  // ====== 中间列表 ======
  function renderList(){
    if(activeTab==='workspace'){
      const coreFiles = wsFiles.filter(f => PROTECTED.includes(f.path))
      if(coreFiles.length===0)return<div className="list-empty">暂无核心文件</div>
      return coreFiles.map(f=>(
        <div key={f.path} className={`list-item ${wsPath===f.path?'active':''}`} onClick={()=>selectWs(f.path)}>
          <span className="list-icon">{PROTECTED.includes(f.path)?'🔒':'📄'}</span>
          <span className="list-name">{f.path}</span>
          <span className="list-meta">{(f.size/1024).toFixed(0)}KB</span>
        </div>
      ))
    }
    if(activeTab==='skills'){
      if(skills.length===0)return<div className="list-empty">暂无技能</div>
      return skills.map(s=>{
        const isOpen=skillOpen===s.name
        return(
        <div key={s.name} className="skill-group">
          {/* 整个头部点击切换展开/收起 */}
          <div className={`skill-head ${isOpen?'open':''}`} onClick={()=>toggleSkill(s.name)}>
            <span className="skill-arrow">{isOpen?'▾':'▸'}</span>
            <span className="skill-name">{s.name}</span>
            <button className="del-btn" onClick={e=>{e.stopPropagation();setConfirmDel({type:'skill',name:s.name})}} title="删除整个技能目录">✕</button>
          </div>
          {isOpen&&(
            <div className="skill-contents">
              {skillFiles.length===0?<div className="skill-empty">无文件</div>:skillFiles.map(sf=>(
                <div key={sf.path} className={`skill-file ${editSkillPath===sf.path?'active':''}`} onClick={()=>selectSkillFile(sf.path)}>
                  <span className="skill-file-icon">{sf.name.endsWith('.md')?'📝':'📄'}</span>
                  <span className="skill-file-name">{sf.name}</span>
                  <span className="skill-file-size">{(sf.size/1024).toFixed(0)}KB</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )})
    }
    // memories — 按月分组（列表结构和数据库一样）
    if(activeTab==='memories'){
      if(memFilesDir.length===0)return<div className="list-empty">加载中...</div>
      const groups = new Map<string, typeof memFilesDir>()
      for(const f of memFilesDir){
        const m = f.path.match(/memory\/(\d{4}-\d{2})-/)
        const key = m ? m[1] : '其他'
        if(!groups.has(key)) groups.set(key, [])
        groups.get(key)!.push(f)
      }
      const sortedGroups = [...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0]))
      return sortedGroups.map(([month,files]) => {
        const isOpen=memGroupOpen===month
        return <div key={month} className="db-group">
          <div className={`db-group-head ${isOpen?'open':''}`} onClick={()=>setMemGroupOpen(isOpen?null:month)}>
            <span className="db-group-arrow">{isOpen?'▾':'▸'}</span>
            <span className="db-group-label">{month}</span>
            <span className="list-count">{files.length}</span>
          </div>
          {isOpen&&files.map(f=>(
            <div key={f.path} className={`list-item ${memFilePath===f.path?'active':''}`} onClick={()=>selectMemFile(f.path)}>
              <span className="list-icon">📄</span>
              <span className="list-name">{f.path.replace('memory/','')}</span>
              <span className="list-meta">{(f.size/1024).toFixed(0)}KB</span>
            </div>
          ))}
        </div>
      })
    }

    // database — 按月分组
    if(dbFiles.length===0)return<div className="list-empty">加载中...</div>
    const groups = new Map<string, typeof dbFiles>()
    for(const f of dbFiles){
      // path 格式 memory/YYYY-MM-DD.md → 取 YYYY-MM
      const m = f.path.match(/memory\/(\d{4}-\d{2})-/)
      const key = m ? m[1] : '其他'
      if(!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(f)
    }
    const sortedGroups = [...groups.entries()].sort((a,b)=>b[0].localeCompare(a[0]))
    return sortedGroups.map(([month,files])=>{
      const isOpen=dbGroupOpen===month
      return <div key={month} className="db-group">
        <div className={`db-group-head ${isOpen?'open':''}`} onClick={()=>setDbGroupOpen(isOpen?null:month)}>
          <span className="db-group-arrow">{isOpen?'▾':'▸'}</span>
          <span className="db-group-label">{month}</span>
          <span className="list-count">{files.length}</span>
        </div>
        {isOpen&&files.map(f=>(
          <div key={f.path} className={`list-item ${memPath===f.path?'active':''}`} onClick={()=>selectDb(f.path)}>
            <span className="list-icon">📄</span>
            <span className="list-name">{f.path.replace('memory/','')}</span>
            <span className="list-meta">{f.chunks}段</span>
          </div>
        ))}
      </div>
    })
  }

  // ====== 右侧面板 ======
  function renderPanel(){
    // 记忆 Tab:点击文件显示编辑器
    if(memFilePath){
      return<div className="editor-panel">
        <div className="editor-bar">
          <span className="editor-title">{memFilePath}</span>
          <div className="editor-actions">
            <button className="btn btn-primary btn-sm" onClick={saveMemFile} disabled={memFileContent===memFileOrig}>保存</button>
            <button className="btn btn-ghost btn-sm" onClick={()=>{setMemFilePath(null);setMemFileContent('');setMemFileOrig('')}}>关闭</button>
          </div>
        </div>
        <textarea className="editor-textarea" value={memFileContent} onChange={e=>setMemFileContent(e.target.value)} spellCheck={false}/>
      </div>
    }

    if(memPath){
      return<main className="main-panel">
        <div className="toolbar">
          <span className="toolbar-file">📄 {memPath}</span>
          <div className="toolbar-search">
            <input className="search-input" placeholder="搜索..." value={dbSearch} onChange={e=>searchDb(e.target.value)}/>
            <span className="item-count">{memChunks.length}段</span>
          </div>
        </div>
        <div className="mem-tabs">
          {(['chunks','raw','info'] as const).map(t=>(
            <button key={t} className={`mem-tab ${dbTab===t?'active':''}`} onClick={()=>setDbTab(t)}>
              {t==='chunks'?'🧩分块':t==='raw'?'📄源码':'ℹ详情'}
            </button>
          ))}
        </div>
        <div className="panel-scroll">
          {dbTab==='chunks'&&memChunks.map(c=>(
            <div key={c.id} className="chunk-card">
              <div className="chunk-meta"><span className="chunk-lines">L{c.start_line}–{c.end_line}</span>{c.model&&<span className="chunk-model">{c.model}</span>}</div>
              <div className="chunk-text">{c.text}</div>
            </div>
          ))}
          {dbTab==='raw'&&memChunks.map(c=><div key={c.id} className="chunk-text" style={{padding:'2px 0'}}>{c.text}</div>)}
          {dbTab==='info'&&<div className="chunk-card">共 {memChunks.length} 段</div>}
        </div>
      </main>
    }
    if(wsPath){
      return<div className="editor-panel">
        <div className="editor-bar">
          <span className="editor-title">{wsPath}{PROTECTED.includes(wsPath)?' 🔒':''}</span>
          <div className="editor-actions">
            <button className="btn btn-primary btn-sm" onClick={saveWs} disabled={wsContent===wsOrig}>保存</button>
            <button className="btn btn-ghost btn-sm" onClick={()=>setWsPath(null)}>关闭</button>
          </div>
        </div>
        <textarea className="editor-textarea" value={wsContent} onChange={e=>setWsContent(e.target.value)} spellCheck={false}/>
      </div>
    }
    if(skillSelected && !editSkillPath?.startsWith('skills/')){
      // 选中技能文件夹：显示描述 + SKILL.md 编辑区
      const isSkillMd = editSkillPath === 'SKILL.md'
      return<div className="editor-panel">
        <div className="editor-bar">
          <span className="editor-title">{skillDesc}</span>
          <div className="editor-actions">
            {isSkillMd && <button className="btn btn-primary btn-sm" onClick={saveSkillFile} disabled={editSkillContent===editSkillOrig}>保存</button>}
            <button className="btn btn-ghost btn-sm" onClick={()=>{setSkillSelected(null);setEditSkillPath(null);setEditSkillContent('');setEditSkillOrig('')}}>关闭</button>
          </div>
        </div>
        <textarea className="editor-textarea" value={editSkillContent} onChange={e=>setEditSkillContent(e.target.value)} spellCheck={false}/>
      </div>
    }
    if(editSkillPath && editSkillPath.startsWith('skills/')){
      // 选中子文件：显示文件名 + 文件编辑器
      return<div className="editor-panel">
        <div className="editor-bar">
          <span className="editor-title">{editSkillPath}</span>
          <div className="editor-actions">
            <button className="btn btn-primary btn-sm" onClick={saveSkillFile} disabled={editSkillContent===editSkillOrig}>保存</button>
            <button className="btn btn-ghost btn-sm" onClick={()=>{setEditSkillPath(null);setEditSkillContent('');setEditSkillOrig('')}}>关闭</button>
          </div>
        </div>
        <textarea className="editor-textarea" value={editSkillContent} onChange={e=>setEditSkillContent(e.target.value)} spellCheck={false}/>
      </div>
    }
    return<div className="empty-state"><div className="empty-icon">📂</div><p style={{color:'var(--text-dim)',fontSize:14}}>左侧选择一个文件</p></div>
  }

  return <div className="app-layout">
    <header className="header">
      <span className="header-logo">⚖️</span>
      <span className="header-title">{stats?.name||''}</span>
      <span className="header-sub">工作区 · 技能 · 数据库</span>
      <div className="header-spacer"/>
      <div className="header-actions">
        <button className="mode-btn" onClick={th.toggleMode} title={th.mode==='dark'?'亮色':'暗色'}>
          {th.mode==='dark'
            ?<svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7.5" cy="7.5" r="3"/><path d="M7.5 1v2M7.5 12v2M1 7.5h2M12 7.5h2M3 3l1.4 1.4M10.6 10.6l1.4 1.4M3 12l1.4-1.4M10.6 4.4l1.4-1.4"/></svg>
            :<svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12.5 8.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6 5.5z"/></svg>}
        </button>
        <div className="theme-group">
          {th.themes.map(t=>(
            <button key={t} data-theme-btn={t} className={`theme-btn ${t===th.theme?'active':''}`} onClick={()=>th.setTheme(t)}/>
          ))}
        </div>
      </div>
    </header>

    <div className="app-body">
      {/* 第一栏：Tab 按钮竖排 */}
      <div className="tab-bar">
        {TABS.map(t=>(
          <button key={t.id} className={`tab-btn ${activeTab===t.id?'active':''}`} onClick={()=>setActiveTab(t.id)} title={t.label}>
            {t.icon}
          </button>
        ))}
      </div>

      {/* 第二栏：文件/文件夹列表 */}
      <div className="list-panel">
        <div className="list-header">
          <span>{TABS.find(t=>t.id===activeTab)?.label}</span>
          <span className="list-count">
            {activeTab==='workspace'?wsFiles.length:activeTab==='skills'?skills.length:dbFiles.length}
          </span>
        </div>
        <div className="list-scroll">{renderList()}</div>
      </div>

      {/* 第三栏：编辑/查看区域 */}
      {renderPanel()}
    </div>

    <footer className="status-bar">
      <span>{th.mode==='dark'?'🌙暗色':'☀亮色'} · {th.theme}</span>
    </footer>

    <ConfirmDialog show={!!confirmDel} title="确认删除"
      msg={confirmDel?`确定删除技能目录「${confirmDel.name}」？此操作不可恢复！`:''}
      onConfirm={deleteSkill} onCancel={()=>setConfirmDel(null)}/>
  </div>
}
