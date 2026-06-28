import { chromium } from "playwright";

const BASE = "http://localhost:3006";

async function main() {
	const browser = await chromium.launch();
	const page = await browser.newPage();

	// Test 1: Login page
	console.log("=== Test 1: Login page loads ===");
	await page.goto(BASE + "/login");
	const loginTitle = await page.title();
	console.log("Title:", loginTitle);
	if (!loginTitle.includes("Sign"))
		throw new Error("Login title should contain Sign");

	// Test 2: Login form
	console.log("\n=== Test 2: Login form ===");
	await page.fill("input[name=username]", "alice");
	await page.fill("input[name=password]", "password");
	await page.click("button[type=submit]");
	await page.waitForURL("**/channels");
	console.log("Redirected to:", page.url());
	if (!page.url().includes("/channels"))
		throw new Error("Should redirect to channels");

	// Test 3: Channels page
	console.log("\n=== Test 3: Channels page ===");
	const channelsTitle = await page.title();
	console.log("Title:", channelsTitle);
	if (!channelsTitle.includes("Channels"))
		throw new Error("Channels title should contain Channels");
	const channelLinks = await page.locator('a[href*="/channels/"]').count();
	console.log("Channel links:", channelLinks);
	if (channelLinks < 2) throw new Error("Should show multiple channels");

	// Test 4: Channel detail
	console.log("\n=== Test 4: Channel detail ===");
	await page.click('a[href="/channels/1"]');
	await page.waitForURL("**/channels/1");
	console.log("URL:", page.url());
	if (!page.url().includes("/channels/1"))
		throw new Error("Should be on channel 1");
	const pageContent = (await page.textContent("body")) || "";
	if (!pageContent.includes("Welcome"))
		throw new Error("Channel should show messages");

	// Test 5: Post message
	console.log("\n=== Test 5: Post message ===");
	await page.fill("input[name=content]", "Hello from Playwright!");
	await page.click('button:has-text("Send")');
	await page.waitForTimeout(1500);

	// Test 6: Profile page
	console.log("\n=== Test 6: Profile page ===");
	await page.goto(BASE + "/profile");
	const profileTitle = await page.title();
	console.log("Title:", profileTitle);
	if (!profileTitle.includes("Profile"))
		throw new Error("Should be on profile page");

	// Test 7: Display name
	console.log("\n=== Test 7: Display name update ===");
	const nameInput = await page.inputValue("input[name=display_name]");
	console.log("Current display name:", nameInput);

	// Test 8: Logout
	console.log("\n=== Test 8: Logout ===");
	await page.goto(BASE + "/logout");
	await page.waitForTimeout(500);

	// Verify channels redirects to login after logout
	await page.goto(BASE + "/channels");
	await page.waitForTimeout(500);
	console.log("Channels after logout:", page.url());
	if (!page.url().includes("/login"))
		throw new Error("Channels should redirect to login after logout");

	// Test 9: Register page
	console.log("\n=== Test 9: Register page ===");
	await page.goto(BASE + "/register");
	const regTitle = await page.title();
	console.log("Title:", regTitle);
	if (!regTitle.includes("Account"))
		throw new Error("Register page should show account creation");

	console.log("\n=== ALL TESTS PASSED ===");
	await browser.close();
	process.exit(0);
}

main().catch((err) => {
	console.error("Test failed:", err.message);
	process.exit(1);
});
