import React from 'react'
export default function PostShow({ post, comments, user }: any) {
  return <div>
    <h1 style={{fontSize:26,marginBottom:6}}>{post.title}</h1>
    <div style={{fontSize:13,color:'#888',marginBottom:20}}>By {post.username} · {post.created_at?.slice(0,10)}</div>
    <div style={{fontSize:15,lineHeight:1.8,color:'#444',marginBottom:30,whiteSpace:'pre-wrap'}}>{post.content}</div>
    <h3>Comments ({comments.length})</h3>
    {comments.map((c:any) => <div key={c.id} style={{padding:'10px 0',borderBottom:'1px solid #eee'}}><b>{c.author}</b> {c.content}</div>)}
    {user ? <form action={'/posts/'+post.id+'/comment'} method="POST" style={{marginTop:16}}>
      <textarea name="content" placeholder="Comment..." style={{width:'100%',padding:8,border:'1px solid #ddd',borderRadius:6}} required></textarea>
      <button style={{marginTop:8,padding:'8px 20px',background:'#ff7675',color:'#fff',border:'none',borderRadius:6,cursor:'pointer'}}>Comment</button>
    </form> : <p style={{marginTop:16}}><a href="/login">Login to comment</a></p>}
    <a href="/posts" style={{display:'inline-block',marginTop:12,color:'#888',fontSize:13}}>← Back</a>
  </div>
}
