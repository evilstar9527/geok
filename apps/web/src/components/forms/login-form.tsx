"use client";

import {
	AuthFormChrome,
	formFieldClassName,
	formLabelClassName,
	formPrimaryButtonClassName,
} from "@/components/forms/auth-form-chrome";
import { PasswordField } from "@/components/forms/password-field";
import { authClient } from "@/lib/auth/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	Button,
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	Input,
	toast,
	useForm,
} from "@oneglanse/ui";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

const formSchema = z.object({
	account: z.string().min(3, "账号至少需要 3 个字符"),
	password: z.string().min(8, "密码至少需要 8 个字符"),
});

export function LoginForm({
	className,
	...props
}: React.ComponentProps<"div"> & { showGoogle?: boolean }) {
	const [isLoading, setIsLoading] = useState(false);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: { account: "", password: "" },
	});

	async function onSubmit(values: z.infer<typeof formSchema>) {
		setIsLoading(true);
		const result = values.account.includes("@")
			? await authClient.signIn.email({
					email: values.account,
					password: values.password,
				})
			: await authClient.signIn.username({
					username: values.account,
					password: values.password,
				});
		const { error } = result;
		if (error) {
			toast.error(
				error.status === 403 ? "该账号当前无法登录" : "账号或密码不正确",
			);
			setIsLoading(false);
			return;
		}
		window.location.href = "/";
	}

	return (
		<AuthFormChrome
			title="账号登录"
			description="登录 GEO见客"
			className={className}
			{...props}
		>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
					<div className="grid gap-4">
						<FormField
							control={form.control}
							name="account"
							render={({ field }) => (
								<FormItem>
									<FormLabel className={formLabelClassName}>账号</FormLabel>
									<FormControl>
										<Input
											autoComplete="username"
											placeholder="请输入账号"
											className={formFieldClassName}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<PasswordField control={form.control} name="password" />
						<Button
							type="submit"
							className={formPrimaryButtonClassName}
							disabled={isLoading}
						>
							{isLoading ? <Loader2 className="size-4 animate-spin" /> : "登录"}
						</Button>
					</div>
				</form>
			</Form>
		</AuthFormChrome>
	);
}
