import Dashboard from './pages/Dashboard';
import Login from './pages/Login'
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import Tasks from './pages/Tasks';
import Graphistes from './pages/graphistes';
import Trash from './pages/Trash';
import Taskdetails from './pages/TaskDetails';
import ClientSpace from './pages/ClientSpace';
import Feedback from './pages/Feedback';
import { Toaster } from 'react-hot-toast';
import { useSelector } from 'react-redux';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import ChatWidget from './components/ChatWidget';

function Layout() {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();
  // If user is a client, restrict access to only client-space
  if (user) {
    const isClient = user?.role === 'client';
    const isClientSpace = location.pathname.startsWith('/client-space');
    if (isClient && !isClientSpace) {
      return (<Navigate to="/client-space" state={{ from: location }} replace />);
    }
  }
  return user ? (
    <div className='w-full h-screen flex flex-col md:flex-row bg-bloom-bg'>
      <div className='w-1/5 h-screen bg-bloom-white sticky top-0 hidden md:block shadow-lg shadow-bloom-pink/5'>
        <Sidebar />
      </div>
      <div className='flex-1 overflow-y-auto'>
        <Navbar />
        <div className='p-4 2xl:px-10'>
          <Outlet />
        </div>
        <ChatWidget />
      </div>
    </div>
  ) : (<Navigate to="/log-in" state={{ from: location }} replace />);
}

function App() {
  return (
    <main className="w-full min-h-screen bg-bloom-bg">
      <Routes>
        <Route element={<Layout />}>
          <Route index path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/completed/:status" element={<Tasks />} />
          <Route path="/in-progress/:status" element={<Tasks />} />
          <Route path="/todo/:status" element={<Tasks />} />
          <Route path="/team" element={<Graphistes />} />
          <Route path="/trashed" element={<Trash />} />
          <Route path="/task/:id" element={<Taskdetails />} />
          <Route path="/client-space" element={<ClientSpace />} />
          <Route path="/feedback" element={<Feedback />} />
        </Route>
        <Route path="/log-in" element={<Login />} />
      </Routes>
      <Toaster richColors />
    </main>
  )
}

export default App
