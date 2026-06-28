import React from 'react'
export default function Admin({ posts, user }: any) {
  return <div>
    <h1 style={{fontSize:26,marginBottom:20,color:'#2d3436'}}>Admin Dashboard</h1>
    <p>Welcome, {user?.username}! <a href="/logout" style={{fontSize:13}}>Logout</a></p>
    <a href="/admin/0" style={{display:'inline-block',margin:'16px 0',padding:'8px 20px',background:'#ff7675',color:'#fff',borderRadius:6,textDecoration:'none'}}>+ New Post</a>
    <table style={{width:'100%',borderCollapse:'collapse',fontSize:14}}>
      <tr style={{background:'#f8f9fa'}}><th style={{padding:'10px 14px',textAlign:'left'}}>Title</th><th style={{padding:'10px 14px',textAlign:'left'}}>Date</th><th></th></tr>
      {posts.map((p:any) => <tr key={p.id}><td style={{padding:'10px 14px',borderBottom:'1px solid #eee'}}><a href={'/posts/'+p.id} style={{color:'#333',textDecoration:'none'}}>{p.title}</a></td>
        <td style={{padding:'10px 14px',borderBottom:'1px solid #eee',color:'#888',fontSize:13}}>{p.created_at?.slice(0,10)}</td>
        <td style={{padding:'10px 14px',borderBottom:'1px solid #eee'}}><a href={'/admin/edit/'+p.id} style={{color:'#ff7675',fontSize:13}}>Edit</a></td></tr>)}
    </table>
  </div>
}
