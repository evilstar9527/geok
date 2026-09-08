"use client";

import {
	formFieldClassName,
	formLabelClassName,
} from "@/components/forms/auth-form-chrome";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	Input,
} from "@oneglanse/ui";
import type { Control, FieldValues, Path } from "react-hook-form";

type PasswordFieldProps<T extends FieldValues> = {
	control: Control<T>;
	name: Path<T>;
	forgotHref?: string;
	autoComplete?: string;
	showForgotPassword?: boolean;
};

export function PasswordField<T extends FieldValues>({
	control,
	name,
	forgotHref = "/forgot-password",
	autoComplete = "current-password",
	showForgotPassword = false,
}: PasswordFieldProps<T>): React.JSX.Element {
	return (
		<div className="grid gap-2.5">
			<div className="flex flex-col gap-1.5">
				<FormField
					control={control}
					name={name}
					render={({ field }) => (
						<FormItem>
							<FormLabel className={formLabelClassName}>密码</FormLabel>
							<FormControl>
								<Input
									type="password"
									autoComplete={autoComplete}
									placeholder="请输入密码"
									className={formFieldClassName}
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				{showForgotPassword ? (
					<a
						href={forgotHref}
						className="ml-auto font-medium text-muted-foreground text-xs transition-colors hover:text-foreground"
					>
						忘记密码？
					</a>
				) : null}
			</div>
		</div>
	);
}
