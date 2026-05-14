import AdminDevelopmentPage from "../AdminDevelopmentPage";
import { ADMIN_SECTIONS } from "../adminSections";

export default function AdminSettingsPage() {
  return <AdminDevelopmentPage section={ADMIN_SECTIONS.settings} />;
}
