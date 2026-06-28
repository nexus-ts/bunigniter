import React from 'react'
export default function Login({ flash }: any) {
  return <div style={{maxWidth:360,margin:'40px auto'}}>
    {flash && <div style={{padding:12,borderRadius:6,marginBottom:16,background:'#d4edda',color:'#155724'}}>{flash}</div>}
    <h1 style={{fontSize:26,marginBottom:20,color:'#2d3436'}}>Login</h1>
    <form action="/login" method="POST">
      <div style={{marginBottom:12}}><label style={{display:'block',fontSize:13,color:'#666',marginBottom:4}}>Username</label><input name="username" required style={{width:'100%',padding:'8px 12px',border:'1px solid #ddd',borderRadius:6,fontSize:14}}/></div>
      <div style={{marginBottom:12}}><label style={{display:'block',fontSize:13,color:'#666',marginBottom:4}}>Password</label><input type="password" name="password" required style={{width:'100%',padding:'8px 12px',border:'1px solid #ddd',borderRadius:6,fontSize:14}}/></div>
      <button style={{padding:'8px 20px',background:'#ff7675',color:'#fff',border:'none',borderRadius:6,cursor:'pointer',fontSize:14}}>Login</button>
    </form>
    <p style={{marginTop:12,fontSize:13,color:'#888'}}>Demo: admin/admin123 · alice/alice123</p>
  </div>
}
