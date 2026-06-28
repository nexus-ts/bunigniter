import React from 'react'
export default function PostEdit({ post }: any) {
  const isNew = !post?.id
  return <div>
    <h1 style={{fontSize:26,marginBottom:20,color:'#2d3436'}}>{isNew ? 'New Post' : 'Edit Post'}</h1>
    <form action={isNew ? '/admin' : '/admin/edit/'+post.id} method="POST" style={{maxWidth:700}}>
      <div style={{marginBottom:12}}><label style={{display:'block',fontSize:13,color:'#666',marginBottom:4}}>Title</label>
        <input name="title" defaultValue={post?.title} required style={{width:'100%',padding:'8px 12px',border:'1px solid #ddd',borderRadius:6,fontSize:14}}/></div>
      <div style={{marginBottom:12}}><label style={{display:'block',fontSize:13,color:'#666',marginBottom:4}}>Slug</label>
        <input name="slug" defaultValue={post?.slug} style={{width:'100%',padding:'8px 12px',border:'1px solid #ddd',borderRadius:6,fontSize:14}}/></div>
      <div style={{marginBottom:12}}><label style={{display:'block',fontSize:13,color:'#666',marginBottom:4}}>Excerpt</label>
        <input name="excerpt" defaultValue={post?.excerpt} style={{width:'100%',padding:'8px 12px',border:'1px solid #ddd',borderRadius:6,fontSize:14}}/></div>
      <div style={{marginBottom:12}}><label style={{display:'block',fontSize:13,color:'#666',marginBottom:4}}>Content</label>
        <textarea name="content" defaultValue={post?.content} rows={12} style={{width:'100%',padding:'8px 12px',border:'1px solid #ddd',borderRadius:6,fontFamily:'monospace',fontSize:14}}/></div>
      <button style={{padding:'8px 20px',background:'#ff7675',color:'#fff',border:'none',borderRadius:6,cursor:'pointer'}}>Save</button>
      <a href="/admin" style={{marginLeft:12,color:'#888',fontSize:13}}>Cancel</a>
    </form>
  </div>
}
