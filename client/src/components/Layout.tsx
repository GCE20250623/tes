import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupContent,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboardIcon,
  DatabaseIcon,
  AlertTriangleIcon,
  FileTextIcon,
  UploadIcon,
  UserIcon,
  LogOutIcon,
  ChevronUpIcon,
  ActivityIcon,
} from 'lucide-react';
import { useCurrentUserProfile } from '@lark-apaas/client-toolkit/hooks/useCurrentUserProfile';
import { getDataloom } from '@lark-apaas/client-toolkit/dataloom';
import { useEffect } from 'react';

const navItems = [
  { path: '/', label: '数据仪表板', icon: LayoutDashboardIcon },
  { path: '/data', label: '测试数据', icon: DatabaseIcon },
  { path: '/analysis', label: '故障分析', icon: AlertTriangleIcon },
  { path: '/reports', label: '报告中心', icon: FileTextIcon },
  { path: '/import', label: '数据导入', icon: UploadIcon },
];

const LayoutContent = () => {
  const { pathname } = useLocation();
  const userInfo = useCurrentUserProfile();

  const handleLogout = async () => {
    const dataloom = await getDataloom();
    await dataloom.service.session.signOut();
    window.location.reload();
  };

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link to="/">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <ActivityIcon className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold">测试数据分析平台</span>
                    <span className="truncate text-xs text-muted-foreground">V41</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={pathname === item.path}>
                      <Link to={item.path}>
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton>
                    <UserIcon className="size-4" />
                    <span className="group-data-[collapsible=icon]:hidden">
                      {userInfo.name || '用户'}
                    </span>
                    <ChevronUpIcon className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width]">
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOutIcon className="mr-2 size-4" />
                    <span>退出登录</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <main className="relative flex-1 w-full min-w-0 px-6 py-8">
        <header className="flex items-center gap-2 mb-6">
          <SidebarTrigger />
        </header>
        <Outlet />
      </main>
    </>
  );
};

const Layout = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <LayoutContent />
      </div>
    </SidebarProvider>
  );
};

export default Layout;
