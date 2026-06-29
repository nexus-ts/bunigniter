<div style="max-width: 560px; margin: 0 auto;">
  <h1>📋 Todos (<?= activeCount ?? 0 ?> active)</h1>

  <? if (errors) { ?>
    <div style="background: #5c1a1a; border: 1px solid #e94560; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px;">
      <? for (const err of Object.values(errors)) { ?>
        <p style="color: #e94560; font-size: 13px;"><?= Array.isArray(err) ? err[0] : err ?></p>
      <? } ?>
    </div>
  <? } ?>

  <form action="/todos" method="POST" style="display: flex; gap: 8px; margin-bottom: 24px;">
    <input type="text" name="title" placeholder="What needs to be done?" value="<?= oldTitle ?? '' ?>"
      style="flex:1; padding:10px 14px; border-radius:8px; border:1px solid #333; background:#1a1a3e; color:#fff; font-size:14px;" required />
    <button type="submit" class="btn btn-primary" style="white-space: nowrap;">+ Add</button>
  </form>

  <? if (todos && todos.length > 0) { ?>
    <? for (const todo of todos) { ?>
      <div class="card" style="display: flex; align-items: center; gap: 12px;">
        <form action="/todos/<?= todo.id ?>" method="POST" style="margin: 0;">
          <input type="hidden" name="_method" value="PUT" />
          <input type="hidden" name="completed" value="<?= todo.completed ? 0 : 1 ?>" />
          <button type="submit" style="background: none; border: none; cursor: pointer; font-size: 18px;">
            <? if (todo.completed) { ?>✅<? } else { ?>⬜<? } ?>
          </button>
        </form>
        <span style="flex:1; <?= todo.completed ? 'text-decoration: line-through; color: #555;' : '' ?>">
          <?= todo.title ?>
        </span>
        <form action="/todos/<?= todo.id ?>" method="POST" style="margin: 0;">
          <input type="hidden" name="_method" value="DELETE" />
          <button type="submit" style="background: none; border: none; color: #666; cursor: pointer; font-size: 16px;">✕</button>
        </form>
      </div>
    <? } ?>
    <p style="text-align: center; color: #555; font-size: 12px; margin-top: 16px;">
      <?= total ?> total · <?= activeCount ?> active · <?= total - activeCount ?> completed
    </p>
  <? } else { ?>
    <div style="text-align: center; padding: 60px 0; color: #666;">
      <p style="font-size: 48px; margin-bottom: 16px;">📭</p>
      <p>No todos yet. Add one above!</p>
    </div>
  <? } ?>
</div>
