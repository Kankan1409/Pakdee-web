"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { OverviewMetrics } from "@/components/dashboard/overview-metrics";
import { TodoToday } from "@/components/dashboard/todo-today";
import { RoomMatrix } from "@/components/dashboard/room-matrix";
import { ExecutiveDashboard } from "@/components/dashboard/executive-dashboard";
import { BranchSelectorView, BranchItem } from "@/components/branch/branch-selector-view";
import { RoomDetailModal } from "@/components/dashboard/room-detail-modal";
import { QuickMeterModal } from "@/components/meter/quick-meter-modal";
import { MeterSpreadsheetView } from "@/components/meters/meter-spreadsheet-view";
import { InvoicePreviewModal } from "@/components/invoice/invoice-preview-modal";
import { SuperAdminModal } from "@/components/admin/super-admin-modal";
import { ContractManagementView } from "@/components/contracts/contract-management-view";
import { DigitalLeases } from "@/components/leases/digital-leases";
import { RepairsManagementView } from "@/components/repairs/repairs-management-view";
import { AccountingExportView } from "@/components/accounting/accounting-export-view";
import { BranchSettingsView } from "@/components/settings/branch-settings-view";
import { BroadcastLineView } from "@/components/broadcast/broadcast-line-view";
import { AddTenantModal } from "@/components/tenants/add-tenant-modal";
import { AddRoomModal } from "@/components/rooms/add-room-modal";
import { DatabaseInspectorModal } from "@/components/admin/database-inspector-modal";
import { ConfirmModal, ConfirmVariant, ConfirmIconType } from "@/components/ui/confirm-modal";
import { DatabaseService } from "@/lib/database.service";
import { useAuth } from "@/lib/auth-context";
import { LoginView } from "@/components/auth/login-view";
import { PakdeeLogo } from "@/components/ui/pakdee-logo";
import {
  initialProperty,
  initialRooms,
  sampleInvoice,
  initialRepairs,
  initialContracts,
  initialExpenses,
  initialBranchSettings,
} from "@/lib/mock-data";
import {
  Room,
  RoomStatus,
  PlanType,
  Invoice,
  Tenant,
  Property,
  DailyBooking,
  RepairItem,
  ContractItem,
  ExpenseItem,
  BranchSettingsDetail,
  BroadcastItem,
} from "@/types/dormitory";
import { formatCurrency, formatDateThai } from "@/lib/utils";
import {
  RotateCcw,
  Calendar,
  Users,
  FileSignature,
  Receipt,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  Plus,
  Save,
  Send,
  Printer,
  CreditCard,
  Building,
  Phone,
  QrCode,
  Search,
  Check,
  RefreshCw,
  Download,
  FileText,
  Wrench,
  DoorOpen,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Clock,
  Eye,
  Database,
} from "lucide-react";

