import { redirect } from "next/navigation";

// QA moved into the Settings page (QA tab). Keep this route as a
// redirect so existing bookmarks and links keep working.
export default function QAPage() {
  redirect("/settings");
}
