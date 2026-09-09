import "server-only";

import {
	createCipheriv,
	createDecipheriv,
	createHash,
	randomBytes,
} from "node:crypto";
import { env } from "@/env";

const VERSION = "v1";

function encryptionKey() {
	if (!env.BETTER_AUTH_SECRET) {
		throw new Error(
			"BETTER_AUTH_SECRET is required to store managed passwords.",
		);
	}

	return createHash("sha256")
		.update(`oneglanse-managed-password:${env.BETTER_AUTH_SECRET}`)
		.digest();
}

export function encryptManagedPassword(password: string) {
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
	const ciphertext = Buffer.concat([
		cipher.update(password, "utf8"),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();

	return [VERSION, iv, tag, ciphertext]
		.map((part) =>
			typeof part === "string" ? part : part.toString("base64url"),
		)
		.join(".");
}

export function decryptManagedPassword(value: string) {
	const [version, ivText, tagText, ciphertextText] = value.split(".");
	if (version !== VERSION || !ivText || !tagText || !ciphertextText) {
		throw new Error("Invalid managed password payload.");
	}

	const decipher = createDecipheriv(
		"aes-256-gcm",
		encryptionKey(),
		Buffer.from(ivText, "base64url"),
	);
	decipher.setAuthTag(Buffer.from(tagText, "base64url"));

	return Buffer.concat([
		decipher.update(Buffer.from(ciphertextText, "base64url")),
		decipher.final(),
	]).toString("utf8");
}
