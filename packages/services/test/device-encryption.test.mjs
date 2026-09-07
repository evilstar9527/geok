import assert from "node:assert/strict";
import test from "node:test";

process.env.DEVICE_CONFIG_ENCRYPTION_KEY =
	"test-only-device-key-at-least-32-bytes";
const { encryptDeviceConfig, decryptDeviceConfig } = await import(
	"../dist/device/encryption.js"
);

test("encrypts and decrypts the complete remote Appium configuration", () => {
	const config = {
		appiumUrl: "https://cloud.example.test/wd/hub",
		headers: { Authorization: "Bearer secret-token" },
		capabilities: { "appium:udid": "cloud-device-1" },
	};
	const encrypted = encryptDeviceConfig(config);
	assert.equal(encrypted.includes("secret-token"), false);
	assert.equal(encrypted.includes(config.appiumUrl), false);
	assert.deepEqual(decryptDeviceConfig(encrypted), config);
});

test("rejects tampered ciphertext", () => {
	const encrypted = encryptDeviceConfig({ appiumUrl: "https://example.test" });
	assert.throws(() => decryptDeviceConfig(`${encrypted.slice(0, -2)}xx`));
});
