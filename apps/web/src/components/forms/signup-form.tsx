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
	account: z
		.string()
		.min(3, "账号至少需要 3 个字符")
		.max(32, "账号最多 32 个字符")
		.regex(/^[a-zA-Z0-9_.-]+$/, "账号只能包含字母、数字、点、下划线或短横线"),
	password: z.string().min(8, "密码至少需要 8 个字符"),
	brandName: z.string().min(2, "品牌名至少需要 2 个字符").max(80),
});

export function SignupForm({
	className,
	...props
}: React.ComponentProps<"div"> & { showGoogle?: boolean }) {
	const [isLoading, setIsLoading] = useState(false);
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: { account: "", password: "", brandName: "" },
	});

	async function onSubmit(values: z.infer<typeof formSchema>) {
		setIsLoading(true);
		const accountKey = btoa(values.account.toLowerCase())
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=+$/g, "");
		const { error } = await authClient.signUp.email({
			email: `geo-${accountKey}@geo.local`,
			password: values.password,
			name: values.brandName,
			username: values.account,
			displayUsername: values.account,
		});
		if (error) {
			toast.error(
				error.message?.toLowerCase().includes("already")
					? "该账号已经存在，请更换账号"
					: "注册失败，请检查填写内容后重试",
			);
			setIsLoading(false);
			return;
		}
		window.location.href = "/login?registered=1";
	}

	return (
		<AuthFormChrome
			title="注册品牌账号"
			description="只需填写账号、密码和品牌名"
			switchText="已有管理员账号？"
			switchLabel="返回登录"
			switchHref="/login"
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
						<PasswordField
							control={form.control}
							name="password"
							autoComplete="new-password"
						/>
						<FormField
							control={form.control}
							name="brandName"
							render={({ field }) => (
								<FormItem>
									<FormLabel className={formLabelClassName}>品牌名</FormLabel>
									<FormControl>
										<Input
											placeholder="请输入品牌名"
											className={formFieldClassName}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<Button
							type="submit"
							className={formPrimaryButtonClassName}
							disabled={isLoading}
						>
							{isLoading ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								"提交注册"
							)}
						</Button>
					</div>
				</form>
			</Form>
		</AuthFormChrome>
	);
}
