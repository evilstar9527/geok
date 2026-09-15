import { DOCS_URL } from "@/lib/site";
import { redirect } from "next/navigation";

export default function DocsForwarder(): never {
	redirect(DOCS_URL);
}
