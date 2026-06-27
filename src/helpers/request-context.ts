/**
 * Request Context — global holder for current request context.
 * Used by DbClient to log SQL queries to the debug toolbar.
 */
let currentCtx: any = null

export function setRequestContext(ctx: any): void {
	currentCtx = ctx
}

export function getRequestContext(): any {
	return currentCtx
}
