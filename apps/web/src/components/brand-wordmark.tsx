export function BrandWordmark({ className = "" }: { className?: string }) {
	return (
		<span
			className={`relative inline-block aspect-[1046/324] shrink-0 overflow-hidden ${className}`}
		>
			<img
				src="/brand-wordmark.png?v=20261002"
				alt="秘蜂赢客 BeelineGeo"
				width={2132}
				height={737}
				className="absolute left-[-52.3901%] top-[-7.7161%] h-auto w-[203.8241%] max-w-none dark:top-[-120.6790%]"
			/>
		</span>
	);
}
