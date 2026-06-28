import React from 'react'
export default function PostsIndex({ posts, user }: any) {
  return <div>
    <h1 style={{fontSize:26,marginBottom:20,color:'#2d3436'}}>Blog</h1>
    {posts.map((p:any) => <div key={p.id} style={{background:'#fff',borderRadius:8,boxShadow:'0 2px 12px rgba(0,0,0,0.06)',overflow:'hidden',marginBottom:20}}>
      <div style={{padding:20}}>
        <div style={{fontSize:18,marginBottom:6}}><a href={'/posts/'+p.id} style={{color:'#2d3436',textDecoration:'none'}}>{p.title}</a></div>
        <div style={{fontSize:12,color:'#888',marginBottom:8}}>By {p.username} · {p.created_at?.slice(0,10)}</div>
        <div style={{fontSize:14,color:'#555',lineHeight:1.6}}>{p.excerpt || p.content?.slice(0,200)}</div>
      </div>
    </div>)}
  </div>
}
