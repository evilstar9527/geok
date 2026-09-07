import {
	createCipheriv,
	createDecipheriv,
	createHash,
	randomBytes,
} from "node:crypto";
import { EnvError, ValidationError } from "@oneglanse/errors";
import type { DeviceConnectionSecret } from "@oneglanse/types";
import { env } from "../env.js";

const VERSION = "v1";

function key(): Buffer {
	if (!env.DEVICE_CONFIG_ENCRYPTION_KEY) {
		throw new EnvError(
			"DEVICE_CONFIG_ENCRYPTION_KEY",
			"Required before storing remote Appium credentials",
		);
	}
	return createHash("sha256").update(env.DEVICE_CONFIG_ENCRYPTION_KEY).digest();
}

export function encryptDeviceConfig(config: DeviceConnectionSecret): string {
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", key(), iv);
	const ciphertext = Buffer.concat([
		cipher.update(JSON.stringify(config), "utf8"),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();
	return [VERSION, iv, tag, ciphertext]
		.map((part) =>
			typeof part === "string" ? part : part.toString("base64url"),
		)
		.join(".");
}

export function decryptDeviceConfig(value: string): DeviceConnectionSecret {
	const [version, ivText, tagText, ciphertextText] = value.split(".");
	if (version !== VERSION || !ivText || !tagText || !ciphertextText) {
		throw new ValidationError("Invalid encrypted device configuration.");
	}
	const decipher = createDecipheriv(
		"aes-256-gcm",
		key(),
		Buffer.from(ivText, "base64url"),
	);
	decipher.setAuthTag(Buffer.from(tagText, "base64url"));
	const plaintext = Buffer.concat([
		decipher.update(Buffer.from(ciphertextText, "base64url")),
		decipher.final(),
	]).toString("utf8");
	return JSON.parse(plaintext) as DeviceConnectionSecret;
}
