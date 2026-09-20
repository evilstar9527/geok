import Home from "../components/Home";
import { fetchPublicReport } from "../lib/public-report.mjs";

export const metadata = { title: "见客 JianKe — AI 时代，先被看见，才有生意" };

export default async function Page() {
	return <Home report={await fetchPublicReport()} />;
}
