/**
 * Hello route — Void-style method exports.
 *
 * GET  /hello  → returns { message: "Hello!" }
 * POST /hello  → returns { body: <echoed body> }
 */
import { defineHandler } from '../src/helpers/handler'
import { z } from 'zod'

export const GET = defineHandler(async () => {
	return {
		message: 'Hello!',
		timestamp: Date.now(),
		routes: {
			hello: '/hello',
			users: '/api/users',
		},
	}
})

export const POST = defineHandler.withValidator({
	body: z.object({
		name: z.string().min(2),
		email: z.string().email().optional(),
	}),
})(async (_c, { body }) => {
	return {
		received: body,
		message: `Hello, ${body.name}!`,
	}
})
