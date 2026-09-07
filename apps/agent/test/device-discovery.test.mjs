import assert from "node:assert/strict";
import test from "node:test";
import { parseAdbDevicesOutput } from "../dist/mobile/discovery.js";

test("parses connected, offline and unauthorized ADB devices", () => {
	const devices = parseAdbDevicesOutput(`List of devices attached
serial-ready device product:test model:Pixel_9
serial-offline offline
serial-auth unauthorized usb:1-1
`);
	assert.deepEqual(devices, [
		{ serial: "serial-ready", status: "device" },
		{ serial: "serial-offline", status: "offline" },
		{ serial: "serial-auth", status: "unauthorized" },
	]);
});
