/**
 * echarts ships its public types as bundled barrels under `echarts/types/dist/`,
 * but the root `core.d.ts` / `charts.d.ts` shims re-export them with
 * extensionless relative paths, which `moduleResolution: NodeNext` cannot
 * resolve — the subpath then appears to export nothing. Re-point each subpath at
 * the barrel that actually carries the declarations.
 */
declare module "echarts/core" {
	export * from "echarts/types/dist/core";
}

declare module "echarts/charts" {
	export * from "echarts/types/dist/charts";
}

declare module "echarts/components" {
	export * from "echarts/types/dist/components";
}

declare module "echarts/renderers" {
	export * from "echarts/types/dist/renderers";
}
