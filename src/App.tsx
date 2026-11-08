import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import LibraryPage from "./pages/LibraryPage";
import PracticePage from "./pages/PracticePage";
import AnalyticsPage from "./pages/AnalyticsPage";
import PassagePage from "./pages/PassagePage";
import SearchPage from "./pages/SearchPage";
import DifficultPage from "./pages/DifficultPage";
import SettingsPage from "./pages/SettingsPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";
import CoverTemplatesPage from "./pages/CoverTemplatesPage";
import { AuthGate } from "./pages/SignInPage";

/**
 * Hash routes:
 *   #/                                Home dashboard
 *   #/library?book=21&test=3&p=1      Library with filters (saved in the URL)
 *   #/practice/flashcards|quiz?...    Build a deck from filters
 *   #/difficult/:mode?                Starred words
 *   #/progress  #/search  #/settings  #/admin (admin only)
 *   #/21-T3-P1/list|flashcards|quiz   Passage view
 */
export default function App() {
  return (
    <AuthGate>
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="practice/:mode?" element={<PracticePage />} />
        <Route path="progress" element={<AnalyticsPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="difficult/:mode?" element={<DifficultPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="cover-templates" element={<CoverTemplatesPage />} />
        <Route path=":slug/:mode?" element={<PassagePage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </AuthGate>
  );
}
