import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { SignupForm } from "@/components/forms/signup-form";

export default function SignupPage() {
	return (
		<AuthPageShell subtitle="品牌生成式引擎优化管理平台">
			<SignupForm />
		</AuthPageShell>
	);
}
