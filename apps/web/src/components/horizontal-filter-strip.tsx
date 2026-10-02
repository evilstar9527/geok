"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

export function HorizontalFilterStrip({ children }: { children: ReactNode }) {
	const viewport = useRef<HTMLDivElement>(null);
	const content = useRef<HTMLDivElement>(null);
	const [edges, setEdges] = useState({ left: false, right: false });

	useEffect(() => {
		const element = viewport.current;
		if (!element) return;
		const update = () => {
			const left = element.scrollLeft > 1;
			const right =
				element.scrollWidth - element.clientWidth - element.scrollLeft > 1;
			setEdges((previous) =>
				previous.left === left && previous.right === right
					? previous
					: { left, right },
			);
		};
		const observer = new ResizeObserver(update);
		observer.observe(element);
		if (content.current) observer.observe(content.current);
		element.addEventListener("scroll", update, { passive: true });
		update();
		return () => {
			observer.disconnect();
			element.removeEventListener("scroll", update);
		};
	}, []);

	return (
		<div
			ref={viewport}
			className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
			style={{
				maskImage: `linear-gradient(to right, ${edges.left ? "transparent" : "black"}, black 20px, black calc(100% - 20px), ${edges.right ? "transparent" : "black"})`,
			}}
		>
			<div
				ref={content}
				className="flex w-max items-center gap-2 px-1 py-1 [&>*]:shrink-0 [&>*]:whitespace-nowrap"
			>
				{children}
			</div>
		</div>
	);
}
