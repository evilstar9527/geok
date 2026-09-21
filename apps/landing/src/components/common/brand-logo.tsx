import { cn } from "@oneglanse/utils";

type BrandLogoProps = {
	alt?: string;
	className?: string;
	darkClassName?: string;
	lightClassName?: string;
};

export function BrandLogo({
	alt = "秘蜂赢客",
	className,
	darkClassName,
	lightClassName,
}: BrandLogoProps): React.JSX.Element {
	return (
		<>
			<img
				src="/logo.png?v=bee-yellow-20260921"
				alt={alt}
				className={cn("object-contain dark:hidden", className, lightClassName)}
			/>
			<img
				src="/logo-dark.png?v=bee-yellow-20260921"
				alt={alt}
				className={cn(
					"hidden object-contain dark:block",
					className,
					darkClassName,
				)}
			/>
		</>
	);
}
