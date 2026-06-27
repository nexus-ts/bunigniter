/**
 * TodoList — React SSR view component.
 *
 * Simple as a PHP template: props come from Controller, JSX is the template.
 * No client-side framework needed — rendered to HTML on the server.
 */
import React from 'react'

interface Todo { id: number; title: string; completed: boolean; priority: string; created_at: string }
interface Props { todos: Todo[]; stats: { total: number; active: number; completed: number }; filter?: string; priority?: string }

function FilterBtn({ active, label, href }: { active: boolean; label: string; href: string }) {
	return (
		<a href={href}
			style={{
				padding: '6px 14px', borderRadius: 6, fontSize: 13, textDecoration: 'none',
				border: '1px solid #333', background: active ? '#e94560' : '#1a1a3e',
				color: active ? '#fff' : '#ccc',
			}}
		>{label}</a>
	)
}

export default function TodoList({ todos, stats, filter, priority }: Props) {
	return (
		<div className="container" style={{ maxWidth: 680, margin: '0 auto', padding: '40px 20px' }}>
			<style>{`
				*{margin:0;padding:0;box-sizing:border-box}
				body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f0f23;color:#e0e0e0;min-height:100vh}
				.stat-box{background:#1a1a3e;border-radius:8px;padding:12px 20px;flex:1;text-align:center}
				.stat-num{font-size:24px;font-weight:bold;color:#fff}
				.stat-label{font-size:12px;color:#888;margin-top:2px}
				.filters{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;align-items:center}
				.add-form{display:flex;gap:8px;margin-bottom:24px}
				.add-form input[type="text"]{flex:1;padding:10px 14px;border-radius:8px;border:1px solid #333;background:#1a1a3e;color:#fff;font-size:14px}
				.add-form select{padding:10px;border-radius:8px;border:1px solid #333;background:#1a1a3e;color:#ccc}
				.add-form button{padding:10px 20px;border-radius:8px;border:none;background:#e94560;color:#fff;cursor:pointer;font-weight:bold}
				.todo-item{display:flex;align-items:center;gap:12px;padding:12px 16px;background:#1a1a3e;border-radius:8px;margin-bottom:8px}
				.todo-item:hover{background:#2a2a5e}
				.completed{opacity:0.6}
				.completed .title{text-decoration:line-through;color:#666}
				.content{flex:1}
				.title{font-size:15px}
				.meta{font-size:11px;color:#666;margin-top:2px;display:flex;gap:6px;align-items:center}
				.toggle-btn{width:22px;height:22px;border-radius:4px;border:2px solid #555;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:transparent;font-size:12px;padding:0}
				.checked{background:#7bed9f;border-color:#7bed9f;color:#1a1a3e!important}
				.delete-btn{padding:4px 8px;border:none;background:transparent;color:#666;cursor:pointer;font-size:16px}
				.delete-btn:hover{color:#e94560}
			`}</style>

			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
				<h1 style={{ color: '#e94560', fontSize: 28 }}>📋 Todo App</h1>
				<a href="/about" style={{ color: '#70a1ff', fontSize: 14, textDecoration: 'none' }}>About →</a>
			</div>
			<p style={{ color: '#888', fontSize: 14, marginBottom: 24 }}>NexusTS + React SSR</p>

			{/* Stats */}
			<div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
				<div className="stat-box"><div className="stat-num">{stats.total}</div><div className="stat-label">Total</div></div>
				<div className="stat-box"><div className="stat-num">{stats.active}</div><div className="stat-label">Active</div></div>
				<div className="stat-box"><div className="stat-num">{stats.completed}</div><div className="stat-label">Done</div></div>
			</div>

			{/* Filters */}
			<div className="filters">
				<FilterBtn active={filter === 'all' || !filter} label="All" href="/todos" />
				<FilterBtn active={filter === 'active'} label="Active" href="/todos?filter=active" />
				<FilterBtn active={filter === 'completed'} label="Completed" href="/todos?filter=completed" />
				<span style={{ color: '#444', margin: '0 4px' }}>|</span>
				<FilterBtn active={priority === 'high'} label="🔥 High" href="/todos?priority=high" />
				<FilterBtn active={priority === 'medium'} label="📌 Medium" href="/todos?priority=medium" />
				<FilterBtn active={priority === 'low'} label="💤 Low" href="/todos?priority=low" />
			</div>

			{/* Add Form */}
			<form action="/todos" method="POST" className="add-form">
				<input type="text" name="title" placeholder="What needs to be done?" required />
				<select name="priority" defaultValue="medium">
					<option value="high">🔥 High</option>
					<option value="medium">📌 Medium</option>
					<option value="low">💤 Low</option>
				</select>
				<button type="submit">+ Add</button>
			</form>

			{/* List */}
			{todos.length === 0 ? (
				<div style={{ textAlign: 'center', padding: 40, color: '#666' }}>✨ No tasks found!</div>
			) : todos.map(t => (
				<div key={t.id} className={`todo-item${t.completed ? ' completed' : ''}`}>
					<form action={`/todos/${t.id}`} method="POST" style={{ display: 'inline' }}>
						<input type="hidden" name="_method" value="PUT" />
						<input type="hidden" name="completed" value={t.completed ? '0' : '1'} />
						<button type="submit" className={`toggle-btn${t.completed ? ' checked' : ''}`}>{t.completed ? '✓' : ''}</button>
					</form>
					<div className="content">
						<div className="title">{t.title}</div>
						<div className="meta">
							<span style={{
								display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 'bold',
								background: t.priority === 'high' ? '#e94560' : t.priority === 'medium' ? '#f8a5c2' : '#70a1ff',
								color: '#fff'
							}}>{t.priority}</span>
							<span>{t.created_at?.slice(0, 10)}</span>
						</div>
					</div>
					<form action={`/todos/${t.id}`} method="POST" style={{ display: 'inline' }}>
						<input type="hidden" name="_method" value="DELETE" />
						<button type="submit" className="delete-btn">✕</button>
					</form>
				</div>
			))}
		</div>
	)
}
