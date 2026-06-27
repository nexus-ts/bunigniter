/**
 * Todo App — Vanilla JS Client Renderer.
 *
 * Reads `data-page` JSON from the HTML shell and renders the UI.
 * Handles navigation, form submissions, toggles, and deletes
 * via the Inertia protocol (X-Inertia header).
 *
 * This file is served as a static script and bootstraps the app.
 */
(function () {
	'use strict'

	const app = document.getElementById('app')
	if (!app) return

	/** Current page data from the server. */
	let pageData = JSON.parse(app.getAttribute('data-page') || '{}')
	let inFlight = false

	// ─── Render Functions ─────────────────────────────────────

	function render() {
		if (!pageData.component || !pageData.props) return

		switch (pageData.component) {
			case 'TodoApp':
				renderTodoApp(pageData.props)
				break
			default:
				app.innerHTML = `<h1>Unknown component: ${pageData.component}</h1>`
		}

		// Update page title
		const titleEl = document.querySelector('title')
		if (titleEl && pageData.props.title) {
			titleEl.textContent = pageData.props.title
		}
	}

	function renderTodoApp(props) {
		const { todos, stats, filter, priority, search } = props

		const html = `
			<style>
				* { margin: 0; padding: 0; box-sizing: border-box; }
				body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f0f23; color: #e0e0e0; min-height: 100vh; }
				.container { max-width: 680px; margin: 0 auto; padding: 40px 20px; }
				h1 { color: #e94560; font-size: 28px; margin-bottom: 8px; }
				.subtitle { color: #888; font-size: 14px; margin-bottom: 24px; }
				.stats { display: flex; gap: 16px; margin-bottom: 24px; }
				.stat { background: #1a1a3e; border-radius: 8px; padding: 12px 20px; flex: 1; text-align: center; }
				.stat .num { font-size: 24px; font-weight: bold; color: #fff; }
				.stat .label { font-size: 12px; color: #888; margin-top: 2px; }
				.filters { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
				.filter-btn { padding: 6px 14px; border-radius: 6px; border: 1px solid #333; background: #1a1a3e; color: #ccc; cursor: pointer; font-size: 13px; }
				.filter-btn.active { background: #e94560; border-color: #e94560; color: #fff; }
				.filter-btn:hover { background: #2a2a5e; }
				.search-box { display: flex; gap: 8px; margin-bottom: 20px; }
				.search-box input { flex: 1; padding: 8px 12px; border-radius: 6px; border: 1px solid #333; background: #1a1a3e; color: #fff; font-size: 14px; }
				.search-box input::placeholder { color: #666; }
				.search-box button { padding: 8px 16px; border-radius: 6px; border: none; background: #e94560; color: #fff; cursor: pointer; }
				.add-form { display: flex; gap: 8px; margin-bottom: 24px; }
				.add-form input[type="text"] { flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid #333; background: #1a1a3e; color: #fff; font-size: 14px; }
				.add-form input::placeholder { color: #666; }
				.add-form select { padding: 10px; border-radius: 8px; border: 1px solid #333; background: #1a1a3e; color: #ccc; }
				.add-form button { padding: 10px 20px; border-radius: 8px; border: none; background: #e94560; color: #fff; cursor: pointer; font-weight: bold; }
				.add-form button:disabled { opacity: 0.5; cursor: not-allowed; }
				.todo-list { list-style: none; }
				.todo-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #1a1a3e; border-radius: 8px; margin-bottom: 8px; transition: all 0.2s; }
				.todo-item:hover { background: #2a2a5e; }
				.todo-item.completed { opacity: 0.6; }
				.todo-item.completed .todo-title { text-decoration: line-through; color: #666; }
				.todo-checkbox { width: 20px; height: 20px; border-radius: 4px; border: 2px solid #555; cursor: pointer; display: flex; align-items: center; justify-content: center; background: transparent; color: transparent; font-size: 14px; transition: all 0.2s; }
				.todo-checkbox.checked { background: #7bed9f; border-color: #7bed9f; color: #1a1a3e; }
				.todo-content { flex: 1; }
				.todo-title { font-size: 15px; }
				.todo-meta { font-size: 11px; color: #666; margin-top: 2px; }
				.priority-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
				.priority-high { background: #e94560; color: #fff; }
				.priority-medium { background: #f8a5c2; color: #1a1a3e; }
				.priority-low { background: #70a1ff; color: #fff; }
				.delete-btn { padding: 4px 10px; border-radius: 4px; border: none; background: transparent; color: #666; cursor: pointer; font-size: 16px; transition: color 0.2s; }
				.delete-btn:hover { color: #e94560; }
				.empty { text-align: center; padding: 40px; color: #666; }
			</style>
			<div class="container">
				<h1>📋 Todo App</h1>
				<p class="subtitle">A full-stack NexusTS example</p>

				<div class="stats">
					<div class="stat"><div class="num">${stats.total}</div><div class="label">Total</div></div>
					<div class="stat"><div class="num">${stats.active}</div><div class="label">Active</div></div>
					<div class="stat"><div class="num">${stats.completed}</div><div class="label">Done</div></div>
				</div>

				<div class="filters" id="filters">
					${renderFilters(filter, priority, search)}
				</div>

				<form class="add-form" id="addForm">
					<input type="text" id="newTodo" placeholder="Add a new task..." required />
					<select id="newPriority">
						<option value="high">🔥 High</option>
						<option value="medium" selected>📌 Medium</option>
						<option value="low">💤 Low</option>
					</select>
					<button type="submit" id="addBtn">+ Add</button>
				</form>

				${todos.length === 0
					? '<div class="empty">✨ No tasks found. Create one above!</div>'
					: `<ul class="todo-list">${todos.map(renderTodoItem).join('')}</ul>`}
			</div>
		`

		app.innerHTML = html
		bindEvents()
	}

	function renderFilters(filter, priority, search) {
		const filters = [
			{ key: 'filter', value: 'all', label: 'All' },
			{ key: 'filter', value: 'active', label: 'Active' },
			{ key: 'filter', value: 'completed', label: 'Completed' },
			{ key: 'priority', value: 'high', label: '🔥 High' },
			{ key: 'priority', value: 'medium', label: '📌 Medium' },
			{ key: 'priority', value: 'low', label: '💤 Low' },
		]

		return filters.map(f => {
			const isActive = (f.key === 'filter' && f.value === (filter || 'all')) ||
				(f.key === 'priority' && f.value === priority)
			return `<button class="filter-btn ${isActive ? 'active' : ''}" data-key="${f.key}" data-value="${f.value}">${f.label}</button>`
		}).join('')
	}

	function renderTodoItem(todo) {
		const priorityClass = `priority-${todo.priority}`
		const checked = todo.completed ? 'checked' : ''
		const completedClass = todo.completed ? 'completed' : ''
		const checkboxChar = todo.completed ? '✓' : ''

		return `
			<li class="todo-item ${completedClass}" data-id="${todo.id}">
				<div class="todo-checkbox ${checked}" data-action="toggle">${checkboxChar}</div>
				<div class="todo-content">
					<div class="todo-title">${escapeHtml(todo.title)}</div>
					<div class="todo-meta">
						<span class="priority-badge ${priorityClass}">${todo.priority}</span>
						${todo.created_at ? ` · ${todo.created_at.slice(0, 10)}` : ''}
					</div>
				</div>
				<button class="delete-btn" data-action="delete" title="Delete">✕</button>
			</li>
		`
	}

	// ─── Event Binding ────────────────────────────────────────

	function bindEvents() {
		// Add todo form
		const addForm = document.getElementById('addForm')
		if (addForm) {
			addForm.addEventListener('submit', async (e) => {
				e.preventDefault()
				if (inFlight) return
				const input = document.getElementById('newTodo')
				const priority = document.getElementById('newPriority')
				if (!input.value.trim()) return

				inFlight = true
				const btn = document.getElementById('addBtn')
				btn.disabled = true

				await inertiaFetch(window.location.pathname, {
					method: 'POST',
					body: { title: input.value.trim(), priority: priority.value },
				})

				input.value = ''
				btn.disabled = false
				inFlight = false
			})
		}

		// Filter buttons
		document.querySelectorAll('.filter-btn').forEach(btn => {
			btn.addEventListener('click', async () => {
				const key = btn.dataset.key
				const value = btn.dataset.value

				const params = new URLSearchParams(window.location.search)
				if (value === 'all') {
					params.delete(key)
				} else {
					params.set(key, value)
				}
				// Clear the other filter
				if (key === 'filter') params.delete('priority')
				if (key === 'priority') params.delete('filter')

				const qs = params.toString()
				const url = qs ? `/todos?${qs}` : '/todos'
				await inertiaFetch(url)
			})
		})

		// Toggle and delete (event delegation)
		app.addEventListener('click', async (e) => {
			const target = e.target.closest('[data-action]')
			if (!target) return

			const action = target.dataset.action
			const item = target.closest('.todo-item')
			if (!item) return

			const id = item.dataset.id

			if (action === 'toggle') {
				await inertiaFetch(`/todos/${id}`, {
					method: 'PUT',
					body: { completed: !item.classList.contains('completed') },
				})
			}

			if (action === 'delete') {
				if (!confirm('Delete this task?')) return
				await inertiaFetch(`/todos/${id}`, { method: 'DELETE' })
			}
		})

		// Search form
		const searchForm = document.getElementById('searchForm')
		if (searchForm) {
			searchForm.addEventListener('submit', async (e) => {
				e.preventDefault()
				const q = document.getElementById('searchInput')?.value || ''
				const params = new URLSearchParams(window.location.search)
				if (q) params.set('q', q)
				else params.delete('q')
				const qs = params.toString()
				await inertiaFetch(qs ? `/todos?${qs}` : '/todos')
			})
		}
	}

	// ─── Inertia Fetch ────────────────────────────────────────

	async function inertiaFetch(url, options = {}) {
		const method = (options.method || 'GET').toUpperCase()
		const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)

		try {
			const fetchOptions = {
				method,
				headers: {
					'X-Inertia': 'true',
					'Accept': 'application/json',
				},
			}

			if (isMutation && options.body) {
				fetchOptions.headers['Content-Type'] = 'application/json'
				fetchOptions.body = JSON.stringify(options.body)
			}

			const res = await fetch(url, fetchOptions)

			if (res.headers.get('X-Inertia') === 'true') {
				const data = await res.json()
				if (data.component) {
					pageData = data
					// Update URL without full navigation
					if (url !== window.location.pathname + window.location.search) {
						window.history.pushState({}, '', url)
					}
					render()
					return data
				}
			}

			// Non-Inertia response or redirect — reload page
			if (res.redirected) {
				window.location.href = res.url
				return
			}

			// Fallback: reload
			window.location.reload()
		} catch (err) {
			console.error('[todo] fetch error:', err)
		}
	}

	// ─── Utilities ─────────────────────────────────────────────

	function escapeHtml(s) {
		if (!s) return ''
		return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
	}

	// ─── Init ──────────────────────────────────────────────────

	// Handle browser back/forward
	window.addEventListener('popstate', () => {
		window.location.reload()
	})

	render()
})()
