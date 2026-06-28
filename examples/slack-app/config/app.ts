import { env } from "bunigniter/helpers/env";

export default {
	port: 3006,
	app: {
		key: env("APP_KEY", "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"),
	},
	db: {
		dialect: "bun-sqlite",
		connection: { filename: "examples/slack-app/db/slack.db" },
	},
};
