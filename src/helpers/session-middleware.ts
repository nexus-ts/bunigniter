/**
 * Session middleware — makes session available in Elysia context.
 *
 * Usage:
 * ```ts
 * import { sessionMiddleware } from './helpers/session'
 * app.use(sessionMiddleware({ key: env('APP_KEY') }))
 * ```
 *
 * Then in a controller:
 * ```ts
 * this.session.set('user_id', 1)
 * const uid = this.session.get('user_id')
 * ```
 */
import { Elysia } from "elysia";
import { Session, type SessionConfig } from "./session";

/**
 * Create an Elysia plugin that injects session into the context.
 */
export function sessionMiddleware(config?: SessionConfig) {
	const app = new Elysia({ name: "nexus-session" });

	app.derive("global" as any, async ({ request, cookie: cookieJar }: any) => {
		const sessionConfig: SessionConfig = { ...config };
		const session = new Session(sessionConfig);
		const cookieName = sessionConfig.name ?? "nexus_session";

		// Load session from cookie
		const rawCookie =
			cookieJar?.[cookieName]?.value ??
			request.headers
				?.get("cookie")
				?.split(";")
				?.find((c: string) => c.trim().startsWith(cookieName + "="))
				?.split("=")[1];

		session.load(rawCookie);

		return { session };
	});

	// Save session cookie on response
	app.afterHandle(
		"global" as any,
		async ({ session: sess, cookie: cookieJar, set }: any) => {
			if (!sess) return;
			const serialized = sess.serialize();
			if (!serialized) return;

			const cookieName = sess.cookieName;
			if (cookieJar?.[cookieName]) {
				cookieJar[cookieName].value = serialized.value;
				cookieJar[cookieName].maxAge = serialized.maxAge;
				cookieJar[cookieName].path = serialized.options.path;
				cookieJar[cookieName].httpOnly = serialized.options.httpOnly;
				cookieJar[cookieName].secure = serialized.options.secure;
				cookieJar[cookieName].sameSite = serialized.options.sameSite;
			} else {
				// Fall back to set-cookie header
				set.headers ??= {};
				set.headers["Set-Cookie"] =
					`${cookieName}=${serialized.value}; Max-Age=${serialized.maxAge}; Path=${serialized.options.path}; HttpOnly; SameSite=${serialized.options.sameSite}`;
			}
		},
	);

	return app;
}

/**
 * Simple auth — stores user info in session.
 */
export function authMiddleware() {
	const app = new Elysia({ name: "nexus-auth" });

	app.derive("global" as any, async ({ session }: any) => {
		return {
			auth: {
				user: () => session?.get("user"),
				login: (user: any) => {
					session?.set("user", user);
					session?.regenerate();
				},
				logout: () => {
					session?.delete("user");
					session?.clear();
				},
				check: () => !!session?.get("user"),
			},
		};
	});

	return app;
}
