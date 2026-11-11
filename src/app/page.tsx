"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FloatingAlert } from "@/components/ui/floating-alert";
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
import { InvoicesBillingView } from "@/components/invoices/invoices-billing-view";
import { SlipVerificationView } from "@/components/invoices/slip-verification-view";
import { ReceiptsListView } from "@/components/invoices/receipts-list-view";
import { SuperAdminModal } from "@/components/admin/super-admin-modal";
import { ContractManagementView } from "@/components/contracts/contract-management-view";
import { RepairsManagementView } from "@/components/repairs/repairs-management-view";
import { AccountingExportView } from "@/components/accounting/accounting-export-view";
import { BranchSettingsView } from "@/components/settings/branch-settings-view";
import { BroadcastLineView } from "@/components/broadcast/broadcast-line-view";
import { CheckoutManagementView, CheckoutExecutionData } from "@/components/checkout/checkout-management-view";
import { CleaningBoardView } from "@/components/cleaning/cleaning-board-view";
import { DailyCalendarView } from "@/components/daily/daily-calendar-view";
import { AddTenantModal } from "@/components/tenants/add-tenant-modal";
import { TenantRegistrationView } from "@/components/tenants/tenant-registration-view";
import { TenantsListView } from "@/components/tenants/tenants-list-view";
import { AddRoomModal } from "@/components/rooms/add-room-modal";
import { DailyCheckoutModal } from "@/components/dashboard/daily-checkout-modal";
import { DatabaseInspectorModal } from "@/components/admin/database-inspector-modal";
import { ConfirmModal, ConfirmVariant, ConfirmIconType } from "@/components/ui/confirm-modal";
import { DatabaseService } from "@/lib/database.service";
import { globalPopup } from "@/lib/popup-context";
import {
  isValidThaiIdCard,
  formatThaiIdCard,
  isValidThaiPhone,
  formatThaiPhone,
} from "@/lib/validators";
import { useAuth } from "@/lib/auth-context";
import { LoginView } from "@/components/auth/login-view";
import { PakdeeLogo } from "@/components/ui/pakdee-logo";
import {
  initialProperty,
  initialRooms,
  initialRepairs,
  initialContracts,
  initialExpenses,
  initialBranchSettings,
} from "@/lib/defaults";
import {
  Room,
  RoomStatus,
  PlanType,
  Invoice,
  InvoiceItem,
  Tenant,
  Property,
  DailyBooking,
  RepairItem,
  ContractItem,
  ExpenseItem,
  BranchSettingsDetail,
  BroadcastItem,
  defaultRoomTypes,
} from "@/types/dormitory";
import { formatCurrency, formatDateThai, formatMonthThai, cn } from "@/lib/utils";
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
  ChevronRight,
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
  const [branchAccessUserId, setBranchAccessUserId] = useState<string | null>(null);
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
  const [dailyCheckoutBooking, setDailyCheckoutBooking] = useState<DailyBooking | null>(null);

  // LINE OA Broadcast state
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);

  // Toast feedback state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" | "warning" } | null>(null);

  // Invoices Filtering state
  const [invoiceMonthFilter, setInvoiceMonthFilter] = useState<string>("all");
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState<string>("");

  // Tenant Directory Filter State (User Requirement 3)
  const [tenantFilterTab, setTenantFilterTab] = useState<"all" | "monthly" | "daily">("all");
  const [tenantSearchQuery, setTenantSearchQuery] = useState<string>("");

  // Global Header & Room Matrix Search Query (ค้นหาเลขห้อง และชื่อผู้เข้าพัก)
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>("");

  const showToast = (message: string, type: "success" | "error" | "info" | "warning" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);

    // ป๊อปอัปแจ้งเตือนลอยข้างหน้า (Center Floating Modal) เมื่อมี Error หรือ Warning ตาม Requirement 2
    if (type === "warning") {
      globalPopup.show({
        level: "warning",
        title: "ข้อความแจ้งเตือน (กรุณาตรวจสอบข้อมูล)",
        message,
        confirmText: "เข้าใจแล้ว",
        hideCancel: true,
      });
    } else if (type === "error") {
      globalPopup.show({
        level: "error",
        title: "เกิดข้อผิดพลาดในการทำรายการ",
        message,
        confirmText: "ตกลง",
        hideCancel: true,
      });
    }
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

  const [newBookingForm, setNewBookingForm] = useState<{
    bookingType: "daily" | "monthly";
    roomNumber: string;
    guestName: string;
    guestPhone: string;
    idCard: string;
    vehiclePlate: string;
    checkInDate: string;
    checkOutDate: string;
    nightlyRate: number | "";
    monthlyRate?: number | "";
    depositAmount: number | "";
    roomDeposit: number | "";
  }>({
    bookingType: "daily",
    roomNumber: "102",
    guestName: "",
    guestPhone: "",
    idCard: "",
    vehiclePlate: "",
    checkInDate: new Date().toISOString().slice(0, 10),
    checkOutDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    nightlyRate: 650,
    monthlyRate: 4000,
    depositAmount: 500,
    roomDeposit: 500,
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

  // Checkout settlement state (รองรับค่าว่าง "" เพื่อให้ลบเลข 0 ได้หมดจดตาม Requirement 3 & 5)
  const [checkoutRoomId, setCheckoutRoomId] = useState<string>("");
  const [checkoutElecPrev, setCheckoutElecPrev] = useState<number | "">(0);
  const [checkoutElecCurr, setCheckoutElecCurr] = useState<number | "">(0);
  const [checkoutWaterPrev, setCheckoutWaterPrev] = useState<number | "">(0);
  const [checkoutWaterCurr, setCheckoutWaterCurr] = useState<number | "">(0);
  const [checkoutCleaningFee, setCheckoutCleaningFee] = useState<number | "">(500);
  const [checkoutDamageFee, setCheckoutDamageFee] = useState<number | "">(0);
  const [checkoutDepositAmount, setCheckoutDepositAmount] = useState<number | "">(8000);
  const [initialAddTenantRoomId, setInitialAddTenantRoomId] = useState<string | undefined>(undefined);

  // Global Styled Confirmation Modal State (No native popups)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    hideCancel?: boolean;
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

  // Auto-collapse sidebar on mobile screens on initial mount
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsSidebarCollapsed(true);
    }
  }, []);

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

      const accessibleBranches = await DatabaseService.getAllProperties();
      setBranches(accessibleBranches);
      const activeId =
        typeof targetPropertyId === "string" && targetPropertyId
          ? targetPropertyId
          : DatabaseService.getActivePropertyId();
      if (!accessibleBranches.some((branch) => branch.id === activeId)) {
        setRooms([]);
        setTenants([]);
        setInvoices([]);
        setBroadcasts([]);
        setBranchAccessUserId(currentUser?.id || null);
        setCurrentTab("branches");
        setIsBranchSelectorOpen(true);
        return;
      }
      setBranchAccessUserId(currentUser?.id || null);
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

      if (allProps) {
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
        // Coherence: Reconcile room overdue status with real invoice payment status
        let finalRooms = roomsData;
        if (invsData) {
          const unpaidRoomNumbers = new Set(
            invsData.filter((i) => i.status !== "paid").map((i) => i.roomNumber)
          );

          finalRooms = roomsData.map((room) => {
            const hasUnpaid = unpaidRoomNumbers.has(room.roomNumber);
            // If room was marked overdue, but has NO unpaid invoices in the system (e.g. invoice was paid), restore status to occupied
            if (room.status === "overdue" && !hasUnpaid) {
              const restoredStatus: RoomStatus = room.currentTenant ? "occupied" : "vacant";
              DatabaseService.updateRoomStatus(room.id, restoredStatus);
              return {
                ...room,
                status: restoredStatus,
                lastBillPaid: true,
              };
            }
            return room;
          });
        }

        setRooms(finalRooms);
        // ให้หน้า Checkout เริ่มต้นที่ "-- กรุณาเลือกห้องพักที่ต้องการย้ายออก --" เพื่อให้ผู้ใช้เลือกเองเสมอ
      }

      if (invsData) {
        // Defensive fix: ตรวจสอบและแก้ไขบิลที่มียูนิตไฟ/น้ำเป็น 0 แต่คิดเงิน 100 บาท ให้กลายเป็น 0 บาท
        const sanitizedInvs = invsData.map((inv) => {
          let modified = false;
          const newItems = (inv.items || []).map((item) => {
            const isZeroUnits = item.units === 0 || (item.meterPrev !== undefined && item.meterCurr !== undefined && item.meterPrev === item.meterCurr);
            const isUtility = item.name.includes("ค่าไฟ") || item.name.includes("ค่าน้ำ");
            if (isZeroUnits && isUtility && item.amount > 0) {
              modified = true;
              return { ...item, amount: 0 };
            }
            return item;
          });
          if (modified) {
            const newTotal = newItems.reduce((acc, it) => acc + (it.amount || 0), 0);
            return {
              ...inv,
              items: newItems,
              totalAmount: newTotal,
              remainingAmount: inv.status === "paid" ? 0 : newTotal - (inv.paidAmount || 0),
            };
          }
          return inv;
        });

        setInvoices(sanitizedInvs);
        if (sanitizedInvs.length > 0) {
          setActiveInvoice(sanitizedInvs[0]);
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
  }, [currentUser?.id]);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) return;
    loadData();

    // Reload from Supabase, debounced: one save touches many rows/tables and each
    // fires its own realtime event, so collapse a burst into a single reload.
    let reloadTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleReload = () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => {
        reloadTimer = null;
        loadData();
      }, 800);
    };

    // Supabase Live Cloud Realtime listener (changes made on other devices)
    const handleRealtimeUpdate = (e: any) => {
      console.log("[App] Live Realtime DB update received from Supabase:", e?.detail?.table);
      scheduleReload();
    };

    // Fallback when realtime is unavailable: refresh when the user comes back to this tab/window
    const handleVisible = () => {
      if (document.visibilityState === "visible") scheduleReload();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("pakdee_db_updated", handleRealtimeUpdate);
      window.addEventListener("focus", scheduleReload);
      document.addEventListener("visibilitychange", handleVisible);
    }

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      if (typeof window !== "undefined") {
        window.removeEventListener("pakdee_db_updated", handleRealtimeUpdate);
        window.removeEventListener("focus", scheduleReload);
        document.removeEventListener("visibilitychange", handleVisible);
      }
    };
  }, [loadData, currentUser?.id, isAuthLoading, isAuthenticated]);

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
    "tenant-new": { path: "/tenants/new", title: "ลงทะเบียนผู้เช่าใหม่และทำสัญญาเช่า" },
    leases: { path: "/contracts", title: "สัญญาเช่าดิจิทัล (เซ็นออนไลน์)" },
    checkout: { path: "/checkout", title: "ระบบสรุปย้ายออก & คืนเงินประกัน" },
    cleaning: { path: "/cleaning", title: "งานแม่บ้านทำความสะอาด" },
    repairs: { path: "/repairs", title: "ระบบแจ้งซ่อมบำรุงห้องพัก" },
    reports: { path: "/reports", title: "บัญชีรายรับ-รายจ่าย & กำไรขาดทุน" },
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
    if (clean === "/contracts" || clean === "/leases") {
      return { tab: "leases", isBranches: false };
    }
    if (clean === "/accounting" || clean === "/reports") {
      return { tab: "reports", isBranches: false };
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

  // Handler: Add Rooms in Batch (Atomic Persistence - Guaranteed 0 lost rooms)
  const handleAddBatchRooms = async (roomsDataList: {
    roomNumber: string;
    floor: number;
    type: string;
    monthlyRate: number;
    dailyRate?: number;
    status: RoomStatus;
  }[]) => {
    // Enforce Starter limits if applicable
    if (property.plan === "starter" && rooms.length + roomsDataList.length > 30) {
      setConfirmDialog({
        isOpen: true,
        title: "ครบขีดจำกัด 30 ห้องของแพ็กเกจ Starter",
        description: `แพ็กเกจ Starter รองรับสูงสุด 30 ห้อง (ปัจจุบันมี ${rooms.length} ห้อง และกำลังเพิ่มอีก ${roomsDataList.length} ห้อง รวมเป็น ${rooms.length + roomsDataList.length} ห้อง) หากต้องการเพิ่มห้องพักไม่จำกัด กรุณาอัปเกรดเป็นแพ็กเกจ Pro`,
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
      const createdRooms = await DatabaseService.addRoomsBatch(
        roomsDataList.map((r) => ({ ...r, propertyId: property.id })),
        property.id
      );

      setRooms((prev) => {
        const existingNumbers = new Set(prev.map((r) => r.roomNumber));
        const updated = [...prev];
        createdRooms.forEach((cr) => {
          if (existingNumbers.has(cr.roomNumber)) {
            const idx = updated.findIndex((r) => r.roomNumber === cr.roomNumber);
            if (idx >= 0) updated[idx] = cr;
          } else {
            updated.push(cr);
          }
        });
        return updated.sort((a, b) =>
          a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true })
        );
      });

      const freshProps = await DatabaseService.getAllProperties();
      setBranches(freshProps);
      showToast(`เพิ่มห้องพักเป็นชุด ${createdRooms.length} ห้อง เรียบร้อยแล้ว (บันทึกลงฐานข้อมูลถาวร) ✓`, "success");
    } catch (err) {
      console.error("Error adding batch rooms:", err);
      showToast("เกิดข้อผิดพลาดในการเพิ่มห้องพักเป็นชุด", "error");
    }
  };

  // Helper: ตรวจสอบว่าห้องพักมีผู้เช่าหรือลูกค้าพักอาศัยอยู่หรือไม่
  const isRoomOccupied = (room?: Room | null): boolean => {
    if (!room) return false;
    if (room.status === "occupied" || room.status === "daily" || room.status === "overdue") {
      return true;
    }
    if (room.currentTenant && (room.currentTenant.fullName || (room.currentTenant as any).name)) {
      return true;
    }
    return false;
  };

  // Handler: Delete room (ป้องกันการลบห้องที่มีผู้เช่าอยู่ พร้อม Popup แจ้งเตือน)
  const handleDeleteRoom = (roomId: string) => {
    const target = rooms.find((r) => r.id === roomId);
    if (!target) return;

    // Guard: หากมีผู้เช่าอยู่ ห้ามลบเด็ดขาด และแสดง Modal แจ้งเตือน
    if (isRoomOccupied(target)) {
      const occupantDesc =
        target.currentTenant?.fullName ||
        (target.status === "daily" ? "ลูกค้าจองห้องพักรายวัน" : "มีสัญญาเช่าที่ยังเปิดใช้งานอยู่");

      setConfirmDialog({
        isOpen: true,
        title: `ไม่สามารถลบห้องพัก ${target.roomNumber} ได้`,
        description: `ห้องพัก ${target.roomNumber} มีผู้เช่าหรือลูกค้าเข้าพักอยู่ (${occupantDesc}) สถานะห้อง: "${
          target.status === "daily" ? "รายวัน" : target.status === "overdue" ? "ค้างชำระ" : "มีผู้เช่า"
        }"\n\nระบบไม่อนุญาตให้ลบห้องพักที่มีผู้เช่าอยู่ กรุณาทำรายการย้ายออก (Checkout) หรือยกเลิกสัญญาเช่าให้เรียบร้อยก่อนทำการลบห้องพักนี้`,
        confirmText: "รับทราบ",
        cancelText: "",
        hideCancel: true,
        variant: "warning",
        iconType: "warning",
        onConfirm: () => {},
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: `ยืนยันการลบห้องพัก ${target.roomNumber}`,
      description: `คุณแน่ใจหรือไม่ว่าต้องการลบห้อง "${target.roomNumber}" ออกจากระบบ? ข้อมูลประวัติมิเตอร์และบิลของห้องนี้จะถูกลบทั้งหมด`,
      confirmText: "ลบห้องพัก",
      cancelText: "ยกเลิก",
      variant: "danger",
      iconType: "delete",
      onConfirm: async () => {
        try {
          const result = await DatabaseService.deleteRoom(roomId);
          if (!result.success) {
            showToast(result.error || "เกิดข้อผิดพลาดในการลบห้องจากฐานข้อมูล", "error");
            return;
          }
          setRooms((prev) => prev.filter((r) => r.id !== roomId));
          if (selectedRoom?.id === roomId) {
            setSelectedRoom(null);
          }
          const freshProps = await DatabaseService.getAllProperties();
          setBranches(freshProps);
          showToast(`ลบห้อง ${target.roomNumber} เรียบร้อยแล้ว`, "success");
        } catch (err) {
          console.error("Error deleting room:", err);
          showToast("เกิดข้อผิดพลาดในการลบห้อง", "error");
        }
      },
    });
  };

  // Handler: Batch delete rooms (ลบหลายห้องพร้อมกัน พร้อมบล็อกห้องที่มีผู้เช่า)
  const handleDeleteRooms = (roomIds: string[]) => {
    const targetRooms = rooms.filter((r) => roomIds.includes(r.id));
    const occupiedRooms = targetRooms.filter(isRoomOccupied);

    // Guard: หากมีห้องที่เลือกมีผู้เช่าอยู่ ให้แสดง Popup แจ้งเตือนและไม่อนุญาตให้ลบ
    if (occupiedRooms.length > 0) {
      const occupiedNumbers = occupiedRooms.map((r) => r.roomNumber).join(", ");
      setConfirmDialog({
        isOpen: true,
        title: `ไม่สามารถลบห้องพักที่มีผู้เช่าอยู่ได้`,
        description: `พบห้องพักจำนวน ${occupiedRooms.length} ห้องที่มีผู้เช่าหรือลูกค้าพักอาศัยอยู่ (ห้อง: ${occupiedNumbers})\n\nระบบไม่อนุญาตให้ลบห้องที่มีผู้เช่า กรุณาทำรายการย้ายออก (Checkout) หรือยกเลิกการเลือกห้องดังกล่าวออกก่อน`,
        confirmText: "รับทราบ",
        cancelText: "",
        hideCancel: true,
        variant: "warning",
        iconType: "warning",
        onConfirm: () => {},
      });
      return;
    }

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
          const result = await DatabaseService.deleteRooms(roomIds);
          if (!result.success) {
            showToast(result.error || "เกิดข้อผิดพลาดในการลบห้องพักจากฐานข้อมูล", "error");
            return;
          }
          setRooms((prev) => prev.filter((r) => !roomIds.includes(r.id)));
          if (selectedRoom && roomIds.includes(selectedRoom.id)) {
            setSelectedRoom(null);
          }
          const freshProps = await DatabaseService.getAllProperties();
          setBranches(freshProps);
          showToast(`ลบห้องพักจำนวน ${roomIds.length} ห้องเรียบร้อยแล้ว`, "success");
        } catch (err) {
          console.error("Error batch deleting rooms:", err);
          showToast("เกิดข้อผิดพลาดในการลบห้องพัก", "error");
        }
      },
    });
  };

  // Handler: Delete branch (ลบสาขา - ได้รับการยืนยันรหัสผ่านและสถิติจาก BranchSelectorView เรียบร้อยแล้ว)
  const handleDeleteBranch = async (branchId: string): Promise<boolean> => {
    const target = branches.find((b) => b.id === branchId);
    const branchName = target ? target.name : "สาขานี้";
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
          } else {
            setProperty({
              id: "",
              name: "ยังไม่มีสาขา",
              address: "",
              phone: "",
              promptpayNumber: "",
              promptpayName: "",
              electricRate: 8,
              waterRate: 18,
              plan: "starter",
            });
            setCurrentTab("branches");
            setIsBranchSelectorOpen(true);
          }
        }
        return true;
      } else {
        showToast("เกิดข้อผิดพลาดในการลบสาขา", "error");
        return false;
      }
    } catch (err) {
      console.error("Error deleting branch:", err);
      showToast("เกิดข้อผิดพลาดในการลบสาขา", "error");
      return false;
    }
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
    const targetRoom = rooms.find((r) => r.id === roomId || r.roomNumber === roomId);

    // Safeguard: ป้องกันการกดเปลี่ยนสถานะห้องที่มีผู้เช่าอยู่ (occupied, overdue, daily) โดยยังไม่ได้แจ้งย้ายออก
    // หมายเหตุ: หากห้องอยู่ในสถานะ "cleaning" หรือ "maintenance" อยู่แล้ว จะสามารถกดยืนยันเป็น "vacant" (ห้องว่าง) ได้ทันที
    if (
      targetRoom &&
      targetRoom.status !== "cleaning" &&
      targetRoom.status !== "maintenance" &&
      (targetRoom.status === "occupied" || targetRoom.status === "overdue" || targetRoom.status === "daily" || !!targetRoom.currentTenant) &&
      (newStatus === "cleaning" || newStatus === "vacant")
    ) {
      const isDailyRoom =
        targetRoom.status === "daily" ||
        dailyBookings.some((b) => b.roomNumber === targetRoom.roomNumber && (b.status === "confirmed" || b.status === "checked_in")) ||
        targetRoom.currentTenant?.notes?.includes("[ผู้เข้าพักรายวัน]");

      if (isDailyRoom) {
        // รายวัน: ให้เปิดหน้าต่างเช็คเอาท์รายวัน (รูปที่ 2) โดยตรง ไม่ไปหน้าย้ายออกรายเดือน!
        const booking = dailyBookings.find((b) => b.roomNumber === targetRoom.roomNumber && (b.status === "confirmed" || b.status === "checked_in"));
        const bookingId = booking?.id || `b-${targetRoom.roomNumber}`;
        const keyDeposit = booking?.keyDeposit || 500;
        setSelectedRoom(null);
        handleDailyCheckOut(bookingId, targetRoom.roomNumber, keyDeposit);
        return;
      }

      globalPopup.warning(
        "ไม่สามารถส่งห้องทำความสะอาดได้",
        `ห้อง ${targetRoom.roomNumber} กำลังมีผู้เช่ารายเดือนอยู่ (${targetRoom.currentTenant?.fullName || "ผู้เช่า"})\n\nไม่สามารถปรับเป็นสถานะทำความสะอาดได้ทันที เพราะจะทำให้ข้อมูลผู้เช่าและยอดค้างชำระถูกล้างออก\n\nกรุณาใช้ฟังก์ชัน "แจ้งย้ายออก / คืนห้อง" เพื่อคิดเงินค่าน้ำไฟงวดสุดท้ายและตัดเงินประกันให้เสร็จสิ้นก่อน`,
        () => {
          setCheckoutRoomId(targetRoom.id);
          setCheckoutElecPrev(targetRoom.currentElectricMeter);
          setCheckoutElecCurr(targetRoom.currentElectricMeter);
          setCheckoutWaterPrev(targetRoom.currentWaterMeter);
          setCheckoutWaterCurr(targetRoom.currentWaterMeter);
          const act = contracts.find((c) => c.roomNumber === targetRoom.roomNumber && c.status === "active");
          const dep = act?.depositAmount || (targetRoom as any).depositAmount || targetRoom.currentTenant?.depositAmount || (targetRoom.monthlyRate * 2) || 8000;
          setCheckoutDepositAmount(dep);
          setSelectedRoom(null);
          handleTabChange("checkout");
        },
        "ปิด"
      );
      return;
    }

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
    if (newStatus === "vacant" || newStatus === "cleaning") {
      if (targetRoom) {
        setContracts((prev) =>
          prev.map((c) =>
            c.roomNumber === targetRoom.roomNumber && c.status === "active"
              ? { ...c, status: "terminated" }
              : c
          )
        );
        setDailyBookings((prev) => prev.filter((b) => b.roomNumber !== targetRoom.roomNumber));
        await DatabaseService.terminateRoomContracts(targetRoom.roomNumber, targetRoom.propertyId);
        await DatabaseService.removeDailyBooking("", targetRoom.roomNumber);
      }
    }
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

    // ถ้าระบุตัวกรองเดือนอยู่ ให้ออกบิลของรอบเดือนนั้น หากไม่ได้เลือกให้ใช้เดือนปัจจุบัน
    const currentMonth = invoiceMonthFilter !== "all" ? invoiceMonthFilter : new Date().toISOString().slice(0, 7);
    let successCount = 0;

    for (const room of activeRooms) {
      // Pull actual meter reading if already recorded for this month
      const latestReading = await DatabaseService.getLatestMeterReading(room.id, currentMonth);
      const electricUnits = latestReading?.electric_units !== undefined ? latestReading.electric_units : 0;
      const waterUnits = latestReading?.water_units !== undefined ? latestReading.water_units : 0;
      const elecPrev = latestReading?.electric_prev !== undefined ? latestReading.electric_prev : room.currentElectricMeter;
      const elecCurr = latestReading?.electric_curr !== undefined ? latestReading.electric_curr : room.currentElectricMeter + electricUnits;
      const waterPrev = latestReading?.water_prev !== undefined ? latestReading.water_prev : room.currentWaterMeter;
      const waterCurr = latestReading?.water_curr !== undefined ? latestReading.water_curr : room.currentWaterMeter + waterUnits;

      // กฎการเงิน: หากไม่มีการใช้งาน หรือมิเตอร์ไม่ขยับ (units <= 0) จะคิดค่าไฟและค่าน้ำเป็น 0 บาทเสมอ (ไม่คิดขั้นต่ำ)
      const electricAmount = electricUnits <= 0
        ? 0
        : (branchSettings.useMinElectric
            ? Math.max(branchSettings.minElectricFee, electricUnits * property.electricRate)
            : electricUnits * property.electricRate);
      const waterAmount = waterUnits <= 0
        ? 0
        : (branchSettings.useMinWater
            ? Math.max(branchSettings.minWaterFee, waterUnits * property.waterRate)
            : waterUnits * property.waterRate);
      const tenantContract = contracts.find(
        (c) => c.roomNumber === room.roomNumber && c.status === "active"
      );
      const hasCommonFee = room.currentTenant?.hasCommonFee ?? tenantContract?.hasCommonFee;
      const commonFee = hasCommonFee === false ? 0 : Math.max(0,
        Number(room.currentTenant?.commonFee ?? tenantContract?.commonFee ?? branchSettings.commonFee ?? 0) || 0
      );
      let totalAmount = room.monthlyRate + electricAmount + waterAmount + commonFee;

      const items: InvoiceItem[] = [
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
        ...(commonFee > 0 ? [{ name: "ค่าส่วนกลางและขยะ", amount: commonFee }] : []),
      ];

      // Feature Toggles: เช็คออปชันเช่าทีวีและตู้เย็นจากสัญญาเช่า / ผู้เช่า
      const hasTv = room.currentTenant?.hasTv ?? tenantContract?.hasTv;
      const tvFee = (room.currentTenant?.tvRentalFee || tenantContract?.tvRentalFee) ?? 300;
      if (hasTv) {
        items.push({ name: "ค่าบริการเช่าทีวี (Smart TV)", amount: tvFee });
        totalAmount += tvFee;
      }

      const hasFridge = room.currentTenant?.hasFridge ?? tenantContract?.hasFridge;
      const fridgeFee = (room.currentTenant?.fridgeRentalFee || tenantContract?.fridgeRentalFee) ?? 300;
      if (hasFridge) {
        items.push({ name: "ค่าบริการเช่าตู้เย็น (Refrigerator)", amount: fridgeFee });
        totalAmount += fridgeFee;
      }

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
        status: "unpaid",
      });

      if (ok) successCount++;
    }

    showToast(`ออกบิลรอบเดือน ${currentMonth} สำเร็จ ${successCount} ใบ`, "success");
    const updatedInvs = await DatabaseService.getInvoices(property.id);
    setInvoices(updatedInvs);
  };

  // Handler: Batch Send LINE Invoices
  const [isSendingLineBatch, setIsSendingLineBatch] = useState<boolean>(false);
  const handleSendLineAllInvoices = async () => {
    const unpaid = invoices.filter((i) => i.status !== "paid");
    if (unpaid.length === 0) {
      showToast("ไม่มีบิลค้างชำระที่ต้องส่งเข้า LINE ในขณะนี้", "info");
      return;
    }

    setIsSendingLineBatch(true);
    try {
      const res = await fetch("/api/line/send-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "batch", propertyId: property.id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`📱 ${data.message} (${data.deliveredRooms?.join(", ") || ""})`, "success");
        const freshInvs = await DatabaseService.getInvoices(property.id);
        setInvoices(freshInvs);
      } else {
        showToast("เกิดข้อผิดพลาดในการส่ง LINE: " + (data.error || "ไม่ทราบสาเหตุ"), "error");
      }
    } catch (e: any) {
      showToast("ไม่สามารถส่ง LINE ได้: " + e.message, "error");
    } finally {
      setIsSendingLineBatch(false);
    }
  };

  // Handler: Verify slip (AI & Manual Verification with Anti-Fake & Deduplication)
  const handleVerifySlip = async (
    invoiceId: string,
    slipData?: {
      transRef?: string;
      bankName?: string;
      senderName?: string;
      transferTime?: string;
      amount?: number;
      slipUrl?: string;
      isFake?: boolean;
    }
  ) => {
    showToast("การตรวจสลิปต้องใช้ผลจาก Slip2Go ฝั่งเซิร์ฟเวอร์ กรุณาส่งรูปผ่าน LINE", "warning");
  };

  const handleRejectSlip = async (invoiceId: string, reason?: string) => {
    const targetInv = invoices.find((i) => i.id === invoiceId);
    const rejectReason = reason || "ยอดเงินไม่ตรง หรือภาพสลิปไม่สมบูรณ์";

    await DatabaseService.updateInvoiceStatus(invoiceId, "unpaid", undefined, {
      slipStatus: "action_needed",
      slipRejectReason: rejectReason,
    });

    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? { ...inv, slipStatus: "action_needed", slipRejectReason: rejectReason }
          : inv
      )
    );

    // ส่งข้อความ LINE แจ้งเตือนผู้เช่าว่าสลิปไม่ผ่าน
    fetch("/api/line/notify-slip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoiceId,
        action: "reject",
        reason: rejectReason,
        propertyId: property.id,
      }),
    }).catch((err) => console.warn("[NOTIFY-SLIP] Notify reject failed:", err));

    showToast(`ปฏิเสธสลิปบิลห้อง ${targetInv?.roomNumber || invoiceId} เรียบร้อย (${rejectReason})`, "warning");
  };

  // Handler: Mark invoice as paid (เชื่อมต่อระบบ AI Slip Verification)
  const handleMarkAsPaid = async (
    invoiceId: string,
    paymentMethod: "cash" | "promptpay" | "transfer" = "cash"
  ) => {
    try {
      const targetInv = invoices.find((i) => i.id === invoiceId);
      if (!targetInv) return;
      const totalAmount = Number(targetInv.totalAmount) || 0;
      const nowFormatted = new Date().toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }) + " น.";
      const nowIso = new Date().toISOString();

      // 1. บันทึกสถานะชำระแล้วลงในฐานข้อมูล
      await DatabaseService.updateInvoiceStatus(invoiceId, "paid", totalAmount, {
        slipStatus: "passed",
        slipVerifiedBy: "manual",
        slipVerifiedAt: nowIso,
      });

      // 2. อัปเดต Local State ของ Invoices ทันที
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoiceId
            ? {
                ...inv,
                status: "paid",
                paidAmount: totalAmount,
                remainingAmount: 0,
                paidAt: nowFormatted,
                slipStatus: "passed",
                slipVerifiedBy: "manual",
                slipVerifiedAt: nowIso,
              }
            : inv
        )
      );

      // 3. ปลดสถานะค้างชำระ (overdue) ของห้องพัก หากไม่มีบิลค้างชำระอื่น
      const room = rooms.find((r) => r.roomNumber === targetInv.roomNumber);
      if (room && room.status === "overdue") {
        const remainingUnpaid = invoices.some(
          (i) => i.roomNumber === targetInv.roomNumber && i.id !== invoiceId && i.status !== "paid"
        );
        if (!remainingUnpaid) {
          await DatabaseService.updateRoomStatus(room.id, "occupied");
          setRooms((prev) =>
            prev.map((r) => (r.id === room.id ? { ...r, status: "occupied" } : r))
          );
        }
      }

      // 4. อัปเดต Active Modal ถ้ากำลังเปิดดูบิลนี้อยู่
      if (activeInvoice && activeInvoice.id === invoiceId) {
        setActiveInvoice({
          ...activeInvoice,
          status: "paid",
          paidAmount: totalAmount,
          remainingAmount: 0,
          paidAt: nowFormatted,
        });
      }

      showToast(
        `✓ รับชำระเงิน${paymentMethod === "cash" ? "สด" : ""} ห้อง ${targetInv.roomNumber} (฿${totalAmount.toLocaleString()}) เรียบร้อยแล้ว`,
        "success"
      );
    } catch (err: any) {
      console.error("handleMarkAsPaid error:", err);
      showToast("เกิดข้อผิดพลาดในการบันทึกรับชำระเงิน: " + (err?.message || "ไม่ทราบสาเหตุ"), "error");
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
    if (!newBookingForm.guestName.trim()) {
      showToast("กรุณากรอกชื่อและนามสกุลผู้เข้าพัก", "warning");
      return;
    }
    const cleanPhone = (newBookingForm.guestPhone || "").replace(/\D/g, "");
    if (!isValidThaiPhone(cleanPhone)) {
      showToast("เบอร์โทรศัพท์ไม่ถูกต้อง (ต้องเป็น 10 หลัก ขึ้นต้นด้วย 0)", "warning");
      return;
    }
    const cleanId = (newBookingForm.idCard || "").replace(/\D/g, "");
    if (!cleanId) {
      showToast("กรุณากรอกเลขประจำตัวประชาชน 13 หลัก", "warning");
      return;
    }
    if (!isValidThaiIdCard(cleanId)) {
      showToast("เลขประจำตัวประชาชนไม่ถูกต้องตามมาตรฐาน 13 หลัก (กรุณาตรวจสอบความถูกต้องและ Checksum)", "warning");
      return;
    }
    if (!newBookingForm.roomNumber) {
      showToast("กรุณาเลือกห้องพักว่างที่ต้องการจอง", "warning");
      return;
    }

    // Defensive check: ห้องพักต้องอยู่ในสถานะ "vacant" เท่านั้น และไม่มีผู้เช่า
    const targetRoom = rooms.find((r) => r.roomNumber === newBookingForm.roomNumber);
    if (!targetRoom || targetRoom.status !== "vacant" || targetRoom.currentTenant) {
      const statusThai =
        targetRoom?.status === "cleaning"
          ? "รอทำความสะอาด"
          : targetRoom?.status === "occupied"
          ? "มีผู้เช่ารายเดือน"
          : targetRoom?.status === "daily"
          ? "มีผู้เช่ารายวัน"
          : targetRoom?.status === "overdue"
          ? "ค้างชำระ"
          : targetRoom?.status || "ไม่พบห้อง";
      showToast(
        `ห้อง ${newBookingForm.roomNumber} ไม่สามารถจองได้ เนื่องจากอยู่ในสถานะ "${statusThai}" (ต้องกดยืนยันเป็นห้องว่างก่อนจึงจะเปิดจองได้)`,
        "error"
      );
      return;
    }

    // บันทึกการจองห้องพักรายวัน (Daily Booking) ตาม Requirement 1
    const checkIn = new Date(newBookingForm.checkInDate);
    const checkOut = new Date(newBookingForm.checkOutDate);
    if (checkOut.getTime() <= checkIn.getTime()) {
      showToast("วันที่เช็คเอาท์ต้องอยู่หลังวันที่เช็คอินอย่างน้อย 1 วัน", "error");
      return;
    }
    const diffTime = checkOut.getTime() - checkIn.getTime();
    const totalNights = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
    const nightlyRateVal = Number(newBookingForm.nightlyRate) || 650;
    const keyDepositVal = Number(newBookingForm.depositAmount) || 0;
    const roomDepositVal = Number(newBookingForm.roomDeposit) || 0;
    const totalAmount = totalNights * nightlyRateVal;

    const newBooking: DailyBooking = {
      id: `b-${Date.now()}`,
      propertyId: property.id,
      roomNumber: newBookingForm.roomNumber,
      guestName: newBookingForm.guestName.trim(),
      guestPhone: newBookingForm.guestPhone.trim(),
      idCard: newBookingForm.idCard.trim(),
      vehiclePlate: newBookingForm.vehiclePlate?.trim() || "",
      checkInDate: newBookingForm.checkInDate,
      checkInTime: "14:00",
      checkOutDate: newBookingForm.checkOutDate,
      checkOutTime: "12:00",
      nights: totalNights,
      dailyRate: nightlyRateVal,
      totalRoomPrice: totalAmount,
      keyDeposit: keyDepositVal,
      roomDeposit: roomDepositVal,
      electricCheckIn: targetRoom.currentElectricMeter,
      waterCheckIn: targetRoom.currentWaterMeter,
      status: "confirmed",
    };

    const saved = await DatabaseService.addDailyBooking(newBooking, property.id);
    setDailyBookings((prev) => [saved, ...prev]);

    // บันทึกข้อมูลผู้เข้าพักรายวันเข้าสู่ระบบทะเบียนผู้เช่า (User Requirement 3)
    const dailyTenant = await DatabaseService.createTenant({
      fullName: newBooking.guestName,
      phone: newBooking.guestPhone,
      idCard: newBookingForm.idCard || "",
      vehiclePlate: newBookingForm.vehiclePlate || "",
      roomNumber: newBooking.roomNumber,
      roomId: targetRoom.id,
      notes: `[ผู้เข้าพักรายวัน] ห้อง ${newBooking.roomNumber} (${newBooking.checkInDate} ถึง ${newBooking.checkOutDate})`,
      depositAmount: (newBooking.keyDeposit || 0) + (newBooking.roomDeposit || 0),
    });
    if (dailyTenant) {
      setTenants((prev) => [dailyTenant, ...prev]);
    }

    // Update room status to 'daily' in database & local state
    if (targetRoom) {
      await DatabaseService.updateRoomStatus(targetRoom.id, "daily");
    }
    setRooms((prev) =>
      prev.map((r) =>
        r.roomNumber === newBookingForm.roomNumber
          ? {
              ...r,
              status: "daily",
              currentTenant: dailyTenant || {
                id: `t-${newBooking.id}`,
                fullName: newBooking.guestName,
                phone: newBooking.guestPhone,
                idCard: newBookingForm.idCard,
                vehiclePlate: newBookingForm.vehiclePlate,
                roomNumber: newBooking.roomNumber,
                roomId: targetRoom.id,
              },
            }
          : r
      )
    );

    // Refresh branch rooms count
    const freshProps = await DatabaseService.getAllProperties();
    setBranches(freshProps);

    // Reset daily booking form state
    setNewBookingForm({
      bookingType: "daily",
      roomNumber: "",
      guestName: "",
      guestPhone: "",
      idCard: "",
      vehiclePlate: "",
      checkInDate: new Date().toISOString().slice(0, 10),
      checkOutDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      nightlyRate: 650,
      depositAmount: 500,
      roomDeposit: 500,
    });

    setIsNewBookingOpen(false);
    showToast(`บันทึกการจองห้องพักรายวัน ห้อง ${newBooking.roomNumber} เรียบร้อยแล้ว (อัปเดตสถานะห้องในผังเป็น "จองรายวัน")`, "success");
  };

  const handleDailyCheckIn = async (bookingId: string, roomNumber: string) => {
    try {
      const targetRoom = rooms.find((r) => r.roomNumber === roomNumber);
      await DatabaseService.updateDailyBooking(bookingId, {
        status: "checked_in",
        electricCheckIn: targetRoom?.currentElectricMeter,
        waterCheckIn: targetRoom?.currentWaterMeter,
      });
      if (targetRoom) {
        await DatabaseService.updateRoomStatus(targetRoom.id, "daily");
      }
      setDailyBookings((prev) =>
        prev.map((item) =>
          item.id === bookingId
            ? {
                ...item,
                status: "checked_in",
                electricCheckIn: targetRoom?.currentElectricMeter,
                waterCheckIn: targetRoom?.currentWaterMeter,
              }
            : item
        )
      );
      setRooms((prev) =>
        prev.map((r) => (r.roomNumber === roomNumber ? { ...r, status: "daily" } : r))
      );
      const freshProps = await DatabaseService.getAllProperties();
      setBranches(freshProps);
      showToast(`เช็คอินห้อง ${roomNumber} เรียบร้อยแล้ว (สถานะห้อง: เข้าพักรายวันแล้ว) ✓`, "success");
    } catch (err) {
      console.error(err);
      showToast("เกิดข้อผิดพลาดในการเช็คอิน", "error");
    }
  };

  const handleDailyCheckOut = (bookingId: string, roomNumber: string, keyDeposit: number) => {
    const targetRoom = rooms.find((r) => r.roomNumber === roomNumber);
    const existing = dailyBookings.find((b) => b.id === bookingId || b.roomNumber === roomNumber);
    const booking: DailyBooking = existing || {
      id: bookingId || `b-${roomNumber}-${Date.now()}`,
      roomNumber,
      guestName: targetRoom?.currentTenant?.fullName || "ลูกค้าห้อง " + roomNumber,
      guestPhone: targetRoom?.currentTenant?.phone || "-",
      checkInDate: new Date().toISOString().slice(0, 10),
      checkInTime: "14:00",
      checkOutDate: new Date().toISOString().slice(0, 10),
      checkOutTime: "12:00",
      nights: 1,
      dailyRate: targetRoom?.dailyRate || 650,
      totalRoomPrice: targetRoom?.dailyRate || 650,
      keyDeposit: keyDeposit || 500,
      roomDeposit: 500,
      electricCheckIn: targetRoom?.currentElectricMeter ?? 0,
      waterCheckIn: targetRoom?.currentWaterMeter ?? 0,
      status: "checked_in" as const,
    };
    setSelectedRoom(null);
    setDailyCheckoutBooking(booking);
  };

  const handleConfirmDailyCheckout = async ({
    booking,
    extraCharges,
    extraNote,
    electricPrev,
    electricCurr,
    waterPrev,
    waterCurr,
    chargeUtilities,
    electricCost,
    waterCost,
    elecUnits: passedElecUnits,
    waterUnits: passedWaterUnits,
  }: {
    booking: DailyBooking;
    extraCharges: number;
    extraNote: string;
    paymentMethod: "promptpay" | "cash";
    electricPrev?: number;
    electricCurr?: number;
    waterPrev?: number;
    waterCurr?: number;
    chargeUtilities?: boolean;
    electricCost?: number;
    waterCost?: number;
    elecUnits?: number;
    waterUnits?: number;
  }) => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const invoiceNumber = `INV-D-${dateStr.replace(/-/g, "")}-${booking.roomNumber}`;
    const utilityAmount = 0; // Daily stays include water and electricity.
    const totalAmount = (booking.totalRoomPrice || (booking.dailyRate * (booking.nights || 1)) || 650) + (extraCharges || 0) + utilityAmount;

    const targetRoom = rooms.find((r) => r.roomNumber === booking.roomNumber);
    const elecUnits = passedElecUnits !== undefined ? passedElecUnits : Math.max(0, (electricCurr ?? 0) - (electricPrev ?? 0));
    const waterUnits = passedWaterUnits !== undefined ? passedWaterUnits : Math.max(0, (waterCurr ?? 0) - (waterPrev ?? 0));

    const items: InvoiceItem[] = [
      {
        name: `ค่าห้องพักรายวัน (${booking.nights || 1} คืน: ${booking.checkInDate} ถึง ${booking.checkOutDate})`,
        amount: booking.totalRoomPrice || (booking.dailyRate * (booking.nights || 1)) || 650,
      },
    ];

    if (extraCharges > 0) {
      items.push({
        name: extraNote.trim() || "ค่าบริการเพิ่มเติม / เครื่องดื่ม / ค่าปรับ",
        amount: extraCharges,
      });
    }

    // เมื่อมิเตอร์เปลี่ยน นำข้อมูลมาคิดคำนวณ: หากเลือกคิดในบิลจะเพิ่มยอดเงิน หากไม่เลือกจะแสดงเป็นข้อมูลต้นทุนรวมในค่าห้อง
    if (electricCurr !== undefined) {
      const isCharged = false;
      items.push({
        name: `ค่าไฟฟ้า (${electricPrev ?? targetRoom?.currentElectricMeter ?? 0} -> ${electricCurr} ขยับไป ${elecUnits} หน่วย @ ฿${property.electricRate}${isCharged ? "" : " - รวมในค่าห้องแล้ว"})`,
        units: elecUnits,
        rate: property.electricRate,
        amount: isCharged ? (electricCost || 0) : 0,
        meterPrev: electricPrev ?? targetRoom?.currentElectricMeter ?? 0,
        meterCurr: electricCurr,
      });
    }
    if (waterCurr !== undefined) {
      const isCharged = false;
      items.push({
        name: `ค่าน้ำประปา (${waterPrev ?? targetRoom?.currentWaterMeter ?? 0} -> ${waterCurr} ขยับไป ${waterUnits} หน่วย @ ฿${property.waterRate}${isCharged ? "" : " - รวมในค่าห้องแล้ว"})`,
        units: waterUnits,
        rate: property.waterRate,
        amount: isCharged ? (waterCost || 0) : 0,
        meterPrev: waterPrev ?? targetRoom?.currentWaterMeter ?? 0,
        meterCurr: waterCurr,
      });
    }

    const newInvoice: Invoice = {
      id: `inv-daily-${Date.now()}-${booking.roomNumber}`,
      propertyId: property.id,
      invoiceNumber,
      roomNumber: booking.roomNumber,
      tenantName: `${booking.guestName} (รายวัน)`,
      tenantPhone: booking.guestPhone || "-",
      billingDate: dateStr,
      dueDate: dateStr,
      status: "paid",
      paidAt: now.toISOString(),
      invoiceType: "custom",
      items,
      totalAmount,
    };

    try {
      // 1. บันทึกลงฐานข้อมูลใบแจ้งหนี้ (Invoices) เพื่อให้ปรากฏในหน้าใบแจ้งหนี้ และคำนวณเป็นรายได้รวม Dashboard
      await DatabaseService.createDirectInvoice(newInvoice);

      // 2. ปลดสถานะการจองรายวัน
      await DatabaseService.removeDailyBooking(booking.id, booking.roomNumber);

      // 3. ปรับสถานะห้องเป็น "รอทำความสะอาด" (cleaning) พร้อมบันทึกมิเตอร์จริงที่ขยับลงในฐานข้อมูล
      if (targetRoom) {
        await DatabaseService.updateRoomStatus(targetRoom.id, "cleaning");
        if (electricCurr !== undefined && waterCurr !== undefined) {
          await DatabaseService.saveMeterReading(
            targetRoom.id,
            electricCurr,
            waterCurr,
            electricPrev ?? targetRoom.currentElectricMeter,
            waterPrev ?? targetRoom.currentWaterMeter,
            dateStr.slice(0, 7),
            property.id
          );
        }
      }

      // 4. อัปเดต Local State ทั้งหมดแบบทันที (Fast UX)
      setInvoices((prev) => [newInvoice, ...prev]);
      setDailyBookings((prev) => prev.filter((item) => item.id !== booking.id));
      setRooms((prev) =>
        prev.map((r) =>
          r.roomNumber === booking.roomNumber
            ? {
                ...r,
                status: "cleaning",
                currentElectricMeter: electricCurr !== undefined ? electricCurr : r.currentElectricMeter,
                currentWaterMeter: waterCurr !== undefined ? waterCurr : r.currentWaterMeter,
              }
            : r
        )
      );

      // Refresh branch room counts
      const freshProps = await DatabaseService.getAllProperties();
      setBranches(freshProps);

      // ปิด Modal
      setDailyCheckoutBooking(null);

      showToast(
        `เช็คเอาท์ห้อง ${booking.roomNumber} เรียบร้อยแล้ว! บันทึกรับชำระ ฿${totalAmount.toLocaleString()} และบันทึกมิเตอร์ขยับ (ไฟ +${elecUnits} หน่วย, น้ำ +${waterUnits} หน่วย) เรียบร้อยแล้ว`,
        "success"
      );
    } catch (err) {
      console.error("Error during daily checkout:", err);
      showToast("เกิดข้อผิดพลาดในการเช็คเอาท์", "error");
    }
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
    }

    // This also updates the property; avoid a second write with stale room types.
    await DatabaseService.updateBranchSettings(merged, property.id);

    showToast("บันทึกการตั้งค่าหอพักและอัปเดตอัตราค่าน้ำ-ไฟเรียบร้อยแล้ว ✓", "success");
  };

  // Handler: Add Tenant Complete (14 fields + lease dates, deposit, custom service toggles, conditions & 14 clauses)
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
    hasDeposit?: boolean;
    depositAmount?: number;
    hasTv?: boolean;
    tvRentalFee?: number;
    hasFridge?: boolean;
    fridgeRentalFee?: number;
    hasCommonFee?: boolean;
    commonFee?: number;
    hasWifi?: boolean;
    wifiFee?: number;
    hasParking?: boolean;
    parkingFee?: number;
    additionalFees?: import("@/types/dormitory").AdditionalFeeItem[];
    paymentDueDay?: number;
    lateFeePerDay?: number;
    electricalEquipmentFee?: number;
    furnitureFee?: number;
    isContinuous?: boolean;
    noticeDays?: number;
    depositRefundDays?: number;
    overdueGraceDays?: number;
    allowPets?: boolean;
    noSmoking?: boolean;
    additionalRules?: string[];
    clauses?: import("@/types/dormitory").ContractClause[];
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
      depositAmount: tenantData.hasDeposit !== false ? tenantData.depositAmount : 0,
      hasTv: tenantData.hasTv,
      tvRentalFee: tenantData.hasTv ? tenantData.tvRentalFee : 0,
      hasFridge: tenantData.hasFridge,
      fridgeRentalFee: tenantData.hasFridge ? tenantData.fridgeRentalFee : 0,
      hasCommonFee: tenantData.hasCommonFee,
      commonFee: tenantData.hasCommonFee ? tenantData.commonFee : 0,
      hasWifi: tenantData.hasWifi,
      wifiFee: tenantData.hasWifi ? tenantData.wifiFee : 0,
      hasParking: tenantData.hasParking,
      parkingFee: tenantData.hasParking ? tenantData.parkingFee : 0,
      additionalFees: tenantData.additionalFees || [],
    });

    const finalTenant: Tenant = createdTenant || {
      id: crypto.randomUUID(),
      ...tenantData,
      depositAmount: tenantData.hasDeposit !== false ? tenantData.depositAmount : 0,
      hasTv: tenantData.hasTv,
      tvRentalFee: tenantData.hasTv ? tenantData.tvRentalFee : 0,
      hasFridge: tenantData.hasFridge,
      fridgeRentalFee: tenantData.hasFridge ? tenantData.fridgeRentalFee : 0,
      hasCommonFee: tenantData.hasCommonFee,
      commonFee: tenantData.hasCommonFee ? tenantData.commonFee : 0,
      hasWifi: tenantData.hasWifi,
      wifiFee: tenantData.hasWifi ? tenantData.wifiFee : 0,
      hasParking: tenantData.hasParking,
      parkingFee: tenantData.hasParking ? tenantData.parkingFee : 0,
      additionalFees: tenantData.additionalFees || [],
    };

    // 2. Assign Tenant to Room in Database & Local State with Lease End Date
    if (tenantData.roomId) {
      const targetRoom = rooms.find((r) => r.id === tenantData.roomId);

      // Defensive check: ป้องกันการลงทะเบียนทับห้องที่มีผู้เช่า หรือห้องที่จองรายวันอยู่ (ต้องเป็น vacant เท่านั้น)
      if (!targetRoom || targetRoom.status !== "vacant" || targetRoom.currentTenant) {
        showToast(
          `ห้อง ${targetRoom?.roomNumber || ""} ไม่ว่าง (สถานะ: ${targetRoom?.status || "ไม่พบห้อง"}) ไม่สามารถลงทะเบียนเข้าพักได้`,
          "error"
        );
        return;
      }

      const leaseEndDate = tenantData.isContinuous ? "สัญญาต่อเนื่อง" : tenantData.endDate || "2027-10-28";
      setRooms((prev) =>
        prev.map((r) =>
          r.id === tenantData.roomId
            ? { ...r, status: "occupied", currentTenant: finalTenant, leaseEndDate }
            : r
        )
      );
      await DatabaseService.assignTenantToRoom(finalTenant.id, tenantData.roomId, leaseEndDate);

      // Create contract record
      const actualDeposit = tenantData.hasDeposit !== false
        ? (tenantData.depositAmount !== undefined ? tenantData.depositAmount : (targetRoom?.monthlyRate || 4000) * 2)
        : 0;

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
        depositAmount: actualDeposit,
        advanceRent: targetRoom?.monthlyRate || 4000,
        hasTv: tenantData.hasTv,
        tvRentalFee: tenantData.hasTv ? tenantData.tvRentalFee : 0,
        hasFridge: tenantData.hasFridge,
        fridgeRentalFee: tenantData.hasFridge ? tenantData.fridgeRentalFee : 0,
        hasCommonFee: tenantData.hasCommonFee,
        commonFee: tenantData.hasCommonFee ? tenantData.commonFee : 0,
        hasWifi: tenantData.hasWifi,
        wifiFee: tenantData.hasWifi ? tenantData.wifiFee : 0,
        hasParking: tenantData.hasParking,
        parkingFee: tenantData.hasParking ? tenantData.parkingFee : 0,
        additionalFees: tenantData.additionalFees || [],
        paymentDueDay: tenantData.paymentDueDay || 5,
        lateFeePerDay: tenantData.lateFeePerDay || 100,
        electricalEquipmentFee: tenantData.electricalEquipmentFee || 0,
        furnitureFee: tenantData.furnitureFee || 0,
        isContinuous: tenantData.isContinuous,
        noticeDays: tenantData.noticeDays || 30,
        depositRefundDays: tenantData.depositRefundDays || 7,
        overdueGraceDays: tenantData.overdueGraceDays || 7,
        allowPets: tenantData.allowPets || false,
        noSmoking: tenantData.noSmoking !== false,
        additionalRules: tenantData.additionalRules || [],
        clauses: tenantData.clauses || [],
        status: "active",
        createdAt: new Date().toISOString().split("T")[0],
      };
      setContracts((prev) => [newContract, ...prev]);
      await DatabaseService.addContract(newContract);
    }

    setTenants((prev) => [finalTenant, ...prev]);
    setIsAddTenantOpen(false);
    // User Requirement: เมื่อสร้างสัญญาเสร็จแล้ว ให้เด้งไปที่หน้าสัญญาเช่า /contracts (leases)
    handleTabChange("leases");
    showToast(`ลงทะเบียนผู้เช่า ${finalTenant.fullName} และสร้างสัญญาเช่าดิจิทัลสำเร็จ นำท่านสู่หน้าตรวจสอบสัญญาเช่า ✓`, "success");
  };

  // Handler: Checkout Settlement with Auto Closing Invoice/Receipt Generation (Requirement 5)
  const handleExecuteCheckout = async (data?: CheckoutExecutionData) => {
    const targetRoom = data?.targetRoom || rooms.find((r) => r.id === checkoutRoomId);
    if (!targetRoom) {
      showToast("กรุณาเลือกห้องที่ต้องการทำเรื่องย้ายออก", "warning");
      return;
    }

    const elecPrev = data ? data.elecPrev : (checkoutElecPrev === "" ? targetRoom.currentElectricMeter : Number(checkoutElecPrev));
    const elecCurr = data ? data.elecCurr : (checkoutElecCurr === "" ? targetRoom.currentElectricMeter : Number(checkoutElecCurr));
    const waterPrev = data ? data.waterPrev : (checkoutWaterPrev === "" ? targetRoom.currentWaterMeter : Number(checkoutWaterPrev));
    const waterCurr = data ? data.waterCurr : (checkoutWaterCurr === "" ? targetRoom.currentWaterMeter : Number(checkoutWaterCurr));
    const cleaningFee = data ? data.cleaningFee : (checkoutCleaningFee === "" ? 0 : Number(checkoutCleaningFee));
    const damageFee = data ? data.damageFee : (checkoutDamageFee === "" ? 0 : Number(checkoutDamageFee));

    const elecUnits = Math.max(0, elecCurr - elecPrev);
    const waterUnits = Math.max(0, waterCurr - waterPrev);
    const elecCost = elecUnits * property.electricRate;
    const waterCost = waterUnits * property.waterRate;

    // บิลค้างชำระจริงของห้องนี้
    const roomUnpaidInvs = invoices.filter(
      (i) => i.roomNumber === targetRoom.roomNumber && i.status !== "paid"
    );
    const unpaidBillsAmount = roomUnpaidInvs.reduce(
      (acc, i) => acc + (i.remainingAmount ?? i.totalAmount),
      0
    );

    const totalDeductions = elecCost + waterCost + cleaningFee + damageFee + unpaidBillsAmount;
    const deposit = data ? data.depositAmount : (checkoutDepositAmount !== "" ? Number(checkoutDepositAmount) : (targetRoom.monthlyRate * 2 || 8000));
    const netRefund = deposit - totalDeductions;

    setConfirmDialog({
      isOpen: true,
      title: `ยืนยันการย้ายออก ห้อง ${targetRoom.roomNumber}`,
      description: `ยอดหักค่าน้ำ-ไฟ บิลค้าง และค่าบริการรวม ${formatCurrency(totalDeductions)} • ${
        netRefund >= 0
          ? `เงินประกันสุทธิคืนผู้เช่า ${formatCurrency(netRefund)}`
          : `ผู้เช่ามียอดค้างชำระเพิ่ม ${formatCurrency(Math.abs(netRefund))}`
      } โดยระบบจะปรับสถานะห้องเป็น "รอทำความสะอาด (cleaning)" และออกใบเสร็จสรุปยอดหักเงินประกันเข้าสู่ระบบบัญชี`,
      confirmText: "ยืนยันทำเรื่องย้ายออก",
      cancelText: "ยกเลิก",
      variant: "warning",
      iconType: "question",
      onConfirm: async () => {
        const ok = await DatabaseService.checkoutRoom(targetRoom.id);
        if (ok) {
          // Construct closing settlement invoice/receipt
          const invoiceItems: InvoiceItem[] = [];

          if (unpaidBillsAmount > 0) {
            for (const inv of roomUnpaidInvs) {
              invoiceItems.push({
                name: `หักชำระบิลค้างรอบเดือน (${inv.invoiceNumber})`,
                amount: inv.remainingAmount ?? inv.totalAmount,
              });
            }
          }

          if (elecCost > 0) {
            invoiceItems.push({
              name: `ค่าไฟฟ้า (${elecPrev} -> ${elecCurr} หน่วย)`,
              units: elecUnits,
              rate: property.electricRate,
              amount: elecCost,
              meterPrev: elecPrev,
              meterCurr: elecCurr,
            });
          }
          if (waterCost > 0) {
            invoiceItems.push({
              name: `ค่าน้ำประปา (${waterPrev} -> ${waterCurr} หน่วย)`,
              units: waterUnits,
              rate: property.waterRate,
              amount: waterCost,
              meterPrev: waterPrev,
              meterCurr: waterCurr,
            });
          }
          if (cleaningFee > 0) {
            invoiceItems.push({
              name: "ค่าบริการทำความสะอาดห้องพัก (ย้ายออก)",
              amount: cleaningFee,
            });
          }
          if (damageFee > 0) {
            invoiceItems.push({
              name: "ค่าชดเชยความเสียหาย/ซ่อมแซมห้องพัก",
              amount: damageFee,
            });
          }
          if (invoiceItems.length === 0) {
            invoiceItems.push({
              name: "ค่าบริการสรุปย้ายออกห้องพัก",
              amount: 0,
            });
          }

          const isCoveredByDeposit = deposit >= totalDeductions;
          const closingInvoice: Invoice = {
            id: `inv-checkout-${Date.now()}-${targetRoom.roomNumber}`,
            propertyId: targetRoom.propertyId || property.id,
            invoiceNumber: `INV-OUT-${targetRoom.roomNumber}-${Date.now().toString().slice(-4)}`,
            roomNumber: targetRoom.roomNumber,
            tenantName: targetRoom.currentTenant?.fullName || "ผู้เช่าย้ายออก",
            tenantPhone: targetRoom.currentTenant?.phone || "-",
            billingDate: new Date().toISOString().split("T")[0],
            dueDate: new Date().toISOString().split("T")[0],
            items: invoiceItems,
            totalAmount: totalDeductions,
            status: isCoveredByDeposit ? "paid" : "unpaid",
            paidAt: isCoveredByDeposit ? `${new Date().toLocaleDateString("th-TH")} (หักชำระจากเงินประกันมัดจำ)` : undefined,
            invoiceType: "custom",
          };

          await DatabaseService.createDirectInvoice(closingInvoice);

          // ถ้าเงินประกันพอหัก ให้ตัดยอดบิลค้างเดิมเป็นชำระแล้วด้วย
          if (isCoveredByDeposit) {
            for (const inv of roomUnpaidInvs) {
              await DatabaseService.updateInvoiceStatus(inv.id, "paid");
            }
          }

          // บันทึกเลขมิเตอร์ล่าสุด ณ วันย้ายออก
          await DatabaseService.saveMeterReading(targetRoom.id, elecCurr, waterCurr, elecPrev, waterPrev);

          const freshInvs = await DatabaseService.getInvoices(property.id);
          setInvoices(freshInvs);

          setRooms((prev) =>
            prev.map((r) =>
              r.id === targetRoom.id
                ? {
                    ...r,
                    status: "cleaning",
                    currentElectricMeter: elecCurr,
                    currentWaterMeter: waterCurr,
                    currentTenant: undefined,
                    leaseEndDate: undefined,
                  }
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
          setCheckoutRoomId("");
          showToast(`สรุปย้ายออกห้อง ${targetRoom.roomNumber} และบันทึกใบเสร็จหักเงินประกันเข้าสู่ระบบบัญชีเรียบร้อยแล้ว ✓`, "success");
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

  // Handler: Add Expense
  const handleAddExpense = async (expData: Omit<ExpenseItem, "id">) => {
    try {
      const created = await DatabaseService.addExpense({ ...expData, propertyId: property.id });
      setExpenses((prev) => [created, ...prev]);
      showToast(`บันทึกรายจ่าย "${created.title}" เรียบร้อยแล้ว ✓`, "success");
    } catch (err) {
      console.error(err);
      showToast("เกิดข้อผิดพลาดในการบันทึกรายจ่าย", "error");
    }
  };

  // Handler: Delete Expense
  const handleDeleteExpense = async (id: string) => {
    try {
      await DatabaseService.deleteExpense(id, property.id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      showToast("ลบรายการรายจ่ายเรียบร้อยแล้ว", "success");
    } catch (err) {
      console.error(err);
      showToast("เกิดข้อผิดพลาดในการลบรายจ่าย", "error");
    }
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
    const accessibleBranches = await DatabaseService.getAllProperties();
    if (!accessibleBranches.some((item) => item.id === branch.id)) {
      setBranches(accessibleBranches);
      syncNavigation("branches", true, false);
      showToast("คุณไม่มีสิทธิ์เข้าถึงสาขานี้ กรุณาเลือกสาขาที่ได้รับอนุญาต", "error");
      return;
    }
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
          if (updates.ownerName !== undefined) {
            setSettingsForm((prev) => ({ ...prev, ownerName: updates.ownerName || "" }));
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
    ownerName?: string;
    promptpayNumber: string;
    promptpayName: string;
    electricRate: number;
    waterRate: number;
    initialRoomCount: number;
    imageUrl?: string;
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
            // Save the new branch to Supabase, then reload fresh data (incl. other devices' changes)
            await DatabaseService.refreshFromServer();
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
      // Save the new branch to Supabase, then reload fresh data (incl. other devices' changes)
      await DatabaseService.refreshFromServer();
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
      case "leases":
        return "สัญญาเช่าดิจิทัล (เซ็นออนไลน์)";
      case "checkout":
        return "ระบบสรุปย้ายออก & คืนเงินประกัน";
      case "cleaning":
        return "งานแม่บ้านทำความสะอาด";
      case "repairs":
        return "ระบบแจ้งซ่อมบำรุงห้องพัก";
      case "reports":
        return "บัญชีรายรับ-รายจ่าย & กำไรขาดทุน";
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

  const hasBranchAccess = branchAccessUserId === currentUser?.id &&
    branches.some((branch) => branch.id === property.id);

  useEffect(() => {
    if (isAuthenticated && branchAccessUserId === currentUser?.id && !hasBranchAccess) {
      syncNavigation("branches", true, false);
    }
  }, [isAuthenticated, branchAccessUserId, currentUser?.id, hasBranchAccess, currentTab, isBranchSelectorOpen, syncNavigation]);

  // Auth Loading Gate (Sunlight White Theme)
  if (isAuthLoading || (isAuthenticated && branchAccessUserId !== currentUser?.id)) {
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
  if (!hasBranchAccess || currentTab === "branches" || isBranchSelectorOpen) {
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
          hideCancel={confirmDialog.hideCancel}
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
          onOpenNewContract={() => {
            setSelectedRoom(null);
            setInitialAddTenantRoomId(undefined);
            handleTabChange("tenant-new");
          }}
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
          rooms={rooms}
          invoices={invoices}
          repairs={repairs}
          propertyId={property.id}
        />

        {/* Scrollable Content Workspace */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Toast Notification Banner */}
          {toast && <FloatingAlert type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

          {/* Database Connection Status Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-900 dark:text-emerald-200">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold">
                {DatabaseService.isLocalMode()
                  ? "โหมดฐานข้อมูล: Host Machine Server Database (เซฟตรงลงเครื่องโฮสต์ ⚡ รองรับทุกเครื่องในวง LAN)"
                  : isDbConnected
                  ? "เชื่อมต่อ Supabase Live Cloud สำเร็จ 🟢 (Realtime Sync อัตโนมัติ)"
                  : "กำลังเชื่อมต่อ Supabase Live Cloud..."}
              </span>
              <span className="text-[11px] text-[var(--muted)]">
                | หอพัก: {property.name} ({rooms.length} ห้องในระบบ)
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setIsDbInspectorOpen(true)}
                className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300 hover:text-emerald-600 dark:hover:text-emerald-100 transition cursor-pointer"
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
                setSelectedRoom(null);
                setInitialAddTenantRoomId(roomId);
                handleTabChange("tenant-new");
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
              <OverviewMetrics
                rooms={rooms}
                invoices={invoices}
                overdueAmount={invoices
                  .filter((i) => i.status !== "paid")
                  .reduce((sum, i) => sum + i.totalAmount, 0)}
              />
              <RoomMatrix
                rooms={rooms}
                dailyBookings={dailyBookings}
                invoices={invoices}
                onSelectRoom={(room) => setSelectedRoom(room)}
                onUpdateStatus={handleUpdateStatus}
                onOpenAddTenant={(targetRoomId) => {
                  const sel = rooms.find((r) => r.id === targetRoomId);
                  if (sel && sel.status !== "vacant") {
                    showToast(
                      `ห้อง ${sel.roomNumber} อยู่ในสถานะ "${sel.status === "cleaning" ? "รอทำความสะอาด" : sel.status}" ต้องกดยืนยันเป็นห้องว่างก่อนจึงจะทำสัญญาได้`,
                      "warning"
                    );
                    return;
                  }
                  setSelectedRoom(null);
                  setInitialAddTenantRoomId(targetRoomId);
                  handleTabChange("tenant-new");
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
            <DailyCalendarView
              dailyBookings={dailyBookings}
              rooms={rooms}
              onOpenNewBooking={() => {
                const firstVacant = rooms.find((r) => r.status === "vacant");
                setNewBookingForm({
                  bookingType: "daily",
                  roomNumber: firstVacant?.roomNumber || "",
                  guestName: "",
                  guestPhone: "",
                  idCard: "",
                  vehiclePlate: "",
                  checkInDate: new Date().toISOString().slice(0, 10),
                  checkOutDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
                  nightlyRate: firstVacant?.dailyRate || 650,
                  depositAmount: 500,
                  roomDeposit: 500,
                });
                setIsNewBookingOpen(true);
              }}
              onDailyCheckIn={handleDailyCheckIn}
              onDailyCheckOut={handleDailyCheckOut}
            />
          )}

          {/* VIEW: Meter Reading (Spreadsheet Fast Entry & Top Summary Banner) */}
          {currentTab === "meter" && (
            <MeterSpreadsheetView
              rooms={rooms}
              dailyBookings={dailyBookings}
              electricRate={property.electricRate}
              waterRate={property.waterRate}
              onSaveMeters={handleSaveMetersBatch}
            />
          )}

          {/* VIEW: Invoices */}
          {currentTab === "invoices" && (
            <InvoicesBillingView
              invoices={invoices}
              propertyName={property.name}
              propertyId={property.id}
              isSendingLineBatch={isSendingLineBatch}
              onSendLineAllInvoices={handleSendLineAllInvoices}
              onGenerateMonthlyInvoices={handleGenerateMonthlyInvoices}
              onMarkAsPaid={handleMarkAsPaid}
              onOpenInvoiceModal={(inv) => {
                setActiveInvoice(inv);
                setIsInvoiceModalOpen(true);
              }}
              onShowToast={showToast}
            />
          )}

          {/* VIEW: Slips (AI Slip Verification) */}
          {currentTab === "slips" && (
            <SlipVerificationView
              invoices={invoices}
              propertyName={property.name}
              propertyId={property.id}
              onVerifySlip={handleVerifySlip}
              onRejectSlip={handleRejectSlip}
              onOpenInvoiceModal={(inv) => {
                setActiveInvoice(inv);
                setIsInvoiceModalOpen(true);
              }}
              onShowToast={showToast}
            />
          )}

          {/* VIEW: Receipts */}
          {currentTab === "receipts" && (
            <ReceiptsListView
              invoices={invoices}
              onOpenReceipt={(inv) => {
                setActiveInvoice(inv);
                setIsInvoiceModalOpen(true);
              }}
            />
          )}

          {/* VIEW: Tenants Directory (รวมทั้งผู้เช่ารายเดือนและผู้เข้าพักรายวัน) */}
          {currentTab === "tenants" && (
            <TenantsListView
              rooms={rooms}
              tenants={tenants}
              contracts={contracts}
              invoices={invoices}
              dailyBookings={dailyBookings}
              onOpenNewTenant={() => {
                setSelectedRoom(null);
                setInitialAddTenantRoomId(undefined);
                handleTabChange("tenant-new");
              }}
            />
          )}

          {/* VIEW: Tenant Registration Full-Page View */}
          {currentTab === "tenant-new" && (
            <TenantRegistrationView
              rooms={rooms}
              initialRoomId={initialAddTenantRoomId}
              existingTenants={tenants}
              propertyName={property.name}
              onBack={() => handleTabChange("tenants")}
              onSubmit={handleAddTenantComplete}
            />
          )}

          {/* VIEW: Leases & Contracts */}
          {currentTab === "leases" && (
            <ContractManagementView
              contracts={contracts}
              propertyName={property.name}
              rooms={rooms}
              onAddContract={handleAddContract}
              onOpenNewTenantRegistration={() => {
                setSelectedRoom(null);
                setInitialAddTenantRoomId(undefined);
                handleTabChange("tenant-new");
              }}
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
          {currentTab === 'checkout' && (
            <CheckoutManagementView
              rooms={rooms}
              contracts={contracts}
              invoices={invoices}
              property={property}
              selectedRoomId={checkoutRoomId}
              onSelectRoomId={setCheckoutRoomId}
              onExecuteCheckout={handleExecuteCheckout}
            />
          )}

          {/* VIEW: Cleaning & Maintenance */}
          {currentTab === "cleaning" && (
            <CleaningBoardView
              rooms={rooms}
              onUpdateStatus={handleUpdateStatus}
            />
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
              electricRate={property.electricRate}
              waterRate={property.waterRate}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
            />
          )}

          {/* VIEW: LINE OA Broadcast */}
          {currentTab === "broadcast" && (
            <BroadcastLineView
              broadcasts={broadcasts}
              rooms={rooms}
              onSendBroadcast={async (data) => {
                try {
                  showToast("กำลังส่งประกาศ LINE...", "info");
                  const res = await fetch("/api/line/broadcast", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      ...data,
                      propertyId: property.id,
                    }),
                  });
                  const resData = await res.json();
                  if (resData.success) {
                    if (resData.broadcastItem) {
                      setBroadcasts((prev) => [resData.broadcastItem, ...prev]);
                    }
                    showToast(`📢 ${resData.message || "ส่งประกาศ LINE เรียบร้อยแล้ว"}`, "success");
                  } else {
                    showToast(`ส่งประกาศไม่สำเร็จ: ${resData.error || "เกิดข้อผิดพลาด"}`, "error");
                  }
                } catch (err: any) {
                  console.error("Broadcast error:", err);
                  showToast("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์", "error");
                }
              }}
              branchName={property.name}
              lineChannelId={branchSettings.lineChannelSecret ? `@pakdee_${property.id}` : "@pakdee_mansion"}
            />
          )}

          {/* VIEW: Settings */}
          {currentTab === "settings" && (
            <BranchSettingsView
              settings={branchSettings}
              rooms={rooms}
              onSaveSettings={handleSaveBranchSettings}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <RoomDetailModal
        room={selectedRoom}
        contracts={contracts}
        dailyBookings={dailyBookings}
        onDailyCheckIn={handleDailyCheckIn}
        onDailyCheckOut={handleDailyCheckOut}
        onClose={() => setSelectedRoom(null)}
        onOpenInvoice={() => setIsInvoiceModalOpen(true)}
        onOpenAddTenant={(targetRoomId) => {
          const sel = rooms.find((r) => r.id === targetRoomId);
          if (sel && sel.status !== "vacant") {
            showToast(
              `ห้อง ${sel.roomNumber} อยู่ในสถานะ "${sel.status === "cleaning" ? "รอทำความสะอาด" : sel.status}" ต้องกดยืนยันเป็นห้องว่างก่อนจึงจะทำสัญญาได้`,
              "warning"
            );
            return;
          }
          setSelectedRoom(null);
          setInitialAddTenantRoomId(targetRoomId);
          handleTabChange("tenant-new");
        }}
        onOpenDailyBooking={(targetRoomNumber, bookingType) => {
          const sel = rooms.find((r) => r.roomNumber === targetRoomNumber);
          if (sel && sel.status !== "vacant") {
            showToast(
              `ห้อง ${targetRoomNumber} อยู่ในสถานะ "${sel.status === "cleaning" ? "รอทำความสะอาด" : sel.status}" ต้องกดยืนยันเป็นห้องว่างก่อนจึงจะจองได้`,
              "warning"
            );
            return;
          }
          setSelectedRoom(null);
          setNewBookingForm({
            bookingType: "daily",
            roomNumber: targetRoomNumber,
            guestName: "",
            guestPhone: "",
            idCard: "",
            vehiclePlate: "",
            checkInDate: new Date().toISOString().slice(0, 10),
            checkOutDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
            nightlyRate: sel?.dailyRate || 650,
            depositAmount: 500,
            roomDeposit: 500,
          });
          setIsNewBookingOpen(true);
        }}
        onOpenCheckout={(targetRoomId) => {
          const r = rooms.find((rm) => rm.id === targetRoomId);
          if (r) {
            // Guard: หากเป็นห้องพักรายวัน ให้เปิดหน้าต่างเช็คเอาท์รายวัน (DailyCheckoutModal - รูปที่ 2) เสมอ! ห้ามไปหน้าระบบสรุปย้ายออก
            const isDailyRoom =
              r.status === "daily" ||
              dailyBookings.some((b) => b.roomNumber === r.roomNumber && (b.status === "confirmed" || b.status === "checked_in")) ||
              r.currentTenant?.notes?.includes("[ผู้เข้าพักรายวัน]");

            if (isDailyRoom) {
              const b = dailyBookings.find((item) => item.roomNumber === r.roomNumber && (item.status === "confirmed" || item.status === "checked_in"));
              setSelectedRoom(null);
              handleDailyCheckOut(b?.id || `b-${r.roomNumber}`, r.roomNumber, b?.keyDeposit || 500);
              return;
            }

            setCheckoutRoomId(r.id);
            setCheckoutElecPrev(r.currentElectricMeter);
            setCheckoutElecCurr(r.currentElectricMeter);
            setCheckoutWaterPrev(r.currentWaterMeter);
            setCheckoutWaterCurr(r.currentWaterMeter);
            const act = contracts.find((c) => c.roomNumber === r.roomNumber && c.status === "active");
            const dep = act?.depositAmount || (r as any).depositAmount || r.currentTenant?.depositAmount || (r.monthlyRate * 2) || 8000;
            setCheckoutDepositAmount(dep);
          }
          setSelectedRoom(null);
          handleTabChange("checkout");
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
        onMarkAsPaid={handleMarkAsPaid}
        onInvoiceSent={(invId) => {
          setInvoices((prev) =>
            prev.map((i) =>
              i.id === invId
                ? {
                    ...i,
                    lineDeliveryStatus: "sent",
                    lineSentAt: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.",
                  }
                : i
            )
          );
        }}
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
        existingTenants={tenants}
        onAddTenant={handleAddTenantComplete}
      />

      {/* Add Room Modal (Single & Batch) */}
      <AddRoomModal
        isOpen={isAddRoomOpen}
        onClose={() => setIsAddRoomOpen(false)}
        onAddRoom={handleAddRoom}
        onAddBatchRooms={handleAddBatchRooms}
        roomTypes={branchSettings.roomTypes || defaultRoomTypes}
      />

      {/* Database Inspector Modal (ดูข้อมูลจริงใน Supabase Cloud) */}
      <DatabaseInspectorModal
        isOpen={isDbInspectorOpen}
        onClose={() => setIsDbInspectorOpen(false)}
      />

      {/* New Booking Modal (บันทึกการจองห้องพักรายวัน - Requirement 1) */}
      {isNewBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header: Daily Room Reservation Only */}
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-[var(--foreground)] flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span>บันทึกการจองห้องพักรายวัน (Daily Room Reservation)</span>
                </h3>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  บันทึกข้อมูลผู้เข้าพักรายวัน กำหนดวันเช็คอิน-เช็คเอาท์ ค่ามัดจำ และทะเบียนรถ
                </p>
              </div>
              <button
                onClick={() => setIsNewBookingOpen(false)}
                className="text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddBooking} className="p-6 space-y-4 text-xs overflow-y-auto">
              {/* กรองเฉพาะห้องที่ว่างจริงเท่านั้น (Status = vacant และไม่มีผู้เช่า) */}
              {(() => {
                const availableRooms = rooms.filter(
                  (r) => r.status === "vacant" && !r.currentTenant
                );
                const hasNoRooms = availableRooms.length === 0;

                return (
                  <>
                    <div>
                      <label className="block font-semibold mb-1">
                        ห้องพัก (เฉพาะห้องที่มีสถานะ "ว่าง" เท่านั้น) <span className="text-rose-500">*</span>
                      </label>
                      {hasNoRooms ? (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-xs leading-relaxed">
                          ⚠️ ขณะนี้ไม่มีห้องว่างสำหรับเปิดจอง (ห้องทั้งหมดมีผู้เช่ารายเดือน หรือถูกจองรายวันแล้ว)
                        </div>
                      ) : (
                        <select
                          required
                          value={availableRooms.some((r) => r.roomNumber === newBookingForm.roomNumber) ? newBookingForm.roomNumber : ""}
                          onChange={(e) => {
                            const selRoom = rooms.find((r) => r.roomNumber === e.target.value);
                            setNewBookingForm({
                              ...newBookingForm,
                              roomNumber: e.target.value,
                              nightlyRate: selRoom?.dailyRate || 650,
                            });
                          }}
                          className="w-full p-2.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] font-medium"
                        >
                          <option value="">-- กรุณาเลือกห้องพักว่าง --</option>
                          {availableRooms.map((r) => (
                            <option key={r.id} value={r.roomNumber}>
                              ห้อง {r.roomNumber} ({r.type}) • รายวัน {formatCurrency(r.dailyRate || 650)}/คืน — [ห้องว่าง ✨]
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold mb-1">
                          ชื่อผู้เข้าพัก <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={100}
                          placeholder="เช่น คุณกานดา รักษ์ดี"
                          value={newBookingForm.guestName}
                          onChange={(e) => setNewBookingForm({ ...newBookingForm, guestName: e.target.value })}
                          className="w-full p-2.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] font-medium"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold mb-1">เบอร์โทรศัพท์ *</label>
                        <input
                          type="tel"
                          required
                          inputMode="tel"
                          maxLength={12}
                          placeholder="08X-XXX-XXXX"
                          value={newBookingForm.guestPhone}
                          onChange={(e) => setNewBookingForm({ ...newBookingForm, guestPhone: formatThaiPhone(e.target.value) })}
                          className="w-full p-2.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] font-mono"
                        />
                      </div>
                    </div>

                    {/* เลขบัตรประชาชน และ ทะเบียนรถ (User Requirement 3) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold mb-1">
                          เลขประจำตัวประชาชน (13 หลัก) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          inputMode="numeric"
                          maxLength={17}
                          placeholder="1-XXXX-XXXXX-XX-X"
                          value={newBookingForm.idCard}
                          onChange={(e) => setNewBookingForm({ ...newBookingForm, idCard: formatThaiIdCard(e.target.value) })}
                          className="w-full p-2.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] font-mono"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold mb-1">
                          เลขทะเบียนรถ (ถ้ามี)
                        </label>
                        <input
                          type="text"
                          maxLength={20}
                          placeholder="เช่น 1กข 1234 กทม."
                          value={newBookingForm.vehiclePlate}
                          onChange={(e) => setNewBookingForm({ ...newBookingForm, vehiclePlate: e.target.value })}
                          className="w-full p-2.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)]"
                        />
                      </div>
                    </div>

                    {/* Date Pickers */}
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

                    {/* Rates & Deposits (สามารถลบเลข 0 ออกได้ ไม่ค้าง) */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold mb-1">ราคาต่อคืน (บาท)</label>
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={newBookingForm.nightlyRate}
                            placeholder="650"
                            onChange={(e) => setNewBookingForm({ ...newBookingForm, nightlyRate: e.target.value === "" ? "" : Number(e.target.value) })}
                            className="w-full p-2.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold mb-1">มัดจำคีย์การ์ด (บาท)</label>
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={newBookingForm.depositAmount}
                            placeholder="500"
                            onChange={(e) => setNewBookingForm({ ...newBookingForm, depositAmount: e.target.value === "" ? "" : Number(e.target.value) })}
                            className="w-full p-2.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] font-mono"
                          />
                        </div>
                      </div>

                      {/* ค่ามัดจำห้องพัก (สามารถพิมพ์ ลบ หรือกดเพิ่มได้) */}
                      <div className="p-3 rounded-2xl bg-[var(--subtle)] border border-[var(--border)] space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block font-semibold text-xs text-[var(--foreground)]">
                            ค่ามัดจำห้องพักรายวัน (บาท)
                          </label>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setNewBookingForm((prev) => ({ ...prev, roomDeposit: Math.max(0, (Number(prev.roomDeposit) || 0) - 100) }))}
                              className="w-7 h-7 rounded-lg bg-[var(--card)] border border-[var(--border)] hover:border-blue-500 font-bold text-xs flex items-center justify-center transition cursor-pointer"
                              title="ลด 100 บาท"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="0"
                              step="100"
                              value={newBookingForm.roomDeposit}
                              placeholder="0"
                              onChange={(e) => setNewBookingForm({ ...newBookingForm, roomDeposit: e.target.value === "" ? "" : Number(e.target.value) })}
                              className="w-24 px-2 py-1 rounded-lg bg-[var(--card)] border border-[var(--border)] text-center font-bold text-xs text-blue-600 dark:text-blue-400 font-mono focus:border-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => setNewBookingForm((prev) => ({ ...prev, roomDeposit: (Number(prev.roomDeposit) || 0) + 100 }))}
                              className="w-7 h-7 rounded-lg bg-[var(--card)] border border-[var(--border)] hover:border-blue-500 font-bold text-xs flex items-center justify-center transition cursor-pointer"
                              title="เพิ่ม 100 บาท"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Quick Add Pills */}
                        <div className="flex items-center gap-1.5 pt-0.5 text-[11px]">
                          <span className="text-[var(--muted)] text-[10px]">เพิ่มด่วน:</span>
                          <button
                            type="button"
                            onClick={() => setNewBookingForm((prev) => ({ ...prev, roomDeposit: (Number(prev.roomDeposit) || 0) + 200 }))}
                            className="px-2 py-0.5 rounded-md bg-[var(--card)] border border-[var(--border)] hover:bg-blue-500/10 hover:text-blue-600 text-[10px] font-semibold transition cursor-pointer"
                          >
                            +200
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewBookingForm((prev) => ({ ...prev, roomDeposit: (Number(prev.roomDeposit) || 0) + 500 }))}
                            className="px-2 py-0.5 rounded-md bg-[var(--card)] border border-[var(--border)] hover:bg-blue-500/10 hover:text-blue-600 text-[10px] font-semibold transition cursor-pointer"
                          >
                            +500
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewBookingForm((prev) => ({ ...prev, roomDeposit: (Number(prev.roomDeposit) || 0) + 1000 }))}
                            className="px-2 py-0.5 rounded-md bg-[var(--card)] border border-[var(--border)] hover:bg-blue-500/10 hover:text-blue-600 text-[10px] font-semibold transition cursor-pointer"
                          >
                            +1,000
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewBookingForm((prev) => ({ ...prev, roomDeposit: "" }))}
                            className="ml-auto px-1.5 py-0.5 rounded-md text-[var(--muted)] hover:text-rose-500 text-[10px] transition cursor-pointer"
                          >
                            ลบหมด
                          </button>
                        </div>
                      </div>

                      {/* Summary of Total Deposit */}
                      <div className="flex items-center justify-between text-xs px-2 py-1 text-[var(--muted)]">
                        <span>รวมเงินมัดจำทั้งหมด (ห้อง + กุญแจ):</span>
                        <strong className="text-blue-600 dark:text-blue-400 font-bold font-mono">
                          {formatCurrency((Number(newBookingForm.roomDeposit) || 0) + (Number(newBookingForm.depositAmount) || 0))}
                        </strong>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-2 border-t border-[var(--border)]">
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
                        className="px-4 py-2 rounded-xl text-white font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-500"
                      >
                        บันทึกการจองรายวัน
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

      {/* Daily Room Checkout & Billing Settlement Modal */}
      <DailyCheckoutModal
        isOpen={Boolean(dailyCheckoutBooking)}
        booking={dailyCheckoutBooking}
        room={rooms.find((r) => r.roomNumber === dailyCheckoutBooking?.roomNumber)}
        electricRate={property.electricRate}
        waterRate={property.waterRate}
        onClose={() => setDailyCheckoutBooking(null)}
        onConfirmCheckout={handleConfirmDailyCheckout}
      />

      {/* Global Bento Confirmation Modal (Zero Native Alert/Confirm) */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        hideCancel={confirmDialog.hideCancel}
        variant={confirmDialog.variant}
        iconType={confirmDialog.iconType}
      />
    </div>
  );
}