export default function HomePage() {
  const { currentUser, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>("room-grid");
  const [currentBuilding, setCurrentBuilding] = useState<string>("bldg-a");
  const [property, setProperty] = useState<Property>(initialProperty);
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [contracts, setContracts] = useState<ContractItem[]>(initialContracts);
  const [repairs, setRepairs] = useState<RepairItem[]>(initialRepairs);
  const [expenses, setExpenses] = useState<ExpenseItem[]>(initialExpenses);
  const [branchSettings, setBranchSettings] = useState<BranchSettingsDetail>(initialBranchSettings);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDbConnected, setIsDbConnected] = useState<boolean>(false);

  // Modals state
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [quickMeterRoomId, setQuickMeterRoomId] = useState<string | undefined>(undefined);
  const [isQuickMeterOpen, setIsQuickMeterOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isSuperAdminOpen, setIsSuperAdminOpen] = useState(false);
  const [isAddTenantOpen, setIsAddTenantOpen] = useState(false);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [isDbInspectorOpen, setIsDbInspectorOpen] = useState(false);
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [isLeaseModalOpen, setIsLeaseModalOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [selectedLeaseRoom, setSelectedLeaseRoom] = useState<Room | null>(null);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  // First screen on entry/login: Always open Branch Selector Screen
  const [isBranchSelectorOpen, setIsBranchSelectorOpen] = useState<boolean>(true);

  // Daily Bookings interactive state
  const [dailyBookings, setDailyBookings] = useState<DailyBooking[]>([]);

  // LINE OA Broadcast state
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);

  // Toast feedback state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" | "warning" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" | "warning" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Form states
  const [newTenantForm, setNewTenantForm] = useState({
    fullName: "",
    phone: "",
    idCard: "",
    emergencyContact: "",
    lineId: "",
    vehiclePlate: "",
    roomId: "",
  });

  const [newBookingForm, setNewBookingForm] = useState({
    roomNumber: "102",
    guestName: "",
    guestPhone: "",
    checkInDate: "2026-10-26",
    checkOutDate: "2026-10-27",
    nightlyRate: 650,
    depositAmount: 500,
  });

  const [settingsForm, setSettingsForm] = useState({
    name: "",
    address: "",
    phone: "",
    promptpayNumber: "",
    promptpayName: "",
    electricRate: 8,
    waterRate: 18,
  });

  // Checkout settlement state
  const [checkoutRoomId, setCheckoutRoomId] = useState<string>("");
  const [checkoutElecCurr, setCheckoutElecCurr] = useState<number>(0);
  const [checkoutWaterCurr, setCheckoutWaterCurr] = useState<number>(0);
  const [checkoutCleaningFee, setCheckoutCleaningFee] = useState<number>(500);
  const [checkoutDamageFee, setCheckoutDamageFee] = useState<number>(0);
  const [checkoutDepositAmount, setCheckoutDepositAmount] = useState<number>(8000);
  const [initialAddTenantRoomId, setInitialAddTenantRoomId] = useState<string | undefined>(undefined);

  // Global Styled Confirmation Modal State (No native popups)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmVariant;
    iconType?: ConfirmIconType;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  // Collapsible Sidebar State with localStorage persistence
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("pakdee_sidebar_collapsed") === "true";
    }
    return false;
  });

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("pakdee_sidebar_collapsed", String(next));
      }
      return next;
    });
  };

  const handleLogoutPrompt = () => {
    setConfirmDialog({
      isOpen: true,
      title: "ยืนยันการออกจากระบบ",
      description: "คุณต้องการออกจากระบบ PAKDEE หรือไม่? เซสชันการทำงานปัจจุบันของคุณจะถูกปิดลงอย่างปลอดภัย",
      confirmText: "ออกจากระบบ",
      cancelText: "ยกเลิก",
      variant: "danger",
      iconType: "logout",
      onConfirm: () => {
        logout();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        showToast("ออกจากระบบเรียบร้อยแล้ว", "info");
      },
    });
  };

  // 1. Fetch all data from database with multi-branch isolation
  const loadData = useCallback(async (targetPropertyId?: string) => {
    setIsLoading(true);
    function withTimeout<T>(p: Promise<T>, ms = 6000): Promise<T | null> {
      return Promise.race([
        p,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
      ]);
    }

    try {
      // Synchronize with Host Machine Database (/api/db) on user's computer
      await DatabaseService.init();

      const activeId =
        typeof targetPropertyId === "string" && targetPropertyId
          ? targetPropertyId
          : DatabaseService.getActivePropertyId();
      const [
        propData,
        roomsData,
        invsData,
        tenantsData,
        allProps,
        contractsData,
        repairsData,
        expensesData,
        branchSettingsData,
        dailyBookingsData,
        broadcastsData,
      ] = await Promise.all([
        withTimeout(DatabaseService.getProperty(activeId)),
        withTimeout(DatabaseService.getRooms(activeId)),
        withTimeout(DatabaseService.getInvoices(activeId)),
        withTimeout(DatabaseService.getTenants(activeId)),
        withTimeout(DatabaseService.getAllProperties()),
        withTimeout(DatabaseService.getContracts(activeId)),
        withTimeout(DatabaseService.getRepairs(activeId)),
        withTimeout(DatabaseService.getExpenses(activeId)),
        withTimeout(DatabaseService.getBranchSettings(null, activeId)),
        withTimeout(DatabaseService.getDailyBookings(activeId)),
        withTimeout(DatabaseService.getBroadcasts(activeId)),
      ]);

      if (allProps && allProps.length > 0) {
        setBranches(allProps);
      }
      if (dailyBookingsData) {
        // Coherence: รับประกันว่าห้องที่มีสถานะ "daily" ในผังห้องจะต้องมีรายการจองในปฏิทินเสมอ
        const dailyRooms = (roomsData || []).filter((r) => r.status === "daily");
        let synchronizedBookings = [...dailyBookingsData];
        dailyRooms.forEach((dr) => {
          const found = synchronizedBookings.some((b) => b.roomNumber === dr.roomNumber);
          if (!found) {
            const todayStr = new Date().toISOString().slice(0, 10);
            const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
            const autoBooking: DailyBooking = {
              id: `b-auto-${dr.roomNumber}-${Date.now()}`,
              propertyId: activeId,
              roomNumber: dr.roomNumber,
              guestName: dr.currentTenant?.fullName || "ผู้เข้าพักรายวัน",
              guestPhone: dr.currentTenant?.phone || "-",
              checkInDate: todayStr,
              checkInTime: "14:00",
              checkOutDate: tomorrowStr,
              checkOutTime: "12:00",
              nights: 1,
              dailyRate: dr.dailyRate || 650,
              totalRoomPrice: dr.dailyRate || 650,
              keyDeposit: 500,
              status: "checked_in",
            };
            synchronizedBookings = [autoBooking, ...synchronizedBookings];
            DatabaseService.addDailyBooking(autoBooking, activeId);
          }
        });
        setDailyBookings(synchronizedBookings);
      }
      if (broadcastsData) {
        setBroadcasts(broadcastsData);
      }

      if (propData) {
        const targetName = branchSettingsData?.branchName || propData.name;
        setProperty({
          ...propData,
          name: targetName,
        });
        setSettingsForm({
          name: targetName,
          address: branchSettingsData?.address || propData.address,
          phone: branchSettingsData?.phone || propData.phone,
          promptpayNumber: branchSettingsData?.promptpayNumber || propData.promptpayNumber,
          promptpayName: branchSettingsData?.promptpayName || propData.promptpayName,
          electricRate: branchSettingsData?.electricRate !== undefined ? Number(branchSettingsData.electricRate) : propData.electricRate,
          waterRate: branchSettingsData?.waterRate !== undefined ? Number(branchSettingsData.waterRate) : propData.waterRate,
        });
        setIsDbConnected(true);

        if (branchSettingsData) {
          const freshElectric = branchSettingsData.electricRate !== undefined ? Number(branchSettingsData.electricRate) : propData.electricRate;
          const freshWater = branchSettingsData.waterRate !== undefined ? Number(branchSettingsData.waterRate) : propData.waterRate;

          setBranchSettings({
            ...branchSettingsData,
            branchName: targetName,
            address: branchSettingsData.address || propData.address,
            phone: branchSettingsData.phone || propData.phone,
            promptpayNumber: branchSettingsData.promptpayNumber || propData.promptpayNumber,
            promptpayName: branchSettingsData.promptpayName || propData.promptpayName,
            electricRate: freshElectric,
            waterRate: freshWater,
          });

          setProperty((prev) => ({
            ...prev,
            id: propData.id,
            name: targetName,
            electricRate: freshElectric,
            waterRate: freshWater,
            promptpayNumber: branchSettingsData.promptpayNumber || prev.promptpayNumber,
            promptpayName: branchSettingsData.promptpayName || prev.promptpayName,
          }));
        }
      } else if (branchSettingsData) {
        setBranchSettings(branchSettingsData);
      }

      if (roomsData) {
        setRooms(roomsData);
        if (!checkoutRoomId && roomsData.length > 0) {
          const occ = roomsData.find((r) => r.status === "occupied" || r.status === "overdue");
          if (occ) {
            setCheckoutRoomId(occ.id);
            setCheckoutElecCurr(occ.currentElectricMeter + 20);
            setCheckoutWaterCurr(occ.currentWaterMeter + 3);
          }
        }
      }

      if (invsData) {
        setInvoices(invsData);
        if (invsData.length > 0) {
          setActiveInvoice(invsData[0]);
        } else {
          setActiveInvoice(null);
        }
      }

      if (tenantsData) {
        setTenants(tenantsData);
      }

      if (contractsData) {
        setContracts(contractsData);
      }

      if (repairsData) {
        setRepairs(repairsData);
      }

      if (expensesData) {
        setExpenses(expensesData);
      }
    } catch (err) {
      console.error("Error loading Supabase data:", err);
      showToast("เชื่อมต่อ Supabase ไม่สำเร็จ ใช้ข้อมูลแคชชั่วคราว", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Clean URL Routing & Dynamic Page Title Map (No ?tab= or ?view=)
  const ROUTE_CONFIG: Record<string, { path: string; title: string }> = {
    login: { path: "/login", title: "เข้าสู่ระบบ" },
    branches: { path: "/branches", title: "เลือกสาขาหอพัก" },
    dashboard: { path: "/dashboard", title: "แดชบอร์ดภาพรวม" },
    "room-grid": { path: "/rooms", title: "ผังสถานะห้องพักเรียลไทม์" },
    daily: { path: "/daily", title: "ปฏิทินจองห้องพักรายวัน" },
    meter: { path: "/meter", title: "ระบบจดมิเตอร์น้ำ-ไฟ" },
    invoices: { path: "/invoices", title: "ระบบใบแจ้งหนี้ & การชำระเงิน" },
    slips: { path: "/slips", title: "ระบบตรวจสลิปโอนเงิน" },
    receipts: { path: "/receipts", title: "ระบบออกใบเสร็จรับเงิน" },
    tenants: { path: "/tenants", title: "ทะเบียนผู้เช่าและเอกสาร" },
    "digital-leases": { path: "/digital-leases", title: "สัญญาเช่าดิจิทัล (เซ็นออนไลน์ E-Sign)" },
    leases: { path: "/contracts", title: "ระบบจัดการสัญญาเช่าเดิม" },
    checkout: { path: "/checkout", title: "ระบบสรุปย้ายออก & คืนเงินประกัน" },
    cleaning: { path: "/cleaning", title: "งานแม่บ้านทำความสะอาด" },
    repairs: { path: "/repairs", title: "ระบบแจ้งซ่อมบำรุงห้องพัก" },
    reports: { path: "/reports", title: "สรุปรายงาน & Export Excel" },
    broadcast: { path: "/broadcast", title: "บรอดแคสต์ LINE OA & แชร์ QR Code" },
    settings: { path: "/settings", title: "ตั้งค่าหอพัก & LINE OA" },
  };

  const parseRouteFromUrl = useCallback((pathname: string, search: string): { tab: string; isBranches: boolean } => {
    const clean = pathname.toLowerCase().replace(/\/$/, "");
    if (clean === "/login") {
      return { tab: "login", isBranches: false };
    }
    if (!clean || clean === "" || clean === "/branches") {
      return { tab: "branches", isBranches: true };
    }
    if (clean === "/rooms" || clean === "/room-grid") {
      return { tab: "room-grid", isBranches: false };
    }
    if (clean === "/digital-leases" || clean === "/esign") {
      return { tab: "digital-leases", isBranches: false };
    }
    if (clean === "/contracts" || clean === "/leases") {
      return { tab: "leases", isBranches: false };
    }

    for (const [key, conf] of Object.entries(ROUTE_CONFIG)) {
      if (conf.path === clean) {
        return { tab: key, isBranches: key === "branches" };
      }
    }

    // Fallback: support previous query params if accessed via old links
    const params = new URLSearchParams(search);
    const viewParam = params.get("view");
    const tabParam = params.get("tab");
    if (viewParam === "branches" || tabParam === "branches") {
      return { tab: "branches", isBranches: true };
    }
    if (tabParam && ROUTE_CONFIG[tabParam]) {
      return { tab: tabParam, isBranches: false };
    }

    return { tab: "branches", isBranches: true };
  }, []);

  // Navigation & Browser History Synchronization (Clean URLs & Dynamic Page Titles)
  const syncNavigation = useCallback(
    (tab: string, branchesOpen: boolean, push: boolean = true) => {
      setCurrentTab(tab);
      setIsBranchSelectorOpen(branchesOpen);

      if (typeof window !== "undefined") {
        const config = branchesOpen
          ? ROUTE_CONFIG["branches"]
          : ROUTE_CONFIG[tab] || ROUTE_CONFIG["room-grid"];
        const targetPath = config ? config.path : "/rooms";
        const pageTitle = config
          ? branchesOpen
            ? `${config.title} | พักดี (PAKDEE)`
            : `${config.title} · ${property.name || "พักดี"} | PAKDEE`
          : "พักดี (PAKDEE) - ระบบจัดการหอพัก";

        // Update document title dynamically in browser tab
        document.title = pageTitle;

        // Clean Path without query parameters
        const stateObj = { tab: branchesOpen ? "branches" : tab, isBranchSelectorOpen: branchesOpen };
        if (window.location.pathname !== targetPath || window.location.search) {
          if (push) {
            window.history.pushState(stateObj, "", targetPath);
          } else {
            window.history.replaceState(stateObj, "", targetPath);
          }
        }
      }
    },
    [property.name]
  );

  const handleTabChange = useCallback(
    (tab: string) => {
      syncNavigation(tab, false, true);
    },
    [syncNavigation]
  );

  const handleOpenBranchSelector = useCallback(async () => {
    const fresh = await DatabaseService.getAllProperties();
    setBranches(fresh);
    syncNavigation("branches", true, true);
  }, [syncNavigation]);

  const handleCloseBranchSelector = useCallback(() => {
    syncNavigation("room-grid", false, true);
  }, [syncNavigation]);

  // Listen to Browser Back / Forward buttons (PopState event) & Initial URL sync
  useEffect(() => {
    if (typeof window === "undefined") return;

    const initial = parseRouteFromUrl(window.location.pathname, window.location.search);
    setCurrentTab(initial.tab);
    setIsBranchSelectorOpen(initial.isBranches);

    const config = initial.isBranches
      ? ROUTE_CONFIG["branches"]
      : ROUTE_CONFIG[initial.tab] || ROUTE_CONFIG["room-grid"];
    const targetPath = config ? config.path : "/branches";

    document.title = initial.isBranches
      ? "เลือกสาขาหอพัก | พักดี (PAKDEE)"
      : `${config.title} · ${property.name || "พักดี"} | PAKDEE`;

    window.history.replaceState(
      { tab: initial.tab, isBranchSelectorOpen: initial.isBranches },
      "",
      targetPath
    );

    const handlePopState = (e: PopStateEvent) => {
      if (e.state && typeof e.state.isBranchSelectorOpen === "boolean") {
        setIsBranchSelectorOpen(e.state.isBranchSelectorOpen);
        if (e.state.tab) {
          setCurrentTab(e.state.tab);
          const currentConfig = e.state.isBranchSelectorOpen
            ? ROUTE_CONFIG["branches"]
            : ROUTE_CONFIG[e.state.tab] || ROUTE_CONFIG["room-grid"];
          if (currentConfig) {
            document.title = e.state.isBranchSelectorOpen
              ? "เลือกสาขาหอพัก | พักดี (PAKDEE)"
              : `${currentConfig.title} · ${property.name || "พักดี"} | PAKDEE`;
          }
        }
      } else {
        const route = parseRouteFromUrl(window.location.pathname, window.location.search);
        setIsBranchSelectorOpen(route.isBranches);
        setCurrentTab(route.tab);
        const popConfig = route.isBranches
          ? ROUTE_CONFIG["branches"]
          : ROUTE_CONFIG[route.tab] || ROUTE_CONFIG["room-grid"];
        if (popConfig) {
          document.title = route.isBranches
            ? "เลือกสาขาหอพัก | พักดี (PAKDEE)"
            : `${popConfig.title} · ${property.name || "พักดี"} | PAKDEE`;
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [parseRouteFromUrl, property.name]);

  // Handler: Add room (supports both single room & batch loop from AddRoomModal)
  const handleAddRoom = async (roomData: {
    roomNumber: string;
    floor: number;
    type: string;
    monthlyRate: number;
    dailyRate?: number;
    status: RoomStatus;
  }) => {
    // Enforce Starter limits: 1 building / max 30 rooms
    if (property.plan === "starter" && rooms.length >= 30) {
      setConfirmDialog({
        isOpen: true,
        title: "ครบขีดจำกัด 30 ห้องของแพ็กเกจ Starter",
        description: `แพ็กเกจ Starter ออกแบบมาสำหรับหอพักขนาดเริ่มต้นสูงสุด 30 ห้อง (ปัจจุบันมี ${rooms.length} ห้องแล้ว) หากต้องการเพิ่มห้องพักไม่จำกัด พร้อมฟีเจอร์ส่งบิลทาง LINE อัตโนมัติ กรุณาอัปเกรดเป็นแพ็กเกจ Pro`,
        confirmText: "อัปเกรดเป็น Pro",
        cancelText: "เข้าใจแล้ว",
        variant: "warning",
        iconType: "question",
        onConfirm: () => {
          handleChangePlan("pro");
        },
      });
      return;
    }

    try {
      const created = await DatabaseService.addRoom({
        ...roomData,
        propertyId: property.id,
      });
      if (created) {
        setRooms((prev) => {
          const exists = prev.some((r) => r.id === created.id || r.roomNumber === created.roomNumber);
          if (exists) {
            return prev.map((r) => (r.roomNumber === created.roomNumber ? created : r));
          }
          return [...prev, created];
        });
        const freshProps = await DatabaseService.getAllProperties();
        setBranches(freshProps);
        showToast(`เพิ่มห้อง ${created.roomNumber} เรียบร้อยแล้ว`, "success");
      } else {
        const localRoom: Room = {
          id: `room-${Date.now()}-${roomData.roomNumber}`,
          buildingId: "e576ac84-d60f-4d4b-a301-eb2ba7dcca5d",
          roomNumber: roomData.roomNumber,
          floor: roomData.floor,
          type: roomData.type,
          rentalType: "monthly",
          monthlyRate: roomData.monthlyRate,
          dailyRate: roomData.dailyRate || 650,
          status: roomData.status || "vacant",
          currentElectricMeter: 0,
          currentWaterMeter: 0,
          lastBillPaid: true,
          notes: "",
        };
        setRooms((prev) => [...prev, localRoom]);
        const freshProps = await DatabaseService.getAllProperties();
        setBranches(freshProps);
        showToast(`เพิ่มห้อง ${localRoom.roomNumber} เรียบร้อยแล้ว`, "success");
      }
    } catch (err) {
      console.error("Error adding room:", err);
      showToast("เกิดข้อผิดพลาดในการเพิ่มห้อง", "error");
    }
  };

  // Handler: Delete room
  const handleDeleteRoom = (roomId: string) => {
    const target = rooms.find((r) => r.id === roomId);
    setConfirmDialog({
      isOpen: true,
      title: `ยืนยันการลบห้องพัก ${target?.roomNumber || ""}`,
      description: target
        ? `คุณแน่ใจหรือไม่ว่าต้องการลบห้อง "${target.roomNumber}" ออกจากระบบ? ข้อมูลประวัติมิเตอร์และบิลของห้องนี้จะถูกลบทั้งหมด`
        : "คุณแน่ใจหรือไม่ว่าต้องการลบห้องนี้?",
      confirmText: "ลบห้องพัก",
      cancelText: "ยกเลิก",
      variant: "danger",
      iconType: "delete",
      onConfirm: async () => {
        try {
          setRooms((prev) => prev.filter((r) => r.id !== roomId));
          if (selectedRoom?.id === roomId) {
            setSelectedRoom(null);
          }
          const success = await DatabaseService.deleteRoom(roomId);
          const freshProps = await DatabaseService.getAllProperties();
          setBranches(freshProps);
          if (success) {
            showToast(`ลบห้อง ${target?.roomNumber || ""} เรียบร้อยแล้ว`, "success");
          } else {
            showToast("เกิดข้อผิดพลาดในการลบห้องจากฐานข้อมูล", "error");
          }
        } catch (err) {
          console.error("Error deleting room:", err);
          showToast("เกิดข้อผิดพลาดในการลบห้อง", "error");
        }
      },
    });
  };

  // Handler: Batch delete rooms (ลบหลายห้องพร้อมกัน)
  const handleDeleteRooms = (roomIds: string[]) => {
    setConfirmDialog({
      isOpen: true,
      title: `ยืนยันการลบ ${roomIds.length} ห้องที่เลือก`,
      description: `คุณต้องการลบห้องพักจำนวน ${roomIds.length} ห้องที่เลือกออกจากระบบใช่หรือไม่? ข้อมูลของทุกห้องที่เลือกจะถูกลบถาวร`,
      confirmText: `ลบทั้ง ${roomIds.length} ห้อง`,
      cancelText: "ยกเลิก",
      variant: "danger",
      iconType: "delete",
      onConfirm: async () => {
        try {
          setRooms((prev) => prev.filter((r) => !roomIds.includes(r.id)));
          if (selectedRoom && roomIds.includes(selectedRoom.id)) {
            setSelectedRoom(null);
          }
          const success = await DatabaseService.deleteRooms(roomIds);
          const freshProps = await DatabaseService.getAllProperties();
          setBranches(freshProps);
          if (success) {
            showToast(`ลบห้องพักจำนวน ${roomIds.length} ห้องเรียบร้อยแล้ว`, "success");
          } else {
            showToast("เกิดข้อผิดพลาดในการลบห้องพักจากฐานข้อมูล", "error");
          }
        } catch (err) {
          console.error("Error batch deleting rooms:", err);
          showToast("เกิดข้อผิดพลาดในการลบห้องพัก", "error");
        }
      },
    });
  };

  // Handler: Delete branch (ลบสาขา)
  const handleDeleteBranch = async (branchId: string): Promise<boolean> => {
    const target = branches.find((b) => b.id === branchId);
    const branchName = target ? target.name : "สาขานี้";

    return new Promise((resolve) => {
      setConfirmDialog({
        isOpen: true,
        title: `ยืนยันการลบสาขา "${branchName}"`,
        description: `คุณแน่ใจหรือไม่ว่าต้องการลบสาขา "${branchName}" และข้อมูลทั้งหมดของสาขานี้ออกจากระบบ? การกระทำนี้ไม่สามารถย้อนกลับได้`,
        confirmText: "ลบสาขา",
        cancelText: "ยกเลิก",
        variant: "danger",
        iconType: "delete",
        onConfirm: async () => {
          try {
            showToast(`กำลังลบสาขา "${branchName}"...`, "info");
            const success = await DatabaseService.deleteBranch(branchId);
            if (success) {
              const refreshed = await DatabaseService.getAllProperties();
              setBranches(refreshed);
              showToast(`ลบสาขา "${branchName}" เรียบร้อยแล้ว`, "success");
              if (property.id === branchId) {
                if (refreshed.length > 0) {
                  await handleSelectBranch(refreshed[0]);
                }
              }
              resolve(true);
            } else {
              showToast("เกิดข้อผิดพลาดในการลบสาขา", "error");
              resolve(false);
            }
          } catch (err) {
            console.error("Error deleting branch:", err);
            showToast("เกิดข้อผิดพลาดในการลบสาขา", "error");
            resolve(false);
          }
        },
      });
    });
  };

  // Handler: Quick generate standard 24 rooms (Clean 1-click test setup)
  const handleQuickGenerateStandardRooms = async () => {
    try {
      showToast("กำลังสร้างผังห้อง 24 ห้องมาตรฐาน...", "info");
      const created = await DatabaseService.createStandardRooms();
      if (created.length > 0) {
        setRooms(created);
        showToast("สร้างผังห้อง 24 ห้องมาตรฐานเรียบร้อยแล้ว!", "success");
      } else {
        await loadData();
        showToast("รีเฟรชผังห้องเรียบร้อยแล้ว", "success");
      }
    } catch (err) {
      console.error("Error generating standard rooms:", err);
      showToast("เกิดข้อผิดพลาดในการสร้างผังห้อง", "error");
    }
  };

  // Handler: Clear all data (Reset completely for fresh testing)
  const handleClearAllData = async () => {
    setConfirmDialog({
      isOpen: true,
      title: "ยืนยันการรีเซ็ตระบบ (Clean Slate)",
      description: "คำเตือน: คุณต้องการล้างข้อมูลห้องพัก ผู้เช่า และใบแจ้งหนี้ทั้งหมดเพื่อเริ่มทดสอบใหม่ใช่หรือไม่? การกระทำนี้จะล้างข้อมูลในฐานข้อมูล Dev",
      confirmText: "ล้างข้อมูลทั้งหมด",
      cancelText: "ยกเลิก",
      variant: "danger",
      iconType: "reset",
      onConfirm: async () => {
        try {
          showToast("กำลังล้างข้อมูลทั้งหมด...", "info");
          const success = await DatabaseService.clearAllData();
          if (success) {
            setRooms([]);
            setTenants([]);
            setInvoices([]);
            setContracts([]);
            setRepairs([]);
            setExpenses([]);
            setDailyBookings([]);
            setSelectedRoom(null);
            setActiveInvoice(null);
            showToast("เคลียร์ข้อมูลทั้งหมดสู่ Clean Slate เรียบร้อยแล้ว", "success");
          }
        } catch (err) {
          console.error("Error clearing data:", err);
          showToast("เกิดข้อผิดพลาดในการเคลียร์ข้อมูล", "error");
        }
      },
    });
  };

  // Handler: Export local database to JSON file
  const handleExportBackup = () => {
    try {
      const json = DatabaseService.exportDatabaseToJson();
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pakdee_local_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("ดาวน์โหลดไฟล์สำรองข้อมูล JSON เรียบร้อยแล้ว", "success");
    } catch (err) {
      console.error("Error exporting backup:", err);
      showToast("เกิดข้อผิดพลาดในการสำรองข้อมูล", "error");
    }
  };

  // Handler: Update room status
  const handleUpdateStatus = async (roomId: string, newStatus: RoomStatus) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id === roomId) {
          if (newStatus === "vacant" || newStatus === "cleaning") {
            return { ...r, status: newStatus, currentTenant: undefined, leaseEndDate: undefined };
          }
          return { ...r, status: newStatus };
        }
        return r;
      })
    );
    if (selectedRoom && selectedRoom.id === roomId) {
      setSelectedRoom((prev) =>
        prev
          ? {
              ...prev,
              status: newStatus,
              currentTenant: newStatus === "vacant" || newStatus === "cleaning" ? undefined : prev.currentTenant,
              leaseEndDate: newStatus === "vacant" || newStatus === "cleaning" ? undefined : prev.leaseEndDate,
            }
          : null
      );
    }

    const success = await DatabaseService.updateRoomStatus(roomId, newStatus);
    const freshProps = await DatabaseService.getAllProperties();
    setBranches(freshProps);
    if (success) {
      showToast(`อัปเดตสถานะห้องเป็น "${newStatus}" เรียบร้อยแล้ว`, "success");
    } else {
      showToast("เกิดข้อผิดพลาดในการบันทึกสถานะห้องพัก", "error");
    }
  };

  // Handler: Save meter reading
  const handleSaveReading = async (
    roomId: string,
    electricCurr: number,
    waterCurr: number
  ) => {
    const targetRoom = rooms.find((r) => r.id === roomId);
    const electricPrev = targetRoom?.currentElectricMeter || 0;
    const waterPrev = targetRoom?.currentWaterMeter || 0;

    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? {
              ...r,
              currentElectricMeter: electricCurr,
              currentWaterMeter: waterCurr,
            }
          : r
      )
    );

    const success = await DatabaseService.saveMeterReading(
      roomId,
      electricCurr,
      waterCurr,
      electricPrev,
      waterPrev
    );

    if (success) {
      showToast(`บันทึกมิเตอร์ห้อง ${targetRoom?.roomNumber || ""} เรียบร้อยแล้ว`, "success");
    } else {
      showToast("เกิดข้อผิดพลาดในการบันทึกมิเตอร์", "error");
    }
  };

  // Handler: Batch Save Meters (จาก Spreadsheet Fast Entry)
  const handleSaveMetersBatch = async (
    readings: {
      roomId: string;
      roomNumber: string;
      electricCurr: number;
      waterCurr: number;
      electricPrev: number;
      waterPrev: number;
    }[]
  ) => {
    try {
      showToast("กำลังบันทึกเลขมิเตอร์ทั้งหมด...", "info");
      for (const r of readings) {
        await DatabaseService.saveMeterReading(
          r.roomId,
          r.electricCurr,
          r.waterCurr,
          r.electricPrev,
          r.waterPrev
        );
      }
      setRooms((prev) =>
        prev.map((room) => {
          const match = readings.find((rd) => rd.roomId === room.id);
          if (match) {
            return {
              ...room,
              currentElectricMeter: match.electricCurr,
              currentWaterMeter: match.waterCurr,
            };
          }
          return room;
        })
      );
      showToast(`บันทึกเลขมิเตอร์สำเร็จทั้ง ${readings.length} ห้องเรียบร้อยแล้ว ✓`, "success");
    } catch (err) {
      console.error("Error saving meter readings:", err);
      showToast("เกิดข้อผิดพลาดในการบันทึกมิเตอร์", "error");
    }
  };

  // Handler: Generate Monthly Invoices (Auto-Billing)
  const handleGenerateMonthlyInvoices = async () => {
    const activeRooms = rooms.filter(
      (r) => r.status === "occupied" || r.status === "overdue"
    );

    if (activeRooms.length === 0) {
      showToast("ไม่พบห้องที่มีผู้เช่าพักอาศัยสำหรับออกบิล", "warning");
      return;
    }

    const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-10"
    let successCount = 0;

    for (const room of activeRooms) {
      // Pull actual meter reading if already recorded for this month
      const latestReading = await DatabaseService.getLatestMeterReading(room.id, currentMonth);
      const electricUnits = latestReading?.electric_units !== undefined ? latestReading.electric_units : 55;
      const waterUnits = latestReading?.water_units !== undefined ? latestReading.water_units : 7;
      const elecPrev = latestReading?.electric_prev !== undefined ? latestReading.electric_prev : room.currentElectricMeter;
      const elecCurr = latestReading?.electric_curr !== undefined ? latestReading.electric_curr : room.currentElectricMeter + electricUnits;
      const waterPrev = latestReading?.water_prev !== undefined ? latestReading.water_prev : room.currentWaterMeter;
      const waterCurr = latestReading?.water_curr !== undefined ? latestReading.water_curr : room.currentWaterMeter + waterUnits;

      const electricAmount = branchSettings.useMinElectric
        ? Math.max(branchSettings.minElectricFee, electricUnits * property.electricRate)
        : electricUnits * property.electricRate;
      const waterAmount = branchSettings.useMinWater
        ? Math.max(branchSettings.minWaterFee, waterUnits * property.waterRate)
        : waterUnits * property.waterRate;
      const commonFee = branchSettings.commonFee !== undefined ? branchSettings.commonFee : 300;
      const totalAmount = room.monthlyRate + electricAmount + waterAmount + commonFee;

      const items = [
        { name: `ค่าเช่าห้องพัก (ห้อง ${room.roomNumber})`, amount: room.monthlyRate },
        {
          name: `ค่าไฟ ${electricUnits} หน่วย (${elecPrev} - ${elecCurr})`,
          units: electricUnits,
          rate: property.electricRate,
          amount: electricAmount,
          meterPrev: elecPrev,
          meterCurr: elecCurr,
        },
        {
          name: `ค่าน้ำประปา ${waterUnits} หน่วย (${waterPrev} - ${waterCurr})`,
          units: waterUnits,
          rate: property.waterRate,
          amount: waterAmount,
          meterPrev: waterPrev,
          meterCurr: waterCurr,
        },
        { name: "ค่าส่วนกลางและขยะ", amount: commonFee },
      ];

      const ok = await DatabaseService.createInvoice({
        roomNumber: room.roomNumber,
        roomId: room.id,
        propertyId: property.id,
        tenantId: room.currentTenant?.id,
        tenantName: room.currentTenant?.fullName || "ผู้เช่า",
        tenantPhone: room.currentTenant?.phone || "",
        billingMonth: currentMonth,
        dueDate: `${currentMonth}-05`,
        totalAmount,
        items,
      });

      if (ok) successCount++;
    }

    showToast(`ออกบิลรอบเดือน ${currentMonth} สำเร็จ ${successCount} ใบ`, "success");
    const updatedInvs = await DatabaseService.getInvoices(property.id);
    setInvoices(updatedInvs);
  };

  // Handler: Mark invoice as paid
  const handleMarkAsPaid = async (invoiceId: string) => {
    const success = await DatabaseService.updateInvoiceStatus(invoiceId, "paid");
    if (success) {
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoiceId
            ? { ...inv, status: "paid", paidAt: new Date().toISOString() }
            : inv
        )
      );

      // Coherence: check if this room still has other unpaid invoices
      const targetInv = invoices.find((i) => i.id === invoiceId);
      if (targetInv) {
        const remainingUnpaid = invoices.some(
          (inv) => inv.id !== invoiceId && inv.roomNumber === targetInv.roomNumber && inv.status !== "paid"
        );
        if (!remainingUnpaid) {
          const roomToUpdate = rooms.find((r) => r.roomNumber === targetInv.roomNumber);
          if (roomToUpdate && roomToUpdate.status === "overdue") {
            setRooms((prev) =>
              prev.map((r) => (r.id === roomToUpdate.id ? { ...r, status: "occupied", lastBillPaid: true } : r))
            );
            await DatabaseService.updateRoomStatus(roomToUpdate.id, "occupied");
          }
        }
      }

      showToast("บันทึกการชำระเงินเรียบร้อยแล้ว ✓", "success");
    } else {
      showToast("ไม่สามารถอัปเดตสถานะบิลได้", "error");
    }
  };

  // Handler: Add Tenant (with optional Room Assignment)
  const handleAddTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantForm.fullName || !newTenantForm.phone) {
      showToast("กรุณากรอกชื่อ-นามสกุล และเบอร์โทรศัพท์", "warning");
      return;
    }

    const created = await DatabaseService.createTenant({
      fullName: newTenantForm.fullName,
      phone: newTenantForm.phone,
      idCard: newTenantForm.idCard,
      emergencyContact: newTenantForm.emergencyContact,
      lineId: newTenantForm.lineId,
      vehiclePlate: newTenantForm.vehiclePlate,
    });

    if (created) {
      // If a room was selected, assign tenant to that room
      if (newTenantForm.roomId) {
        await DatabaseService.assignTenantToRoom(created.id, newTenantForm.roomId);
        setRooms((prev) =>
          prev.map((r) =>
            r.id === newTenantForm.roomId
              ? { ...r, status: "occupied", currentTenant: created }
              : r
          )
        );
      }

      setTenants((prev) => [created, ...prev]);
      setIsAddTenantOpen(false);
      setNewTenantForm({
        fullName: "",
        phone: "",
        idCard: "",
        emergencyContact: "",
        lineId: "",
        vehiclePlate: "",
        roomId: "",
      });
      showToast("เพิ่มข้อมูลผู้เช่าและบันทึกเข้าห้องพักเรียบร้อยแล้ว", "success");
    } else {
      showToast("เกิดข้อผิดพลาดในการเพิ่มผู้เช่า", "error");
    }
  };

  // Handler: Add Daily Booking (Synchronized with Rooms Database)
  const handleAddBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookingForm.guestName || !newBookingForm.guestPhone) {
      showToast("กรุณากรอกชื่อและเบอร์โทรผู้เข้าพัก", "warning");
      return;
    }
    if (!newBookingForm.roomNumber) {
      showToast("กรุณาเลือกห้องพักว่างที่ต้องการจอง", "warning");
      return;
    }

    // Defensive check: ห้องพักต้องอยู่ในสถานะ "vacant" เท่านั้น และไม่มีผู้เช่า
    const targetRoom = rooms.find((r) => r.roomNumber === newBookingForm.roomNumber);
    if (!targetRoom || targetRoom.status !== "vacant" || targetRoom.currentTenant) {
      showToast(`ห้อง ${newBookingForm.roomNumber} ไม่ว่าง (สถานะ: ${targetRoom?.status || "ไม่พบห้อง"}) ไม่สามารถเปิดจองซ้ำได้`, "error");
      return;
    }

    const checkIn = new Date(newBookingForm.checkInDate);
    const checkOut = new Date(newBookingForm.checkOutDate);
    const diffTime = Math.max(86400000, checkOut.getTime() - checkIn.getTime());
    const totalNights = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const totalAmount = totalNights * newBookingForm.nightlyRate;

    const newBooking: DailyBooking = {
      id: `b-${Date.now()}`,
      propertyId: property.id,
      roomNumber: newBookingForm.roomNumber,
      guestName: newBookingForm.guestName,
      guestPhone: newBookingForm.guestPhone,
      checkInDate: newBookingForm.checkInDate,
      checkInTime: "14:00",
      checkOutDate: newBookingForm.checkOutDate,
      checkOutTime: "12:00",
      nights: totalNights,
      dailyRate: newBookingForm.nightlyRate,
      totalRoomPrice: totalAmount,
      keyDeposit: newBookingForm.depositAmount,
      status: "confirmed",
    };

    const saved = await DatabaseService.addDailyBooking(newBooking, property.id);
    setDailyBookings((prev) => [saved, ...prev]);

    // Update room status to 'daily' in database & local state
    if (targetRoom) {
      await DatabaseService.updateRoomStatus(targetRoom.id, "daily");
    }
    setRooms((prev) =>
      prev.map((r) =>
        r.roomNumber === newBookingForm.roomNumber ? { ...r, status: "daily" } : r
      )
    );

    // Refresh branch rooms count
    const freshProps = await DatabaseService.getAllProperties();
    setBranches(freshProps);

    // Reset daily booking form state (Fix Issue 4)
    setNewBookingForm({
      roomNumber: "",
      guestName: "",
      guestPhone: "",
      checkInDate: new Date().toISOString().slice(0, 10),
      checkOutDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      nightlyRate: 650,
      depositAmount: 500,
    });

    setIsNewBookingOpen(false);
    showToast(`บันทึกการจองห้องรายวัน ${newBooking.roomNumber} เรียบร้อยแล้ว (อัปเดตสถานะห้องในผังเป็น "จองรายวัน")`, "success");
  };

  // Handler: Add Contract (Branch-Isolated & Room Synchronized)
  const handleAddContract = async (newContract: Omit<ContractItem, "id" | "createdAt" | "contractNumber">) => {
    const item = await DatabaseService.addContract({
      ...newContract,
      propertyId: property.id,
    });
    setContracts((prev) => [item, ...prev]);

    // Synchronize Room state to occupied with leaseEndDate and currentTenant
    setRooms((prev) =>
      prev.map((r) =>
        r.roomNumber === item.roomNumber
          ? {
              ...r,
              status: "occupied",
              leaseEndDate: item.endDate,
              currentTenant: {
                id: `t-${Date.now()}`,
                propertyId: property.id,
                fullName: item.tenantName,
                phone: item.tenantPhone,
                idCard: "-",
              },
            }
          : r
      )
    );

    // Refresh branch room counts
    const freshProps = await DatabaseService.getAllProperties();
    setBranches(freshProps);

    showToast(`สร้างสัญญาเช่า ${item.contractNumber} และอัปเดตสถานะห้อง ${item.roomNumber} เป็น "มีผู้เช่าแล้ว" เรียบร้อยแล้ว`, "success");
  };

  // Handler: Repairs (Branch-Isolated)
  const handleAddRepair = async (newRepair: Omit<RepairItem, "id" | "reportedAt">) => {
    const item = await DatabaseService.addRepair({
      ...newRepair,
      propertyId: property.id,
    });
    setRepairs((prev) => [item, ...prev]);
    showToast(`บันทึกการแจ้งซ่อมห้อง ${item.roomNumber} เรียบร้อยแล้ว`, "success");
  };

  const handleUpdateRepairStatus = async (id: string, status: RepairItem["status"]) => {
    await DatabaseService.updateRepairStatus(id, status);
    setRepairs((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    showToast("อัปเดตสถานะการซ่อมเรียบร้อยแล้ว", "success");
  };

  // Handler: Branch Settings
  const handleSaveBranchSettings = async (updated: Partial<BranchSettingsDetail>) => {
    const merged = { ...branchSettings, ...updated };
    setBranchSettings(merged);

    // Synchronize Property state and database so rates & details update everywhere!
    const propUpdates: Partial<Property> = {};
    if (merged.branchName) propUpdates.name = merged.branchName;
    if (merged.address) propUpdates.address = merged.address;
    if (merged.phone) propUpdates.phone = merged.phone;
    if (merged.electricRate !== undefined) propUpdates.electricRate = Number(merged.electricRate);
    if (merged.waterRate !== undefined) propUpdates.waterRate = Number(merged.waterRate);
    if (merged.promptpayNumber) propUpdates.promptpayNumber = merged.promptpayNumber;
    if (merged.promptpayName) propUpdates.promptpayName = merged.promptpayName;

    if (Object.keys(propUpdates).length > 0) {
      setProperty((prev) => ({ ...prev, ...propUpdates }));
      setSettingsForm((prev) => ({ ...prev, ...propUpdates }));
      setBranches((prev) =>
        prev.map((b) => (b.id === property.id || prev.length === 1 ? { ...b, ...propUpdates } : b))
      );
      await DatabaseService.updateProperty(property.id, propUpdates);
    }

    // Save to DatabaseService (local storage + audit log)
    await DatabaseService.updateBranchSettings(merged, property.id);

    showToast("บันทึกการตั้งค่าหอพักและอัปเดตอัตราค่าน้ำ-ไฟเรียบร้อยแล้ว ✓", "success");
  };

  // Handler: Add Tenant Complete (14 fields + lease dates & deposit)
  const handleAddTenantComplete = async (tenantData: {
    roomId: string;
    fullName: string;
    phone: string;
    idCard: string;
    gender?: "MALE" | "FEMALE" | "OTHER";
    age?: number;
    lineId?: string;
    taxId?: string;
    email?: string;
    address?: string;
    emergencyContact?: string;
    vehiclePlate?: string;
    idCardImageUrl?: string;
    invoiceLang?: "TH" | "EN";
    notes?: string;
    startDate?: string;
    endDate?: string;
    depositAmount?: number;
  }) => {
    // 1. Create Tenant in Database
    const createdTenant = await DatabaseService.createTenant({
      fullName: tenantData.fullName,
      phone: tenantData.phone,
      idCard: tenantData.idCard,
      gender: tenantData.gender,
      age: tenantData.age,
      lineId: tenantData.lineId,
      taxId: tenantData.taxId,
      email: tenantData.email,
      address: tenantData.address,
      emergencyContact: tenantData.emergencyContact,
      vehiclePlate: tenantData.vehiclePlate,
      idCardImageUrl: tenantData.idCardImageUrl,
      invoiceLang: tenantData.invoiceLang,
      notes: tenantData.notes,
    });

    const finalTenant: Tenant = createdTenant || {
      id: crypto.randomUUID(),
      ...tenantData,
    };

    // 2. Assign Tenant to Room in Database & Local State with Lease End Date
    if (tenantData.roomId) {
      const targetRoom = rooms.find((r) => r.id === tenantData.roomId);

      // Defensive check: ป้องกันการลงทะเบียนทับห้องที่มีผู้เช่า หรือห้องที่จองรายวันอยู่ (ต้องเป็น vacant เท่านั้น)
      if (!targetRoom || targetRoom.status !== "vacant" || targetRoom.currentTenant) {
        showToast(`ห้อง ${targetRoom?.roomNumber || ""} ไม่ว่าง (สถานะ: ${targetRoom?.status || "ไม่พบห้อง"}) ไม่สามารถลงทะเบียนเข้าพักได้`, "error");
        return;
      }

      const leaseEndDate = tenantData.endDate || "2027-10-28";
      setRooms((prev) =>
        prev.map((r) =>
          r.id === tenantData.roomId
            ? { ...r, status: "occupied", currentTenant: finalTenant, leaseEndDate }
            : r
        )
      );
      await DatabaseService.assignTenantToRoom(finalTenant.id, tenantData.roomId, leaseEndDate);

      // Create contract record
      const newContract: ContractItem = {
        id: `ct-${Date.now()}`,
        propertyId: property.id,
        contractNumber: `CT-2026-${targetRoom?.roomNumber || "00"}-${String(contracts.length + 1).padStart(2, "0")}`,
        roomNumber: targetRoom?.roomNumber || "",
        tenantName: finalTenant.fullName,
        tenantPhone: finalTenant.phone,
        startDate: tenantData.startDate || new Date().toISOString().split("T")[0],
        endDate: leaseEndDate,
        monthlyRent: targetRoom?.monthlyRate || 4000,
        depositAmount: tenantData.depositAmount || (targetRoom?.monthlyRate || 4000) * 2,
        advanceRent: targetRoom?.monthlyRate || 4000,
        status: "active",
        createdAt: new Date().toISOString().split("T")[0],
      };
      setContracts((prev) => [newContract, ...prev]);
      await DatabaseService.addContract(newContract);
    }

    setTenants((prev) => [finalTenant, ...prev]);
    setIsAddTenantOpen(false);
    showToast(`ลงทะเบียนผู้เช่า ${finalTenant.fullName} และเริ่มสัญญาเช่าเรียบร้อยแล้ว ✓`, "success");
  };

  // Handler: Checkout Settlement
  const handleExecuteCheckout = async () => {
    const targetRoom = rooms.find((r) => r.id === checkoutRoomId);
    if (!targetRoom) {
      showToast("กรุณาเลือกห้องที่ต้องการทำเรื่องย้ายออก", "warning");
      return;
    }

    const elecUnits = Math.max(0, checkoutElecCurr - targetRoom.currentElectricMeter);
    const waterUnits = Math.max(0, checkoutWaterCurr - targetRoom.currentWaterMeter);
    const elecCost = elecUnits * property.electricRate;
    const waterCost = waterUnits * property.waterRate;
    const totalDeductions = elecCost + waterCost + checkoutCleaningFee + checkoutDamageFee;
    // Data Coherence: ใช้เงินประกันจริงที่ดึงมาจากสัญญาเช่า หรือยอดที่ผู้จัดการตรวจสอบ/แก้ไข
    const deposit = checkoutDepositAmount > 0 ? checkoutDepositAmount : (targetRoom.monthlyRate * 2 || 8000);
    const netRefund = Math.max(0, deposit - totalDeductions);

    setConfirmDialog({
      isOpen: true,
      title: `ยืนยันการย้ายออก ห้อง ${targetRoom.roomNumber}`,
      description: `ยอดหักค่าน้ำ-ไฟ และค่าทำความสะอาดรวม ${formatCurrency(totalDeductions)} • เงินประกันสุทธิคืนผู้เช่า ${formatCurrency(netRefund)} โดยระบบจะปรับสถานะห้องเป็น "รอทำความสะอาด (cleaning)"`,
      confirmText: "ยืนยันทำเรื่องย้ายออก",
      cancelText: "ยกเลิก",
      variant: "warning",
      iconType: "question",
      onConfirm: async () => {
        const ok = await DatabaseService.checkoutRoom(targetRoom.id);
        if (ok) {
          setRooms((prev) =>
            prev.map((r) =>
              r.id === targetRoom.id
                ? { ...r, status: "cleaning", currentTenant: undefined, leaseEndDate: undefined }
                : r
            )
          );
          await DatabaseService.terminateRoomContracts(targetRoom.roomNumber);
          setContracts((prev) =>
            prev.map((c) =>
              c.roomNumber === targetRoom.roomNumber && c.status === "active"
                ? { ...c, status: "terminated" }
                : c
            )
          );
          showToast(`สรุปย้ายออกห้อง ${targetRoom.roomNumber} สำเร็จ และส่งต่อแผนกแม่บ้านแล้ว`, "success");
        } else {
          showToast("เกิดข้อผิดพลาดในการทำเรื่องย้ายออก", "error");
        }
      },
    });
  };

  // Handler: Export CSV Report
  const handleExportCSV = () => {
    const header = "เลขห้อง,ประเภท,สถานะ,ผู้เช่า,เบอร์โทร,มิเตอร์ไฟ,มิเตอร์น้ำ,ค่าเช่า\n";
    const rows = rooms
      .map(
        (r) =>
          `"${r.roomNumber}","${r.type}","${r.status}","${r.currentTenant?.fullName || "ว่าง"}","${r.currentTenant?.phone || "-"}","${r.currentElectricMeter}","${r.currentWaterMeter}","${r.monthlyRate}"`
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `pakdee-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("ดาวน์โหลดรายงาน Excel (CSV) เรียบร้อยแล้ว", "success");
  };

  // Handler: Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await DatabaseService.updateProperty(property.id, {
      name: settingsForm.name,
      address: settingsForm.address,
      phone: settingsForm.phone,
      promptpayNumber: settingsForm.promptpayNumber,
      promptpayName: settingsForm.promptpayName,
      electricRate: Number(settingsForm.electricRate),
      waterRate: Number(settingsForm.waterRate),
    });

    if (ok) {
      setProperty((prev) => ({
        ...prev,
        ...settingsForm,
        electricRate: Number(settingsForm.electricRate),
        waterRate: Number(settingsForm.waterRate),
      }));
      setBranchSettings((prev) => ({
        ...prev,
        branchName: settingsForm.name,
        address: settingsForm.address,
        phone: settingsForm.phone,
        promptpayNumber: settingsForm.promptpayNumber,
        promptpayName: settingsForm.promptpayName,
        electricRate: Number(settingsForm.electricRate),
        waterRate: Number(settingsForm.waterRate),
      }));
      showToast("บันทึกการตั้งค่าหอพักลง Supabase เรียบร้อยแล้ว", "success");
    } else {
      showToast("ไม่สามารถบันทึกการตั้งค่าได้", "error");
    }
  };

  // Handler: Change subscription plan
  const handleChangePlan = async (newPlan: PlanType) => {
    setProperty((prev) => ({ ...prev, plan: newPlan }));
    await DatabaseService.updateProperty(property.id, { plan: newPlan });
    showToast(`อัปเกรดเป็นแพ็กเกจ ${newPlan.toUpperCase()} เรียบร้อยแล้ว`, "success");
  };

  // Handler: Select Active Branch (Multi-Branch Data Isolation)
  const handleSelectBranch = async (
    branch: BranchItem,
    targetTab: string = "room-grid"
  ) => {
    DatabaseService.setActivePropertyId(branch.id);
    setProperty(branch);

    // Load isolated data specific to this branch
    try {
      const [
        branchRooms,
        branchInvoices,
        branchContracts,
        branchRepairs,
        branchExpenses,
        branchTenants,
        branchSettingsData,
        branchDailyBookings,
        branchBroadcasts,
      ] = await Promise.all([
        DatabaseService.getRooms(branch.id),
        DatabaseService.getInvoices(branch.id),
        DatabaseService.getContracts(branch.id),
        DatabaseService.getRepairs(branch.id),
        DatabaseService.getExpenses(branch.id),
        DatabaseService.getTenants(branch.id),
        DatabaseService.getBranchSettings(branch, branch.id),
        DatabaseService.getDailyBookings(branch.id),
        DatabaseService.getBroadcasts(branch.id),
      ]);

      setRooms(branchRooms);
      setInvoices(branchInvoices);
      setContracts(branchContracts);
      setRepairs(branchRepairs);
      setExpenses(branchExpenses);
      setTenants(branchTenants);
      setDailyBookings(branchDailyBookings || []);
      setBroadcasts(branchBroadcasts || []);

      if (branchInvoices.length > 0) {
        setActiveInvoice(branchInvoices[0]);
      } else {
        setActiveInvoice(null);
      }

      const targetName = branchSettingsData?.branchName || branch.name;
      if (branchSettingsData) {
        const freshElectric =
          branchSettingsData.electricRate !== undefined
            ? Number(branchSettingsData.electricRate)
            : branch.electricRate;
        const freshWater =
          branchSettingsData.waterRate !== undefined
            ? Number(branchSettingsData.waterRate)
            : branch.waterRate;

        setBranchSettings({
          ...branchSettingsData,
          branchName: targetName,
          address: branchSettingsData.address || branch.address,
          phone: branchSettingsData.phone || branch.phone,
          promptpayNumber: branchSettingsData.promptpayNumber || branch.promptpayNumber,
          promptpayName: branchSettingsData.promptpayName || branch.promptpayName,
          electricRate: freshElectric,
          waterRate: freshWater,
        });

        setSettingsForm({
          name: targetName,
          address: branchSettingsData.address || branch.address,
          phone: branchSettingsData.phone || branch.phone,
          promptpayNumber: branchSettingsData.promptpayNumber || branch.promptpayNumber,
          promptpayName: branchSettingsData.promptpayName || branch.promptpayName,
          electricRate: freshElectric,
          waterRate: freshWater,
        });

        setProperty({
          ...branch,
          id: branch.id,
          name: targetName,
          electricRate: freshElectric,
          waterRate: freshWater,
          promptpayNumber: branchSettingsData.promptpayNumber || branch.promptpayNumber,
          promptpayName: branchSettingsData.promptpayName || branch.promptpayName,
        });
      }

      // Refresh branches list so currentPropertyId and room counts update immediately
      const freshProps = await DatabaseService.getAllProperties();
      setBranches(freshProps);
    } catch (e) {
      console.error("Error switching branch data:", e);
    }

    syncNavigation(targetTab, false, true);
    if (targetTab === "settings") {
      showToast(`เข้าสู่หน้าตั้งค่าหอพักสาขา "${branch.name}" (9 แท็บ) เรียบร้อยแล้ว`, "success");
    } else {
      showToast(`สลับไปใช้งานสาขา "${branch.name}" เรียบร้อยแล้ว (โหลดข้อมูลเฉพาะสาขานี้)`, "success");
    }
  };

  // Handler: Update Branch Details (แก้ไขข้อมูลสาขา)
  const handleUpdateBranch = async (
    branchId: string,
    updates: Partial<Property>
  ): Promise<boolean> => {
    try {
      const ok = await DatabaseService.updateProperty(branchId, updates);
      if (ok) {
        const freshProps = await DatabaseService.getAllProperties();
        setBranches(freshProps);
        if (property.id === branchId) {
          setProperty((prev) => ({ ...prev, ...updates }));
          if (updates.name) {
            setSettingsForm((prev) => ({ ...prev, name: updates.name || prev.name }));
          }
        }
        showToast("บันทึกการแก้ไขข้อมูลสาขาเรียบร้อยแล้ว ✓", "success");
        return true;
      }
      showToast("เกิดข้อผิดพลาดในการแก้ไขข้อมูลสาขา", "error");
      return false;
    } catch (err) {
      console.error("Error updating branch:", err);
      showToast("เกิดข้อผิดพลาดในการแก้ไขข้อมูลสาขา", "error");
      return false;
    }
  };

  // Handler: Create New Branch
  const handleCreateBranch = async (branchData: {
    name: string;
    address: string;
    phone: string;
    promptpayNumber: string;
    promptpayName: string;
    electricRate: number;
    waterRate: number;
    initialRoomCount: number;
  }) => {
    // Enforce Starter limits: 1 branch max
    if (property.plan === "starter" && branches.length >= 1) {
      setConfirmDialog({
        isOpen: true,
        title: "แพ็กเกจ Starter รองรับ 1 สาขา",
        description: "แพ็กเกจ Starter ออกแบบมาสำหรับการบริหารหอพัก 1 สาขา (ไม่เกิน 30 ห้อง) หากต้องการเปิดใช้งานหลายสาขาพร้อมกันและสลับจัดการได้อย่างราบรื่น ระบบจะอัปเกรดเป็นแพ็กเกจ Pro และสร้างสาขานี้ให้ทันที",
        confirmText: "อัปเกรดเป็น Pro & สร้างสาขา",
        cancelText: "ยกเลิก",
        variant: "warning",
        iconType: "question",
        onConfirm: async () => {
          await handleChangePlan("pro");
          const created = await DatabaseService.createBranch(branchData);
          if (created) {
            const allProps = await DatabaseService.getAllProperties();
            setBranches(allProps);
            const found = allProps.find((b) => b.id === created.id);
            if (found) {
              await handleSelectBranch(found);
            }
            showToast(`อัปเกรดเป็น Pro และสร้างสาขา "${branchData.name}" สำเร็จเรียบร้อยแล้ว ✓`, "success");
          }
        },
      });
      return false;
    }

    const created = await DatabaseService.createBranch(branchData);
    if (created) {
      const allProps = await DatabaseService.getAllProperties();
      setBranches(allProps);
      const found = allProps.find((b) => b.id === created.id);
      if (found) {
        await handleSelectBranch(found);
      }
      showToast(`สร้างสาขาหอพัก "${branchData.name}" สำเร็จและเปิดใช้งานแล้ว`, "success");
      return true;
    }
    showToast("เกิดข้อผิดพลาดในการสร้างสาขาหอพัก", "error");
    return false;
  };

  const getActiveViewTitle = () => {
    switch (currentTab) {
      case "dashboard":
        return "แดชบอร์ดภาพรวม";
      case "room-grid":
        return "ผังสถานะห้องพักเรียลไทม์";
      case "daily":
        return "ปฏิทินจองห้องพักรายวัน";
      case "meter":
        return "ระบบจดมิเตอร์น้ำ-ไฟ";
      case "invoices":
        return "ระบบใบแจ้งหนี้ & การชำระเงิน";
      case "slips":
        return "ระบบตรวจสลิปโอนเงิน (AI & PromptPay)";
      case "receipts":
        return "ระบบออกใบเสร็จรับเงิน";
      case "tenants":
        return "ทะเบียนผู้เช่าและเอกสาร";
      case "digital-leases":
        return "สัญญาเช่าดิจิทัล (เซ็นออนไลน์ E-Sign)";
      case "leases":
        return "ระบบจัดการสัญญาเช่าเดิม";
      case "checkout":
        return "ระบบสรุปย้ายออก & คืนเงินประกัน";
      case "cleaning":
        return "งานแม่บ้านทำความสะอาด";
      case "repairs":
        return "ระบบแจ้งซ่อมบำรุงห้องพัก";
      case "reports":
        return "สรุปรายงาน & Export Excel";
      case "settings":
        return "ตั้งค่าหอพัก & LINE OA";
      case "branches":
        return "เลือกและจัดการสาขาหอพัก";
      default:
        return "ผังห้องพัก";
    }
  };

  // Synchronize URL to /login when unauthenticated
  useEffect(() => {
    if (!isAuthenticated && !isAuthLoading && typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.history.replaceState({ tab: "login", isBranchSelectorOpen: false }, "", "/login");
      document.title = "เข้าสู่ระบบ | พักดี (PAKDEE)";
    }
  }, [isAuthenticated, isAuthLoading]);

  // Auth Loading Gate (Sunlight White Theme)
  if (isAuthLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#FFFDF9] text-slate-800 select-none relative overflow-hidden">
        <div className="absolute top-[-50px] right-[-50px] w-96 h-96 rounded-full bg-amber-200/30 blur-3xl pointer-events-none" />
        <PakdeeLogo size="xl" variant="light" className="animate-pulse mb-4 z-10" />
        <div className="text-sm font-bold text-slate-700 flex items-center gap-2.5 z-10">
          <div className="w-4 h-4 border-2 border-emerald-600 border-t-amber-500 rounded-full animate-spin" />
          <span>กำลังเริ่มต้นระบบจัดการหอพัก PAKDEE...</span>
        </div>
      </div>
    );
  }

  // Unauthenticated Gate -> Render Login View
  if (!isAuthenticated) {
    return <LoginView />;
  }

  // Full Screen Branch Selector View if active
  if (currentTab === "branches" || isBranchSelectorOpen) {
    return (
      <>
        <BranchSelectorView
          branches={branches}
          currentPropertyId={property.id}
          onSelectBranch={(b) => handleSelectBranch(b, "room-grid")}
          onOpenSettings={(b) => handleSelectBranch(b, "settings")}
          onCreateBranch={handleCreateBranch}
          onUpdateBranch={handleUpdateBranch}
          onDeleteBranch={handleDeleteBranch}
          onLogout={handleLogoutPrompt}
          onClose={handleCloseBranchSelector}
        />
        {/* Global Bento Confirmation Modal (Rendered here so it shows on branch screen!) */}
        <ConfirmModal
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          variant={confirmDialog.variant}
          iconType={confirmDialog.iconType}
        />
      </>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-[var(--background)] text-[var(--foreground)] antialiased">
      {/* 1. Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={handleTabChange}
        onOpenSuperAdmin={() => setIsSuperAdminOpen(true)}
        propertyPlan={property.plan}
        propertyName={property.name}
        propertyAddress={property.address}
        onOpenBranches={handleOpenBranchSelector}
        roomsCount={rooms.length}
        dailyCount={Math.max(
          rooms.filter((r) => r.status === "daily").length,
          dailyBookings.filter((b) => b.status === "checked_in" || b.status === "confirmed").length
        )}
        overdueCount={invoices.filter((i) => i.status !== "paid").length}
        cleaningCount={rooms.filter((r) => r.status === "cleaning").length}
        repairsCount={repairs.filter((r) => r.status !== "completed").length}
        onLogout={handleLogoutPrompt}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* 2. Main Viewport */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Sticky Header */}
        <Header
          currentBuilding={currentBuilding}
          onBuildingChange={setCurrentBuilding}
          onOpenQuickMeter={() => {
            setQuickMeterRoomId(undefined);
            setIsQuickMeterOpen(true);
          }}
          onOpenNewContract={() => setIsAddTenantOpen(true)}
          onOpenAddRoom={() => setIsAddRoomOpen(true)}
          onClearAllData={handleClearAllData}
          activeViewTitle={getActiveViewTitle()}
          totalRooms={rooms.length}
          propertyPlan={property.plan}
          propertyName={property.name}
          onBackToBranches={handleOpenBranchSelector}
          onLogout={handleLogoutPrompt}
          onNavigateToTab={handleTabChange}
          onShowToast={showToast}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
        />

        {/* Scrollable Content Workspace */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Toast Notification Banner */}
          {toast && (
            <div
              className={`p-3.5 px-5 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-md transition animate-in fade-in slide-in-from-top-2 ${
                toast.type === "success"
                  ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30"
                  : toast.type === "error"
                  ? "bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/30"
                  : toast.type === "warning"
                  ? "bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30"
                  : "bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-500/30"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {toast.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : toast.type === "warning" ? (
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                <span>{toast.message}</span>
              </div>
              <button
                onClick={() => setToast(null)}
                className="opacity-70 hover:opacity-100 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Database Connection Status Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 px-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold">
                {DatabaseService.isLocalMode()
                  ? "โหมดฐานข้อมูล: Host Machine Server Database (เซฟตรงลงเครื่องโฮสต์ ⚡ รองรับทุกเครื่องในวง LAN)"
                  : isDbConnected
                  ? "เชื่อมต่อ Supabase Live Cloud สำเร็จ 🟢"
                  : "กำลังเชื่อมต่อ..."}
              </span>
              <span className="text-[11px] text-[var(--muted)]">
                | หอพัก: {property.name} ({rooms.length} ห้องในระบบ)
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setIsDbInspectorOpen(true)}
                className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300 hover:text-amber-600 dark:hover:text-amber-100 transition cursor-pointer"
                title="เปิดหน้าต่างดูข้อมูลจริงทุกตารางในระบบ"
              >
                <Database className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>ดูข้อมูล Database ทั้งหมด ➔</span>
              </button>
              <span className="text-[var(--border)]">|</span>
              <button
                type="button"
                onClick={handleExportBackup}
                className="flex items-center gap-1.5 font-semibold text-[var(--muted)] hover:text-emerald-600 transition cursor-pointer"
                title="ดาวน์โหลดไฟล์สำรองข้อมูล JSON เก็บไว้ในเครื่อง"
              >
                <Download className="w-3.5 h-3.5" />
                <span>สำรอง JSON</span>
              </button>
              <span className="text-[var(--border)]">|</span>
              <button
                type="button"
                onClick={() => loadData()}
                disabled={isLoading}
                className="flex items-center gap-1.5 font-semibold text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                <span>ซิงค์สด</span>
              </button>
            </div>
          </div>

          {/* VIEW: Executive Dashboard */}
          {currentTab === "dashboard" && (
            <ExecutiveDashboard
              rooms={rooms}
              invoices={invoices}
              property={property}
              onOpenQuickMeter={() => {
                setQuickMeterRoomId(undefined);
                setIsQuickMeterOpen(true);
              }}
              onOpenAddTenant={(roomId) => {
                if (roomId) setNewTenantForm((prev) => ({ ...prev, roomId }));
                setIsAddTenantOpen(true);
              }}
              onAutoBilling={handleGenerateMonthlyInvoices}
              onNavigateTab={handleTabChange}
              onSelectRoom={(room) => setSelectedRoom(room)}
              onMarkInvoicePaid={handleMarkAsPaid}
              onUpdateRoomStatus={handleUpdateStatus}
            />
          )}

          {/* VIEW: Room Grid Matrix */}
          {currentTab === "room-grid" && (
            <div className="space-y-6">
              {/* To-Do Today Banner (กล่องแจ้งเตือนงานสำคัญ) */}
              <TodoToday
                rooms={rooms}
                invoices={invoices}
                onSelectRoom={(room) => setSelectedRoom(room)}
                onNavigateTab={handleTabChange}
                onOpenQuickMeter={() => {
                  setQuickMeterRoomId(undefined);
                  setIsQuickMeterOpen(true);
                }}
              />

              <OverviewMetrics
                rooms={rooms}
                overdueAmount={invoices
                  .filter((i) => i.status !== "paid")
                  .reduce((sum, i) => sum + i.totalAmount, 0)}
              />
              <RoomMatrix
                rooms={rooms}
                onSelectRoom={(room) => setSelectedRoom(room)}
                onOpenAddTenant={(targetRoomId) => {
                  setSelectedRoom(null);
                  setInitialAddTenantRoomId(targetRoomId);
                  setIsAddTenantOpen(true);
                }}
                onOpenAddRoom={() => setIsAddRoomOpen(true)}
                onQuickGenerateStandardRooms={handleQuickGenerateStandardRooms}
                onDeleteRoom={handleDeleteRoom}
                onDeleteRooms={handleDeleteRooms}
                property={property}
              />
            </div>
          )}

          {/* VIEW: Daily Bookings */}
          {currentTab === "daily" && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    <span>ปฏิทินจองห้องพักรายวัน (Daily Bookings)</span>
                  </h3>
                  <p className="text-xs text-[var(--muted)]">
                    เช็คอิน 14:00 น. / เช็คเอาท์ 12:00 น. มีระบบมัดจำคีย์การ์ด และส่งต่องานแม่บ้าน
                  </p>
                </div>
                <button
                  onClick={() => {
                    const firstVacant = rooms.find((r) => r.status === "vacant");
                    setNewBookingForm({
                      roomNumber: firstVacant?.roomNumber || "",
                      guestName: "",
                      guestPhone: "",
                      checkInDate: new Date().toISOString().slice(0, 10),
                      checkOutDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
                      nightlyRate: firstVacant?.dailyRate || 650,
                      depositAmount: 500,
                    });
                    setIsNewBookingOpen(true);
                  }}
                  className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ จองห้องรายวันใหม่</span>
                </button>
              </div>

              {dailyBookings.length === 0 ? (
                <div className="py-12 text-center text-[var(--muted)] space-y-3 bg-[var(--subtle)] rounded-2xl border border-[var(--border)]">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div className="font-semibold text-sm text-[var(--foreground)]">
                    ยังไม่มีรายการจองห้องพักรายวันในขณะนี้
                  </div>
                  <p className="text-xs max-w-sm mx-auto">
                    คลิกปุ่ม &quot;+ จองห้องรายวันใหม่&quot; ด้านบน เพื่อเปิดห้องว่างให้ลูกค้าเข้าพักแบบรายวัน
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)] text-xs">
                  {dailyBookings.map((b) => (
                  <div key={b.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm">
                        ห้อง {b.roomNumber} - {b.guestName} ({b.guestPhone})
                      </div>
                      <div className="text-[11px] text-[var(--muted)]">
                        เข้าพัก {b.nights} คืน ({b.checkInDate} ถึง {b.checkOutDate}) • ค่าห้อง {formatCurrency(b.totalRoomPrice)} • มัดจำ {formatCurrency(b.keyDeposit)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold px-2.5 py-1 rounded-lg">
                        {b.status === "checked_in" ? "กำลังเข้าพัก (In แล้ว)" : "ยืนยันการจองแล้ว"}
                      </span>
                      {b.status === "confirmed" && (
                        <button
                          onClick={async () => {
                            await DatabaseService.updateDailyBooking(b.id, { status: "checked_in" });
                            const targetRoom = rooms.find((r) => r.roomNumber === b.roomNumber);
                            if (targetRoom) {
                              await DatabaseService.updateRoomStatus(targetRoom.id, "daily");
                            }
                            setDailyBookings((prev) =>
                              prev.map((item) => (item.id === b.id ? { ...item, status: "checked_in" } : item))
                            );
                            setRooms((prev) =>
                              prev.map((r) => (r.roomNumber === b.roomNumber ? { ...r, status: "daily" } : r))
                            );
                            const freshProps = await DatabaseService.getAllProperties();
                            setBranches(freshProps);
                            showToast(`เช็คอินห้อง ${b.roomNumber} เรียบร้อยแล้ว (สถานะห้องเปลี่ยนเป็น "จองรายวัน") ✓`, "success");
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg font-semibold cursor-pointer"
                        >
                          เช็คอิน (In)
                        </button>
                      )}
                      {b.status === "checked_in" && (
                        <button
                          onClick={async () => {
                            await DatabaseService.removeDailyBooking(b.id, b.roomNumber);
                            setDailyBookings((prev) => prev.filter((item) => item.id !== b.id));
                            setRooms((prev) =>
                              prev.map((r) => (r.roomNumber === b.roomNumber ? { ...r, status: "cleaning" } : r))
                            );
                            const freshProps = await DatabaseService.getAllProperties();
                            setBranches(freshProps);
                            showToast(`เช็คเอาท์ห้อง ${b.roomNumber} คืนมัดจำ ${formatCurrency(b.keyDeposit)} แล้ว (สถานะห้องเปลี่ยนเป็น "รอทำความสะอาด")`, "success");
                          }}
                          className="bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-1 rounded-lg font-semibold cursor-pointer"
                        >
                          เช็คเอาท์ (Out)
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          )}

          {/* VIEW: Meter Reading (Spreadsheet Fast Entry & Top Summary Banner) */}
          {currentTab === "meter" && (
            <MeterSpreadsheetView
              rooms={rooms}
              electricRate={property.electricRate}
              waterRate={property.waterRate}
              onSaveMeters={handleSaveMetersBatch}
            />
          )}

          {/* VIEW: Invoices */}
          {currentTab === "invoices" && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>รายการใบแจ้งหนี้ & การชำระเงิน (Real-Time Invoices)</span>
                  </h3>
                  <p className="text-xs text-[var(--muted)]">
                    ออกบิลอัตโนมัติพร้อมสร้าง Dynamic PromptPay QR Code และส่งเข้า LINE ผู้เช่า
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGenerateMonthlyInvoices}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer shadow-sm flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>⚡ คำนวณและออกบิลรอบเดือน</span>
                  </button>
                </div>
              </div>

              <div className="divide-y divide-[var(--border)] text-xs">
                {invoices.length === 0 ? (
                  <div className="py-8 text-center text-[var(--muted)]">
                    ยังไม่มีรายการใบแจ้งหนี้ คลิก "คำนวณและออกบิลรอบเดือน" เพื่อสร้างบิล
                  </div>
                ) : (
                  invoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-black/5 dark:hover:bg-white/5 px-2 rounded-xl transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[var(--foreground)]">
                            {inv.invoiceNumber} (ห้อง {inv.roomNumber})
                          </span>
                          <span className="text-slate-600 dark:text-slate-400 font-medium">
                            - {inv.tenantName}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--muted)] mt-0.5">
                          ยอดรวม: <span className="font-semibold text-[var(--foreground)]">{formatCurrency(inv.totalAmount)}</span> | กำหนดชำระ: {inv.dueDate || "5 ของเดือน"}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {inv.status === "paid" ? (
                          <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> ชำระแล้ว
                          </span>
                        ) : (
                          <>
                            <span className="bg-rose-500/15 text-rose-600 dark:text-rose-400 font-semibold px-2.5 py-1 rounded-lg">
                              ค้างชำระ
                            </span>
                            <button
                              onClick={() => handleMarkAsPaid(inv.id)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer"
                            >
                              ทำเครื่องหมายว่าชำระแล้ว
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            setActiveInvoice(inv);
                            setIsInvoiceModalOpen(true);
                          }}
                          className="bg-[var(--subtle)] hover:bg-[var(--border)] text-[var(--foreground)] px-2.5 py-1 rounded-lg font-semibold border border-[var(--border)] transition cursor-pointer flex items-center gap-1"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>ดูบิล / QR</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* VIEW: Slips (AI Slip Verification) */}
          {currentTab === "slips" && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-500" />
                    <span>ระบบตรวจสลิปโอนเงิน (AI & PromptPay Slip Verification)</span>
                  </h3>
                  <p className="text-xs text-[var(--muted)]">
                    ตรวจเช็คความถูกต้องของสลิปโอนเงินอัตโนมัติ ป้องกันสลิปปลอม และสลิปซ้ำ
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--subtle)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">สลิปห้อง 101 (รอบ ต.ค. 2026)</span>
                    <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full">
                      ตรวจสอบผ่าน 100%
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-[var(--muted)]">
                    <div>ผู้โอน: นายสมชาย สุขสบาย (ธ.กสิกรไทย)</div>
                    <div>ยอดเงิน: <span className="font-semibold text-emerald-600">5,064.00 บาท</span> (ตรงกับยอดบิล)</div>
                    <div>เลขอ้างอิง: 2026102609384501</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-dashed border-[var(--border)] flex flex-col items-center justify-center text-center p-6 space-y-2">
                  <CreditCard className="w-8 h-8 text-[var(--muted)]" />
                  <div className="text-xs font-semibold">รายการสลิปรอตรวจสอบ</div>
                  <div className="text-[10px] text-[var(--muted)]">
                    เมื่อผู้เช่าส่งสลิปผ่าน LINE OA ระบบ AI จะอ่านยอดเงินและเวลาเพื่อจับคู่บิลอัตโนมัติ
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: Receipts */}
          {currentTab === "receipts" && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                    <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>ระบบออกใบเสร็จรับเงิน (Official Receipts)</span>
                  </h3>
                  <p className="text-xs text-[var(--muted)]">
                    รายการบิลที่ชำระแล้ว พร้อมพิมพ์ใบเสร็จหรือส่ง PDF ทาง LINE
                  </p>
                </div>
              </div>

              <div className="divide-y divide-[var(--border)] text-xs">
                {invoices.filter((i) => i.status === "paid").map((inv) => (
                  <div key={inv.id} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm">REC-{inv.invoiceNumber.replace("INV-", "")}</span> - ห้อง {inv.roomNumber} ({inv.tenantName})
                      <div className="text-[11px] text-[var(--muted)]">
                        ชำระเมื่อ {inv.paidAt ? formatDateThai(inv.paidAt) : "26 ต.ค. 2026"} • ยอดเงิน {formatCurrency(inv.totalAmount)}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setActiveInvoice(inv);
                        setIsInvoiceModalOpen(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>พิมพ์ใบเสร็จ</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: Tenants Directory */}
          {currentTab === "tenants" && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>ทะเบียนผู้เช่าและเอกสาร (Tenant Directory)</span>
                  </h3>
                  <p className="text-xs text-[var(--muted)]">
                    จัดการข้อมูลผู้เช่า สัญญา และข้อมูลการติดต่อฉุกเฉิน
                  </p>
                </div>
                <button
                  onClick={() => setIsAddTenantOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ เพิ่มผู้เช่าใหม่</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[var(--muted)] bg-[var(--subtle)]">
                      <th className="py-3 px-3">ชื่อ-นามสกุล</th>
                      <th className="py-3 px-3">เบอร์โทรศัพท์</th>
                      <th className="py-3 px-3">เลขบัตรประชาชน</th>
                      <th className="py-3 px-3">LINE ID</th>
                      <th className="py-3 px-3">ทะเบียนรถ</th>
                      <th className="py-3 px-3">เบอร์ติดต่อฉุกเฉิน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] text-[var(--foreground)]">
                    {tenants.map((t) => (
                      <tr key={t.id} className="hover:bg-black/5 dark:hover:bg-white/5">
                        <td className="py-3 px-3 font-bold">{t.fullName}</td>
                        <td className="py-3 px-3">{t.phone}</td>
                        <td className="py-3 px-3 font-mono">{t.idCard || "-"}</td>
                        <td className="py-3 px-3">{t.lineId || "-"}</td>
                        <td className="py-3 px-3">{t.vehiclePlate || "-"}</td>
                        <td className="py-3 px-3 text-[var(--muted)]">{t.emergencyContact || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW: Digital Leases (Isolated Component) */}
          {currentTab === "digital-leases" && (
            <DigitalLeases
              key={property.id}
              rooms={rooms}
              property={property}
            />
          )}

          {/* VIEW: Leases & Contracts (Original) */}
          {currentTab === "leases" && (
            <ContractManagementView
              property={property}
              contracts={contracts}
              rooms={rooms}
              onAddContract={handleAddContract}
              onUpdateSignature={async (contractId, signatureUrl) => {
                await DatabaseService.updateContractSignature(contractId, signatureUrl);
                setContracts((prev) =>
                  prev.map((c) =>
                    c.id === contractId
                      ? { ...c, signatureUrl, status: "active", signedAt: new Date().toLocaleString("th-TH") }
                      : c
                  )
                );
                showToast("บันทึกลายเซ็นสัญญาอิเล็กทรอนิกส์ (E-Signature) เรียบร้อยแล้ว ✓", "success");
              }}
            />
          )}

          {/* VIEW: Checkout & Deposit Refund */}
          {currentTab === "checkout" && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-6 max-w-3xl">
              <div>
                <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                  <DoorOpen className="w-4 h-4 text-rose-500" />
                  <span>ระบบสรุปย้ายออก & คืนเงินประกัน (Move-out Settlement)</span>
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  คำนวณค่าน้ำ-ไฟวันย้ายออก หักค่าทำความสะอาด และคำนวณเงินประกันคืนผู้เช่า
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold mb-1">เลือกห้องที่ต้องการย้ายออก</label>
                  <select
                    value={checkoutRoomId}
                    onChange={(e) => {
                      const selId = e.target.value;
                      setCheckoutRoomId(selId);
                      const r = rooms.find((rm) => rm.id === selId);
                      if (r) {
                        setCheckoutElecCurr(r.currentElectricMeter + 20);
                        setCheckoutWaterCurr(r.currentWaterMeter + 3);
                        // ดึงเงินมัดจำจริงจากสัญญาเช่าที่ active หรือจากข้อมูลห้องพัก
                        const activeCt = contracts.find((c) => c.roomNumber === r.roomNumber && c.status === "active");
                        const dep = activeCt?.depositAmount || (r as any).depositAmount || r.currentTenant?.depositAmount || (r.monthlyRate * 2) || 8000;
                        setCheckoutDepositAmount(dep);
                      }
                    }}
                    className="w-full p-2.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] focus:outline-emerald-500"
                  >
                    <option value="">-- เลือกห้องพัก --</option>
                    {rooms.filter((r) => r.status === "occupied" || r.status === "overdue").map((r) => (
                      <option key={r.id} value={r.id}>
                        ห้อง {r.roomNumber} - {r.currentTenant?.fullName || "ไม่มีชื่อ"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold mb-1">
                      เงินประกันมัดจำเดิม (ตามสัญญาเช่า) *
                    </label>
                    <input
                      type="number"
                      value={checkoutDepositAmount}
                      onChange={(e) => setCheckoutDepositAmount(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] font-mono font-bold text-emerald-600 dark:text-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">สถานะสัญญาเช่าปัจจุบัน</label>
                    <div className="p-2.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] text-xs text-[var(--muted)]">
                      {(() => {
                        const r = rooms.find((rm) => rm.id === checkoutRoomId);
                        const actCt = contracts.find((c) => c.roomNumber === r?.roomNumber && c.status === "active");
                        return actCt ? `สัญญาเลขที่ ${actCt.contractNumber} (มัดจำ ฿${(actCt.depositAmount || 0).toLocaleString()})` : "คำนวณตามอัตราค่าเช่า 2 เดือน";
                      })()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold mb-1">เลขมิเตอร์ไฟวันย้ายออก</label>
                    <input
                      type="number"
                      value={checkoutElecCurr}
                      onChange={(e) => setCheckoutElecCurr(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">เลขมิเตอร์น้ำวันย้ายออก</label>
                    <input
                      type="number"
                      value={checkoutWaterCurr}
                      onChange={(e) => setCheckoutWaterCurr(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold mb-1">ค่าทำความสะอาดห้องพัก (บาท)</label>
                    <input
                      type="number"
                      value={checkoutCleaningFee}
                      onChange={(e) => setCheckoutCleaningFee(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">ค่าเสียหาย / ค่าซ่อม (บาท)</label>
                    <input
                      type="number"
                      value={checkoutDamageFee}
                      onChange={(e) => setCheckoutDamageFee(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] font-mono"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[var(--subtle)] border border-[var(--border)] space-y-2">
                  <div className="font-bold text-sm text-[var(--foreground)]">สรุปยอดเงินคืนประกัน</div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">เงินประกันห้องพัก:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(checkoutDepositAmount)}</span>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>หักค่าน้ำ-ไฟ และค่าบริการ:</span>
                    <span>
                      -
                      {formatCurrency(
                        Math.max(
                          0,
                          (checkoutElecCurr - (rooms.find((r) => r.id === checkoutRoomId)?.currentElectricMeter || 0)) * property.electricRate
                        ) +
                          Math.max(
                            0,
                            (checkoutWaterCurr - (rooms.find((r) => r.id === checkoutRoomId)?.currentWaterMeter || 0)) * property.waterRate
                          ) +
                          checkoutCleaningFee +
                          checkoutDamageFee
                      )}
                    </span>
                  </div>
                  <div className="border-t border-[var(--border)] pt-2 flex justify-between font-bold text-base text-emerald-600">
                    <span>เงินประกันสุทธิที่ต้องคืนผู้เช่า:</span>
                    <span>
                      {formatCurrency(
                        Math.max(
                          0,
                          checkoutDepositAmount -
                            (Math.max(
                              0,
                              (checkoutElecCurr - (rooms.find((r) => r.id === checkoutRoomId)?.currentElectricMeter || 0)) * property.electricRate
                            ) +
                              Math.max(
                                0,
                                (checkoutWaterCurr - (rooms.find((r) => r.id === checkoutRoomId)?.currentWaterMeter || 0)) * property.waterRate
                              ) +
                              checkoutCleaningFee +
                              checkoutDamageFee)
                        )
                      )}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleExecuteCheckout}
                  disabled={!checkoutRoomId}
                  className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2"
                >
                  <DoorOpen className="w-4 h-4" />
                  <span>ยืนยันการย้ายออกและส่งต่องานแม่บ้าน</span>
                </button>
              </div>
            </div>
          )}

          {/* VIEW: Cleaning & Maintenance */}
          {currentTab === "cleaning" && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>งานแม่บ้าน & ซ่อมบำรุง (Housekeeping & Maintenance)</span>
                  </h3>
                  <p className="text-xs text-[var(--muted)]">
                    ติดตามสถานะห้องพักที่รอทำความสะอาดและงานแจ้งซ่อมแบบเรียลไทม์
                  </p>
                </div>
              </div>

              <div className="divide-y divide-[var(--border)] text-xs">
                {rooms.filter((r) => r.status === "cleaning" || r.status === "maintenance").length === 0 ? (
                  <div className="py-8 text-center text-[var(--muted)]">
                    ไม่มีห้องที่รอทำความสะอาดหรือรอซ่อมบำรุงในขณะนี้ ✨
                  </div>
                ) : (
                  rooms
                    .filter((r) => r.status === "cleaning" || r.status === "maintenance")
                    .map((room) => (
                      <div key={room.id} className="py-3 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-sm">
                            ห้อง {room.roomNumber} ({room.type} - ชั้น {room.floor})
                          </div>
                          <div className="text-[11px] text-[var(--muted)]">
                            สถานะ:{" "}
                            {room.status === "cleaning"
                              ? "🧹 รอแม่บ้านทำความสะอาด"
                              : "🔧 รองานซ่อมบำรุง"}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateStatus(room.id, "vacant")}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>เสร็จสิ้น (ปรับเป็นห้องว่าง)</span>
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          {/* VIEW: Repairs Management */}
          {currentTab === "repairs" && (
            <RepairsManagementView
              repairs={repairs}
              rooms={rooms}
              onAddRepair={handleAddRepair}
              onUpdateStatus={handleUpdateRepairStatus}
            />
          )}

          {/* VIEW: Reports & Accounting Export */}
          {currentTab === "reports" && (
            <AccountingExportView
              invoices={invoices}
              expenses={expenses}
            />
          )}

          {/* VIEW: LINE OA Broadcast */}
          {currentTab === "broadcast" && (
            <BroadcastLineView
              broadcasts={broadcasts}
              rooms={rooms}
              onSendBroadcast={async (data) => {
                const item = await DatabaseService.sendBroadcast({
                  ...data,
                  propertyId: property.id,
                });
                setBroadcasts((prev) => [item, ...prev]);
                showToast(`ส่งประกาศ LINE ไปยัง ${data.recipientCount} ห้องเรียบร้อยแล้ว ✓`, "success");
              }}
              branchName={property.name}
              lineChannelId={branchSettings.lineChannelSecret ? `@pakdee_${property.id}` : "@pakdee_mansion"}
            />
          )}

          {/* VIEW: Settings */}
          {currentTab === "settings" && (
            <BranchSettingsView
              settings={branchSettings}
              onSaveSettings={handleSaveBranchSettings}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <RoomDetailModal
        room={selectedRoom}
        contracts={contracts}
        onClose={() => setSelectedRoom(null)}
        onOpenInvoice={() => setIsInvoiceModalOpen(true)}
        onOpenAddTenant={(targetRoomId) => {
          setSelectedRoom(null);
          setInitialAddTenantRoomId(targetRoomId);
          setIsAddTenantOpen(true);
        }}
        onOpenDailyBooking={(targetRoomNumber) => {
          setSelectedRoom(null);
          const sel = rooms.find((r) => r.roomNumber === targetRoomNumber);
          setNewBookingForm({
            roomNumber: targetRoomNumber,
            guestName: "",
            guestPhone: "",
            checkInDate: new Date().toISOString().slice(0, 10),
            checkOutDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
            nightlyRate: sel?.dailyRate || 650,
            depositAmount: 500,
          });
          setIsNewBookingOpen(true);
        }}
        onUpdateStatus={handleUpdateStatus}
        onDeleteRoom={handleDeleteRoom}
        property={property}
      />

      <QuickMeterModal
        rooms={rooms}
        initialRoomId={quickMeterRoomId}
        isOpen={isQuickMeterOpen}
        onClose={() => setIsQuickMeterOpen(false)}
        onSaveReading={handleSaveReading}
        electricRate={property.electricRate}
        waterRate={property.waterRate}
      />

      <InvoicePreviewModal
        invoice={activeInvoice}
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        promptpayNumber={property.promptpayNumber}
        propertyName={property.name}
        propertyAddress={property.address}
        propertyPhone={property.phone}
        promptpayName={property.promptpayName}
      />

      <SuperAdminModal
        isOpen={isSuperAdminOpen}
        onClose={() => setIsSuperAdminOpen(false)}
        currentPlan={property.plan}
        onChangePlan={handleChangePlan}
      />

      {/* Add Tenant Modal (14 Fields) */}
      <AddTenantModal
        isOpen={isAddTenantOpen}
        onClose={() => {
          setIsAddTenantOpen(false);
          setInitialAddTenantRoomId(undefined);
        }}
        rooms={rooms}
        initialRoomId={initialAddTenantRoomId}
        onAddTenant={handleAddTenantComplete}
      />

      {/* Add Room Modal (Single & Batch) */}
      <AddRoomModal
        isOpen={isAddRoomOpen}
        onClose={() => setIsAddRoomOpen(false)}
        onAddRoom={handleAddRoom}
      />

      {/* Database Inspector Modal (ดูข้อมูลจริงใน Supabase Cloud) */}
      <DatabaseInspectorModal
        isOpen={isDbInspectorOpen}
        onClose={() => setIsDbInspectorOpen(false)}
      />

      {/* New Daily Booking Modal */}
      {isNewBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="font-bold text-base text-[var(--foreground)]">
                บันทึกการจองห้องพักรายวัน
              </h3>
              <button
                onClick={() => setIsNewBookingOpen(false)}
                className="text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddBooking} className="p-6 space-y-4 text-xs">
              {/* กรองเฉพาะห้องที่ว่างจริงเท่านั้น (Status = vacant และไม่มีผู้เช่า) ห้ามจองทับรายเดือนหรือรายวันเด็ดขาด */}
              {(() => {
                const availableDailyRooms = rooms.filter(
                  (r) => r.status === "vacant" && !r.currentTenant
                );
                const hasNoRooms = availableDailyRooms.length === 0;

                return (
                  <>
                    <div>
                      <label className="block font-semibold mb-1">
                        ห้องพัก (เฉพาะห้องที่มีสถานะ "ว่าง" เท่านั้น) <span className="text-rose-500">*</span>
                      </label>
                      {hasNoRooms ? (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-xs leading-relaxed">
                          ⚠️ ขณะนี้ไม่มีห้องว่างสำหรับเปิดจองรายวัน (ห้องทั้งหมดมีผู้เช่ารายเดือน หรือถูกจองรายวันแล้ว)
                        </div>
                      ) : (
                        <select
                          required
                          value={newBookingForm.roomNumber}
                          onChange={(e) => {
                            const selRoom = rooms.find((r) => r.roomNumber === e.target.value);
                            setNewBookingForm({
                              ...newBookingForm,
                              roomNumber: e.target.value,
                              nightlyRate: selRoom?.dailyRate || newBookingForm.nightlyRate || 650,
                            });
                          }}
                          className="w-full p-2.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] font-medium"
                        >
                          <option value="">-- กรุณาเลือกห้องพักว่าง --</option>
                          {availableDailyRooms.map((r) => (
                            <option key={r.id} value={r.roomNumber}>
                              ห้อง {r.roomNumber} ({r.type}) • รายวัน {formatCurrency(r.dailyRate || 650)}/คืน — [ห้องว่าง ✨]
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">ชื่อผู้เข้าพัก *</label>
                      <input
                        type="text"
                        required
                        placeholder="เช่น คุณกานดา รักษ์ดี"
                        value={newBookingForm.guestName}
                        onChange={(e) => setNewBookingForm({ ...newBookingForm, guestName: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">เบอร์โทรศัพท์ *</label>
                      <input
                        type="tel"
                        required
                        placeholder="08X-XXX-XXXX"
                        value={newBookingForm.guestPhone}
                        onChange={(e) => setNewBookingForm({ ...newBookingForm, guestPhone: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold mb-1">วันเช็คอิน</label>
                        <input
                          type="date"
                          value={newBookingForm.checkInDate}
                          onChange={(e) => setNewBookingForm({ ...newBookingForm, checkInDate: e.target.value })}
                          className="w-full p-2.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)]"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">วันเช็คเอาท์</label>
                        <input
                          type="date"
                          value={newBookingForm.checkOutDate}
                          onChange={(e) => setNewBookingForm({ ...newBookingForm, checkOutDate: e.target.value })}
                          className="w-full p-2.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold mb-1">ราคาต่อคืน (บาท)</label>
                        <input
                          type="number"
                          value={newBookingForm.nightlyRate}
                          onChange={(e) => setNewBookingForm({ ...newBookingForm, nightlyRate: Number(e.target.value) })}
                          className="w-full p-2.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">มัดจำคีย์การ์ด (บาท)</label>
                        <input
                          type="number"
                          value={newBookingForm.depositAmount}
                          onChange={(e) => setNewBookingForm({ ...newBookingForm, depositAmount: Number(e.target.value) })}
                          className="w-full p-2.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] font-mono"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsNewBookingOpen(false)}
                        className="px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--muted)] cursor-pointer"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        disabled={hasNoRooms || !newBookingForm.roomNumber}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold cursor-pointer"
                      >
                        บันทึกการจอง
                      </button>
                    </div>
                  </>
                );
              })()}
            </form>
          </div>
        </div>
      )}

      {/* Lease Full Agreement Modal */}
      {isLeaseModalOpen && selectedLeaseRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white text-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-3.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                เอกสารสัญญาเช่าห้องพักดิจิทัล
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold px-2.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>พิมพ์สัญญา</span>
                </button>
                <button
                  onClick={() => setIsLeaseModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer ml-1"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto space-y-4 text-xs text-slate-700">
              <div className="text-center border-b border-slate-200 pb-4">
                <h2 className="text-lg font-bold text-slate-900">หนังสือสัญญาเช่าห้องพักอาศัย</h2>
                <p className="text-slate-500">{property.name}</p>
              </div>

              <div className="space-y-2 leading-relaxed">
                <p>
                  สัญญานี้ทำขึ้นระหว่าง <strong>{property.name}</strong> (ผู้ให้เช่า) ฝ่ายหนึ่ง กับ{" "}
                  <strong>{selectedLeaseRoom.currentTenant?.fullName}</strong> เลขประจำตัวประชาชน{" "}
                  <strong>{selectedLeaseRoom.currentTenant?.idCard || "1-1002-XXXXX-XX-X"}</strong> (ผู้เช่า) อีกฝ่ายหนึ่ง
                </p>
                <p>
                  ตกลงเช่าห้องพักหมายเลข <strong>{selectedLeaseRoom.roomNumber}</strong> ชั้น {selectedLeaseRoom.floor} ในอัตราค่าเช่าเดือนละ{" "}
                  <strong>{formatCurrency(selectedLeaseRoom.monthlyRate)}</strong> โดยมีกำหนดระยะเวลาการเช่า 1 ปี
                </p>
                <p>
                  ผู้เช่าได้วางเงินประกันความเสียหายและเงินประกันการเช่าเป็นจำนวนเงิน <strong>5,000.00 บาท</strong> (ห้าพันบาทถ้วน)
                  ซึ่งผู้ให้เช่าจะคืนให้เมื่อสิ้นสุดสัญญาและหักค่าใช้จ่ายความเสียหาย ค่าน้ำ-ค่าไฟเรียบร้อยแล้ว
                </p>
              </div>

              <div className="pt-6 grid grid-cols-2 gap-6 text-center border-t border-slate-200 mt-6">
                <div>
                  <div className="h-12 border-b border-dashed border-slate-400 flex items-end justify-center pb-1 text-slate-400 italic">
                    ( ลายมือชื่อผู้ให้เช่า )
                  </div>
                  <div className="mt-1 font-semibold text-slate-800">{property.name}</div>
                </div>
                <div>
                  <div className="h-12 border-b border-dashed border-slate-400 flex items-end justify-center pb-1 text-slate-400 italic">
                    ( ลายมือชื่อดิจิทัลของผู้เช่า )
                  </div>
                  <div className="mt-1 font-semibold text-slate-800">{selectedLeaseRoom.currentTenant?.fullName}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Bento Confirmation Modal (Zero Native Alert/Confirm) */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        variant={confirmDialog.variant}
        iconType={confirmDialog.iconType}
      />
    </div>
  );
}
