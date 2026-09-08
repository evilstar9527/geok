import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
	return (
		<AuthPageShell subtitle="品牌生成式引擎优化管理平台">
			<LoginForm />
		</AuthPageShell>
	);
}
