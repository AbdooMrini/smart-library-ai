import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { useAuth } from "./context/AuthContext";
import Home from "./pages/Home";
import LibraryPage from "./pages/Library";
import BookDetail from "./pages/BookDetail";
import AuthPage from "./pages/AuthPage";
import Ranking from "./pages/Ranking";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import AdminImportBooks from "./pages/AdminImportBooks";
import { AdminContent, AdminDashboard, AdminLayout, AdminModeration, AdminUsers } from "./pages/Admin";
import { Loader } from "./components/UI";
import PublicProfile from "./pages/PublicProfile";
import ErrorBoundary from "./components/ErrorBoundary";
import Messages from "./pages/Messages";
import Notifications from "./pages/Notifications";

function Guard({ children, admin = false }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}
export default function App() {
  return <Routes><Route element={<Layout/>}>
    <Route index element={<Home/>}/>
    <Route path="books" element={<LibraryPage/>}/>
    <Route path="books/:id" element={<BookDetail/>}/>
    <Route path="ranking" element={<Ranking/>}/>
    <Route path="chat" element={<ErrorBoundary><Chat/></ErrorBoundary>}/>
    <Route path="users/:id" element={<ErrorBoundary><PublicProfile/></ErrorBoundary>}/>
    <Route path="messages" element={<Guard><Messages/></Guard>}/>
    <Route path="notifications" element={<Guard><Notifications/></Guard>}/>
    <Route path="login" element={<AuthPage/>}/>
    <Route path="register" element={<AuthPage/>}/>
    <Route path="favorites" element={<Guard><LibraryPage favorites/></Guard>}/>
    <Route path="profile" element={<Guard><Profile/></Guard>}/>
    <Route path="admin" element={<Guard admin><AdminLayout/></Guard>}>
      <Route index element={<AdminDashboard/>}/>
      <Route path="import" element={<ErrorBoundary><AdminImportBooks/></ErrorBoundary>}/>
      <Route path="users" element={<ErrorBoundary><AdminUsers/></ErrorBoundary>}/>
      <Route path="content" element={<ErrorBoundary><AdminContent/></ErrorBoundary>}/>
      <Route path="moderation" element={<ErrorBoundary><AdminModeration/></ErrorBoundary>}/>
    </Route>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Route></Routes>;
}
