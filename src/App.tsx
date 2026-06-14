import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '@/utils/api'
import type { FileInfo, ChunkInfo, Stats, WorkspaceFileInfo, SkillInfo } from '@/types'

const PROTECTED = ['IDENTITY.md','MEMORY.md','SOUL.md','TOOLS.md','USER.md','AGENTS.md','HEARTBEAT.md']
const THEMES = ['indigo','emerald','amber','rose','violet'] as const
type Theme = (typeof THEMES)[number]; type ColorMode = 'dark'|'light'

/* ─── Icons ─── */
const Icons = {
  Folder: (p:{w?:number}) => (
    <svg width={p.w||16} height={p.w||16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3.5a1 1 0 0 1 1-1h3l2 2h5a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5z"/>
    </svg>
  ),
  Puzzle: (p:{w?:number}) => (
    <svg width={p.w||16} height={p.w||16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 2a2 2 0 0 1 2 2v.5A1.5 1.5 0 0 0 14.5 6H14a2 2 0 0 1 0 4h.5A1.5 1.5 0 0 0 13 11.5V12a2 2 0 0 1-2 2H8.5A1.5 1.5 0 0 0 7 12.5V12a2 2 0 0 0-4 0v.5A1.5 1.5 0 0 1 1.5 14H1a2 2 0 0 1-2-2v-.5A1.5 1.5 0 0 0 .5 10H1a2 2 0 0 1 0-4H.5A1.5 1.5 0 0 0 2 4.5V4a2 2 0 0 1 2-2h7z"/>
    </svg>
  ),
  Database: (p:{w?:number}) => (
    <svg width={p.w||16} height={p.w||16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="8" cy="3" rx="6" ry="2"/>
      <path d="M2 3v3c0 1.1 2.7 2 6 2s6-.9 6-2V3"/>
      <path d="M2 6v3c0 1.1 2.7 2 6 2s6-.9 6-2V6"/>
    </svg>
  ),
  Settings: (p:{w?:number}) => (
    <svg width={p.w||16} height={p.w||16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="1.5"/>
      <path d="M8 1.5v1.5M8 13v1.5M3.2 3.2l1 1M11.8 11.8l1 1M1.5 8H3M13 8h1.5M3.2 12.8l1-1M11.8 4.2l1-1"/>
    </svg>
  ),
  FileText: (p:{w?:number}) => (
    <svg width={p.w||14} height={p.w||14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1z"/>
      <path d="M4.5 4h5M4.5 6h5M4.5 8h3"/>
    </svg>
  ),
  Lock: (p:{w?:number}) => (
    <svg width={p.w||12} height={p.w||12} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="6" width="7" height="5" rx="1"/>
      <path d="M4 6V4a2 2 0 0 1 4 0v2"/>
    </svg>
  ),
  Sun: (p:{w?:number}) => (
    <svg width={p.w||13} height={p.w||13} viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="6.5" cy="6.5" r="2.5"/>
      <path d="M6.5 1v2M6.5 10v2M1 6.5h2M10 6.5h2M2.5 2.5l1.5 1.5M9 9l1.5 1.5M2.5 10.5l1.5-1.5M9 4l1.5-1.5"/>
    </svg>
  ),
  Moon: (p:{w?:number}) => (
    <svg width={p.w||13} height={p.w||13} viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M10.5 7.5A5 5 0 0 1 5.5 2.5 5 5 0 1 0 10.5 7.5z"/>
    </svg>
  ),
  ChevronRight: (p:{w?:number}) => (
    <svg width={p.w||8} height={p.w||8} viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 1.5l2.5 2.5L3 6.5"/>
    </svg>
  ),
  ChevronDown: (p:{w?:number}) => (
    <svg width={p.w||8} height={p.w||8} viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 3l2.5 2.5L6.5 3"/>
    </svg>
  ),
  Hash: (p:{w?:number}) => (
    <svg width={p.w||12} height={p.w||12} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M5 1.5L4 10.5M8 1.5L7 10.5M2 4.5h8M2 7.5h8"/>
    </svg>
  ),
  X: (p:{w?:number}) => (
    <svg width={p.w||9} height={p.w||9} viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 2l5 5M7 2l-5 5"/>
    </svg>
  ),
}

/* ─── Preset SVG icons ─── */
const PRESET_ICONS: {id:string;label:string;svg:string}[] = [
  {id:'hexagon',label:'六边形',svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l9.5 5.5v7L12 20l-9.5-5.5v-7L12 2z"/></svg>'},
  {id:'star',label:'星芒',svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.2 6.8H21l-5.6 4 2.2 6.8L12 15.6 6.4 19.6l2.2-6.8L3 8.8h6.8L12 2z"/></svg>'},
  {id:'infinite',label:'无穷',svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12c0-3 2-5 7-5s7 2 7 5-2 5-7 5-7-2-7-5z"/><path d="M5 12c0 3 2 5 7 5s7-2 7-5-2-5-7-5-7 2-7 5z"/></svg>'},
  {id:'eye',label:'眼睛',svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>'},
  {id:'scroll',label:'卷轴',svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H8a4 4 0 0 0-4 4v10a4 4 0 0 0 4 4z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="14" y2="11"/></svg>'},
  {id:'compass',label:'指南针',svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/></svg>'},
  {id:'gem',label:'宝石',svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L2 8l10 12L22 8l-4-6H6z"/><line x1="2" y1="8" x2="22" y2="8"/><line x1="12" y1="4" x2="12" y2="20"/></svg>'},
  {id:'wave',label:'波浪',svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12c3-3 6-3 9 0s6 3 9 0"/><path d="M3 16c3-3 6-3 9 0s6 3 9 0"/><path d="M3 8c3-3 6-3 9 0s6 3 9 0"/></svg>'},
]

/* ─── Config helpers ─── */
interface AppConfig {
  logoType: 'emoji' | 'icon'
  logoValue: string
  title: string
}

const DEFAULT_CONFIG: AppConfig = {
  logoType: 'emoji',
  logoValue: '⚖️',
  title: '记忆库',
}

function loadConfig(): AppConfig {
  try {
    const raw = localStorage.getItem('sqlite-config')
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch {}
  return DEFAULT_CONFIG
}

function saveConfig(c: AppConfig) {
  localStorage.setItem('sqlite-config', JSON.stringify(c))
}

/* ─── Hooks ─── */
function useTheme() {
  const [t,sT]=useState<Theme>(()=>(typeof window!=='undefined'?localStorage.getItem('sqlite-theme')as Theme:null)||'indigo')
  const [m,sM]=useState<ColorMode>(()=>(typeof window!=='undefined'?localStorage.getItem('sqlite-mode')as ColorMode:null)||'dark')
  useEffect(()=>{document.documentElement.setAttribute('data-theme',t);localStorage.setItem('sqlite-theme',t)},[t])
  useEffect(()=>{document.documentElement.setAttribute('data-mode',m);localStorage.setItem('sqlite-mode',m)},[m])
  return{theme:t,themes:THEMES,setTheme:sT,mode:m,toggleMode:()=>sM(p=>p==='dark'?'light':'dark')}
}

type DataTabId = 'workspace'|'skills'|'database'
type TabId = DataTabId | 'settings'
const DATA_TABS: {id:DataTabId;label:string;icon:React.FC<{w?:number}>}[] = [
  {id:'workspace',label:'工作区',icon:Icons.Folder},
  {id:'skills',label:'技能',icon:Icons.Puzzle},
  {id:'database',label:'数据库',icon:Icons.Database},
]

type MemTab = 'chunks'|'raw'|'info'
const MEM_TABS: {id:MemTab;label:string}[] = [
  {id:'chunks',label:'分块'},
  {id:'raw',label:'源码'},
  {id:'info',label:'详情'},
]

/* ─── Confirm Dialog ─── */
function ConfirmDialog({show,title,msg,onConfirm,onCancel}:{
  show:boolean;title:string;msg:string;onConfirm:()=>void;onCancel:()=>void
}){
  if(!show)return null
  return <div className="modal-overlay" onClick={onCancel}>
    <div className="modal-box" onClick={e=>e.stopPropagation()}>
      <div className="modal-title">{title}</div>
      <div className="modal-msg">{msg}</div>
      <div className="modal-actions">
        <button className="btn" onClick={onCancel}>取消</button>
        <button className="btn btn-danger" onClick={onConfirm}>删除</button>
      </div>
    </div>
  </div>
}

type DataTheme=(typeof THEMES)[number]

const ACCENT_LABELS:Record<typeof THEMES[number],string>={indigo:'靛蓝',emerald:'翠绿',amber:'琥珀',rose:'玫瑰',violet:'紫罗兰'}

/* ─── Settings Page ─── */
function SettingsPage({config,theme,accent,onChangeConfig,onSetAccent}:{
  config:AppConfig
  theme:ReturnType<typeof useTheme>
  accent:Theme
  onChangeConfig:(c:AppConfig)=>void
  onSetAccent:(t:Theme)=>void
}){
  return <div className="settings-panel">
    <div className="settings-section">
      <div className="settings-section-title">显示</div>

      <div className="settings-field">
        <label className="settings-label">Logo 类型</label>
        <div className="settings-radio-group">
          {(['emoji','icon'] as const).map(t=>(
            <label key={t} className={`settings-radio ${config.logoType===t?'selected':''}`}>
              <input type="radio" name="logoType" value={t} checked={config.logoType===t}
                onChange={()=>onChangeConfig({...config,logoType:t})}/>
              {t==='emoji'?'Emoji':'图标'}
            </label>
          ))}
        </div>
      </div>

      {config.logoType==='emoji'
        ? <div className="settings-field">
            <label className="settings-label">选择 Emoji</label>
            <div className="settings-emoji-grid">
              {['⚖️','🎯','🚀','🔥','🌟','💎','🐚','🌊','🎨','🦋','⚡','🌀'].map(e=>(
                <span key={e} className={`settings-emoji-item ${config.logoValue===e?'active':''}`}
                  onClick={()=>onChangeConfig({...config,logoValue:e})}>{e}</span>
              ))}
              <input className="settings-input" value={config.logoValue} style={{width:70}}
                onChange={e=>onChangeConfig({...config,logoValue:e.target.value})}
                placeholder='⚖️' maxLength={3}/>
            </div>
          </div>
        : <div className="settings-field">
            <label className="settings-label">选择图标</label>
            <div className="settings-icon-grid">
              {PRESET_ICONS.map(ic=>(
                <div key={ic.id}
                  className={`settings-icon-item ${config.logoValue===ic.svg?'active':''}`}
                  onClick={()=>onChangeConfig({...config,logoValue:ic.svg})}
                  title={ic.label}
                  dangerouslySetInnerHTML={{__html:ic.svg}}/>
              ))}
            </div>
          </div>
      }

      <div className="settings-field">
        <label className="settings-label">标题</label>
        <input className="settings-input" value={config.title}
          onChange={e=>onChangeConfig({...config,title:e.target.value})}
          placeholder="记忆库"/>
      </div>

      <div className="settings-field">
        <label className="settings-label">预览</label>
        <div className="settings-preview">
          <div className="settings-preview-logo" dangerouslySetInnerHTML={{__html:config.logoValue.startsWith('<svg')?config.logoValue:'<span>'+config.logoValue+'</span>'}}/>
          <div className="settings-preview-text">{config.title||'记忆库'}</div>
        </div>
      </div>
    </div>

    <div className="settings-section">
      <div className="settings-section-title">强调色</div>
      <div className="accent-group">
        {theme.themes.map(t=>(
          <button key={t} data-accent={t} className={`accent-btn ${t===accent?'active':''}`}
            onClick={()=>onSetAccent(t)} title={ACCENT_LABELS[t]}/>
        ))}
      </div>
    </div>

    <div className="settings-section">
      <div className="settings-section-title">模式</div>
      <div className="settings-radio-group">
        {(['dark','light'] as const).map(m=>(
          <label key={m} className={`settings-radio ${theme.mode===m?'selected':''}`}>
            <input type="radio" name="mode" value={m} checked={theme.mode===m}
              onChange={()=>{if(theme.mode!==m)theme.toggleMode()}}/>
            {m==='dark'?'暗色':'亮色'}
          </label>
        ))}
      </div>
    </div>
  </div>
}

/* ─── App ─── */
export default function App() {
  const th = useTheme()
  const [config,setConfigRaw]=useState<AppConfig>(loadConfig)
  const setConfig=(c:AppConfig)=>{setConfigRaw(c);saveConfig(c)}

  const [activeTab,setActiveTab] = useState<TabId>('workspace')
  const loaded = useRef(false)
  const [stats,setStats]=useState<Stats|null>(null)

  // Data state
  const [dbFiles,setDbFiles]=useState<FileInfo[]>([])
  const [wsFiles,setWsFiles]=useState<WorkspaceFileInfo[]>([])
  const [skills,setSkills]=useState<SkillInfo[]>([])
  const [skillOpen,setSkillOpen]=useState<string|null>(null)
  const [memFilesDir,setMemFilesDir]=useState<WorkspaceFileInfo[]>([])
  const [skillFiles,setSkillFiles]=useState<{name:string;path:string;size:number;isDir:boolean}[]>([])

  // Selection state
  const [memFilePath,setMemFilePath]=useState<string|null>(null)
  const [memPath,setMemPath]=useState<string|null>(null)
  const [wsPath,setWsPath]=useState<string|null>(null)

  // Editors
  const [memFileContent,setMemFileContent]=useState('')
  const [memFileOrig,setMemFileOrig]=useState('')
  const [wsContent,setWsContent]=useState('')
  const [wsOrig,setWsOrig]=useState('')
  const [skillSelected,setSkillSelected]=useState<string|null>(null)
  const [skillDesc,setSkillDesc]=useState('')
  const [editSkillPath,setEditSkillPath]=useState<string|null>(null)
  const [editSkillContent,setEditSkillContent]=useState('')
  const [editSkillOrig,setEditSkillOrig]=useState('')

  // Group/sub states
  const [memGroupOpen,setMemGroupOpen]=useState<string|null>(null)
  const [dbGroupOpen,setDbGroupOpen]=useState<string|null>(null)
  const [memChunks,setMemChunks]=useState<ChunkInfo[]>([])
  const [memTab,sM]=useState<MemTab>('chunks')
  const [dbTab,sD]=useState<MemTab>('chunks')
  const [dbSearch,sDS]=useState('')
  const [confirmDel,setConfirmDel]=useState<{type:'skill';name:string}|null>(null)

  // Init
  useEffect(()=>{
    if(loaded.current)return;loaded.current=true
    Promise.all([api.stats(),api.files(),api.wsFiles(),api.skills(),api.memoryFiles()]).then(([s,f,w,sk,mf])=>{
      setStats(s.stats)
      setDbFiles(f.files.filter(f=>f.path.includes('/')))
      setWsFiles(w.files);setSkills(sk.skills);setMemFilesDir(mf.files)
    })
  },[])

  /* ─── Handlers ─── */
  const selectMemFile=useCallback(async(p:string)=>{
    setMemFilePath(p);setWsPath(null);setMemPath(null);setEditSkillPath(null);setSkillSelected(null)
    setMemFileContent('');setMemFileOrig('')
    try{const r=await api.memRead(p);setMemFileContent(r.content);setMemFileOrig(r.content)}catch{}
  },[])
  const saveMemFile=useCallback(async()=>{
    if(!memFilePath)return
    try{await api.memSave(memFilePath,memFileContent);setMemFileOrig(memFileContent);alert('已保存 ✓')}catch(e:any){alert('保存失败: '+e.message)}
  },[memFilePath,memFileContent])

  const selectDb=useCallback(async(p:string)=>{
    setMemPath(p);setWsPath(null);setEditSkillPath(null);setMemFilePath(null);setSkillSelected(null);sD('chunks')
    try{const r=await api.chunks(p);setMemChunks(r.chunks)}catch{setMemChunks([])}
  },[])
  const searchDb=useCallback((q:string)=>{
    sDS(q);clearTimeout((searchDb as any).__t)
    ;(searchDb as any).__t=setTimeout(async()=>{if(memPath)try{const r=await api.chunks(memPath,q||undefined);setMemChunks(r.chunks)}catch{}},300)
  },[memPath])

  const selectWs=useCallback(async(name:string)=>{
    setWsPath(name);setMemPath(null);setEditSkillPath(null);setMemFilePath(null);setSkillSelected(null)
    try{const r=await api.wsRead(name);setWsContent(r.content);setWsOrig(r.content)}catch{}
  },[])
  const saveWs=useCallback(async()=>{
    if(!wsPath)return
    try{await api.wsSave(wsPath,wsContent);setWsOrig(wsContent);alert('已保存 ✓')}catch(e:any){alert('保存失败: '+e.message)}
  },[wsPath,wsContent])

  const toggleSkill=useCallback(async(name:string)=>{
    if(skillOpen===name){
      setSkillOpen(null);setSkillFiles([]);setSkillSelected(null);setSkillDesc('');setEditSkillPath(null);setEditSkillContent('');setEditSkillOrig('')
      return
    }
    setSkillOpen(name);setMemPath(null);setWsPath(null);setEditSkillPath(null);setMemFilePath(null);setSkillSelected(name)
    try{const r=await api.skillFiles(name);setSkillFiles(r.files.filter(f=>!f.isDir))}catch{}
    const skill=skills.find(s=>s.name===name);setSkillDesc(skill?.description||'')
    try{const r=await api.skillRead(name);setEditSkillPath('SKILL.md');setEditSkillContent(r.content);setEditSkillOrig(r.content)
    }catch{setEditSkillPath('SKILL.md');setEditSkillContent('');setEditSkillOrig('')}
  },[skillOpen,skills])
  const selectSkillFile=useCallback(async(p:string)=>{
    setEditSkillPath(p);setMemPath(null);setWsPath(null);setSkillSelected(null);setMemFilePath(null)
    try{const r=await api.skillFileRead(p);setEditSkillContent(r.content);setEditSkillOrig(r.content)}catch{}
  },[])
  const saveSkillFile=useCallback(async()=>{
    if(!editSkillPath)return
    try{
      const savePath=editSkillPath==='SKILL.md'&&skillSelected?`skills/${skillSelected}/SKILL.md`:editSkillPath
      if(!savePath) return
      await api.skillFileSave(savePath,editSkillContent);setEditSkillOrig(editSkillContent);alert('已保存 ✓')
    }catch(e:any){alert('保存失败: '+e.message)}
  },[editSkillPath,editSkillContent,skillSelected])
  const deleteSkill=useCallback(async()=>{
    if(!confirmDel)return
    try{
      await api.skillDelete(confirmDel.name);setSkills(p=>p.filter(s=>s.name!==confirmDel.name))
      if(skillOpen===confirmDel.name){setSkillOpen(null);setSkillFiles([]);setSkillSelected(null);setSkillDesc('')}
      if(editSkillPath&&editSkillPath.startsWith(`skills/${confirmDel.name}/`)){setEditSkillPath(null);setEditSkillContent('');setEditSkillOrig('')}
    }catch(e:any){alert('删除失败: '+e.message)}
    setConfirmDel(null)
  },[confirmDel,skillOpen,editSkillPath])

  const activeDataTab = activeTab==='settings'?'workspace':activeTab
  const sidebarCount = activeDataTab==='workspace'?wsFiles.length
    :activeDataTab==='skills'?skills.length:memFilesDir.length

  /* ══════════ Sidebar List ══════════ */
  function renderList(){
    if(activeTab==='settings') return null

    if(activeTab==='workspace'){
      const cf=wsFiles.filter(f=>PROTECTED.includes(f.path))
      if(cf.length===0) return <div className="list-empty">暂无文件</div>
      return cf.map(f=>(
        <div key={f.path} className={`list-item ${wsPath===f.path?'active':''}`} onClick={()=>selectWs(f.path)}>
          <span className="list-icon">{PROTECTED.includes(f.path)?<Icons.Lock/>:<Icons.FileText/>}</span>
          <span className="list-name">{f.path}</span>
          <span className="list-meta">{(f.size/1024).toFixed(0)}KB</span>
        </div>
      ))
    }

    if(activeTab==='skills'){
      if(skills.length===0) return <div className="list-empty">暂无技能</div>
      return skills.map(s=>{
        const isOpen=skillOpen===s.name
        return(
        <div key={s.name} className="skill-group">
          <div className={`skill-head ${isOpen?'open':''}`} onClick={()=>toggleSkill(s.name)}>
            <span className="skill-arrow">{isOpen?<Icons.ChevronDown/>:<Icons.ChevronRight/>}</span>
            <span className="skill-name">{s.name}</span>
            <button className="del-btn" onClick={e=>{e.stopPropagation();setConfirmDel({type:'skill',name:s.name})}} title="删除"><Icons.X/></button>
          </div>
          {isOpen&&<div className="skill-contents">
            {skillFiles.length===0?<div className="skill-empty">无文件</div>:skillFiles.map(sf=>(
              <div key={sf.path} className={`skill-file ${editSkillPath===sf.path?'active':''}`} onClick={()=>selectSkillFile(sf.path)}>
                <span className="skill-file-icon"><Icons.FileText/></span>
                <span className="skill-file-name">{sf.name}</span>
                <span className="skill-file-size">{(sf.size/1024).toFixed(0)}KB</span>
              </div>
            ))}
          </div>}
        </div>
      )})
    }

    // Database tab - same code for both memories and chunks
    const useFiles = activeTab==='database'
    if(useFiles&&memFilesDir.length===0) return <div className="list-empty">加载中...</div>
    if(!useFiles&&dbFiles.length===0) return <div className="list-empty">加载中...</div>
    const gs=new Map<string,WorkspaceFileInfo[]>()
    const cgs=new Map<string,FileInfo[]>()
    for(const f of (useFiles?memFilesDir:dbFiles)){
      const m=f.path.match(/memory\/(\d{4}-\d{2})-/)
      const key=m?m[1]:'其他'
      if(useFiles){if(!gs.has(key))gs.set(key,[]);gs.get(key)!.push(f as WorkspaceFileInfo)}
      else{if(!cgs.has(key))cgs.set(key,[]);cgs.get(key)!.push(f as FileInfo)}
    }
    const sorted=[...(useFiles?gs:cgs).entries()].sort((a,b)=>a[0].localeCompare(b[0]))
    const openKey=useFiles?memGroupOpen:dbGroupOpen
    const setOpen=useFiles?setMemGroupOpen:setDbGroupOpen
    const selPath=useFiles?memFilePath:memPath
    const selFn=useFiles?selectMemFile:selectDb
    const IconComp=useFiles?Icons.FileText:Icons.Hash
    const metaFn=(f:{size:number;chunks?:number})=>useFiles?`${(f.size/1024).toFixed(0)}KB`:`${f.chunks||0}段`
    const labelFn=(f:{path:string})=>f.path.replace('memory/','')

    return sorted.map(([month,files])=>{
      const isOpen=openKey===month
      return <div key={month} className="group-item">
        <div className={`group-head ${isOpen?'open':''}`} onClick={()=>setOpen(isOpen?null:month)}>
          <span className="group-arrow">{isOpen?<Icons.ChevronDown/>:<Icons.ChevronRight/>}</span>
          <span className="group-label">{month}</span>
          <span className="list-count">{files.length}</span>
        </div>
        {isOpen&&files.map(f=>(
          <div key={f.path} className={`list-item ${selPath===f.path?'active':''}`} onClick={()=>selFn(f.path)}>
            <span className="list-icon"><IconComp/></span>
            <span className="list-name">{labelFn(f)}</span>
            <span className="list-meta">{metaFn(f)}</span>
          </div>
        ))}
      </div>
    })
  }

  /* ══════════ Content Panel ══════════ */
  function renderPanel(){
    if(activeTab==='settings') return <SettingsPage config={config} theme={th} accent={th.theme} onChangeConfig={setConfig} onSetAccent={th.setTheme}/>

    // Memory file editor
    if(memFilePath) return <div className="editor-panel">
      <div className="editor-bar">
        <span className="editor-title">{memFilePath}</span>
        <div className="editor-actions">
          <button className="btn btn-primary btn-sm" onClick={saveMemFile} disabled={memFileContent===memFileOrig}>保存</button>
          <button className="btn btn-ghost btn-sm" onClick={()=>{setMemFilePath(null);setMemFileContent('');setMemFileOrig('')}}>关闭</button>
        </div>
      </div>
      <textarea className="editor-textarea" value={memFileContent} onChange={e=>setMemFileContent(e.target.value)} spellCheck={false}/>
    </div>

    // DB chunks
    if(memPath) return <div className="content-panel">
      <div className="toolbar">
        <span className="toolbar-file">{memPath}</span>
        <div className="toolbar-search">
          <input className="search-input" placeholder="搜索..." value={dbSearch} onChange={e=>searchDb(e.target.value)}/>
          <span className="item-count">{memChunks.length}段</span>
        </div>
      </div>
      <div className="sub-tabs">
        {MEM_TABS.map(t=>(
          <button key={t.id} className={`sub-tab ${dbTab===t.id?'active':''}`} onClick={()=>sD(t.id)}>{t.label}</button>
        ))}
      </div>
      <div className="panel-scroll">
        {dbTab==='chunks'&&memChunks.map(c=>(
          <div key={c.id} className="chunk-card">
            <div className="chunk-meta">
              <span className="chunk-lines">L{c.start_line}–{c.end_line}</span>
              {c.model&&<span className="chunk-model">{c.model}</span>}
            </div>
            <div className="chunk-text">{c.text}</div>
          </div>
        ))}
        {dbTab==='raw'&&memChunks.map(c=><div key={c.id} className="chunk-text" style={{padding:'2px 0'}}>{c.text}</div>)}
        {dbTab==='info'&&<div className="chunk-card">共 {memChunks.length} 段</div>}
      </div>
    </div>

    // Workspace editor
    if(wsPath) return <div className="editor-panel">
      <div className="editor-bar">
        <span className="editor-title">{wsPath}{PROTECTED.includes(wsPath)&&<span style={{color:'var(--text-dim)',marginLeft:6,fontSize:11}}>只读</span>}</span>
        <div className="editor-actions">
          <button className="btn btn-primary btn-sm" onClick={saveWs} disabled={wsContent===wsOrig}>保存</button>
          <button className="btn btn-ghost btn-sm" onClick={()=>setWsPath(null)}>关闭</button>
        </div>
      </div>
      <textarea className="editor-textarea" value={wsContent} onChange={e=>setWsContent(e.target.value)} spellCheck={false}/>
    </div>

    // Skill editor
    if(editSkillPath&&(skillSelected||editSkillPath.startsWith('skills/'))) return <div className="editor-panel">
      <div className="editor-bar">
        <span className="editor-title">{editSkillPath==='SKILL.md'?(skillDesc||'SKILL.md'):editSkillPath}</span>
        <div className="editor-actions">
          <button className="btn btn-primary btn-sm" onClick={saveSkillFile} disabled={editSkillContent===editSkillOrig}>保存</button>
          <button className="btn btn-ghost btn-sm" onClick={()=>{setEditSkillPath(null);setEditSkillContent('');setEditSkillOrig('');setSkillSelected(null)}}>关闭</button>
        </div>
      </div>
      <textarea className="editor-textarea" value={editSkillContent} onChange={e=>setEditSkillContent(e.target.value)} spellCheck={false}/>
    </div>

    return <div className="empty-state">
      <div className="empty-icon"><Icons.Folder/></div>
      <div className="empty-label">在左侧选择一个文件</div>
    </div>
  }

  /* ══════════ Render ══════════ */
  return <div className="app-layout grain-overlay">
    <header className="header">
      <span className="header-logo" dangerouslySetInnerHTML={{__html:config.logoValue.startsWith('<svg')?config.logoValue:'<span>'+config.logoValue+'</span>'}}/>
      <span className="header-sub">{stats?.name||''}</span>
    </header>

    <div className="app-body">
      {/* Vertical Tab Bar */}
      <div className="tab-bar">
        {DATA_TABS.map(t=>(
          <button key={t.id} className={`tab-btn ${activeTab===t.id?'active':''}`}
            onClick={()=>setActiveTab(t.id)} title={t.label}>
            <t.icon/>
          </button>
        ))}
        <div className="tab-bar-spacer"/>
        <div className="tab-bar-divider"/>
        <button className={`tab-btn ${activeTab==='settings'?'active':''}`}
          onClick={()=>setActiveTab('settings')} title="设置">
          <Icons.Settings/>
        </button>
      </div>

      {/* Sidebar */}
      {activeTab!=='settings' && <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-title">
            {DATA_TABS.find(t=>t.id===activeDataTab)?.label}
            <span className="sidebar-count">{sidebarCount}</span>
          </div>
        </div>
        <div className="sidebar-list-wrap">
          <div className="sidebar-scroll">{renderList()}</div>
        </div>
      </aside>}

      {renderPanel()}
    </div>

    <footer className="status-bar">
      <span>{th.mode==='dark'?'暗色':'亮色'} · {ACCENT_LABELS[th.theme]}</span>
      {stats&&<span style={{marginLeft:'auto'}}>{stats.chunks} 段 · {stats.dbSize}</span>}
    </footer>

    <ConfirmDialog show={!!confirmDel} title="删除技能"
      msg={confirmDel?`确定删除「${confirmDel.name}」？此操作不可恢复。`:''}
      onConfirm={deleteSkill} onCancel={()=>setConfirmDel(null)}/>
  </div>
}
