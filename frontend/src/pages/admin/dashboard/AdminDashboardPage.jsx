import AdminDevelopmentPage from "../AdminDevelopmentPage";
import { ADMIN_SECTIONS } from "../adminSections";

export default function AdminDashboardPage() {
  return <AdminDevelopmentPage section={ADMIN_SECTIONS.dashboard} />;
}
