import { ws } from "bunigniter/helpers/ws";

ws.handle("/ws/chat", {
	message(wsInstance, data: any) {
		const parsed = typeof data === "string" ? JSON.parse(data) : data;
		// Broadcast message to all connected clients in the channel room
		wsInstance.publish(
			parsed.channel_id ? `channel:${parsed.channel_id}` : "chat",
			JSON.stringify(parsed),
		);
	},
	open(wsInstance) {
		// Extract channel_id from query params (set by client on connect)
		const url = new URL(wsInstance.data?.url ?? "http://localhost/");
		const channelId = url.searchParams.get("channel_id");
		if (channelId) {
			wsInstance.subscribe(`channel:${channelId}`);
		}
	},
});
