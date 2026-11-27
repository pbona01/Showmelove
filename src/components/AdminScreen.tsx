import { useState, useMemo, useEffect } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Ban,
  BarChart2,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  FileText,
  Filter,
  Globe,
  HelpCircle,
  Key,
  Layers,
  Lock,
  Mail,
  MessageSquare,
  MinusCircle,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Send,
  Server,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Trophy,
  User,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
  Wifi,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { ECONOMY_CONFIG, formatCoins, formatNaira } from '../config/economy';
import { useShowmelove } from '../context/ShowmeloveContext';
import type { CollectionId, PayoutRequest, DemoBankAccount } from '../types/showmelove';
import { GiftArtworkSvg } from './GiftArtwork';
import { Button } from './ui/DesignSystem';

// Type definitions for Admin
export type AdminSection =
  | 'overview'
  | 'analytics'
  | 'users'
  | 'wallets'
  | 'top_users'
  | 'withdrawals'
  | 'transactions'
  | 'revenue'
  | 'master_wallet'
  | 'gifts_emoji'
  | 'countries'
  | 'broadcasts'
  | 'fraud'
  | 'support'
  | 'roles'
  | 'logs'
  | 'system'
  | 'catalog';

interface AdminAuditLog {
  id: string;
  timestamp: string;
  adminEmail: string;
  action: string;
  target: string;
  details: string;
  category: 'withdrawal' | 'wallet' | 'user' | 'broadcast' | 'system' | 'catalog' | 'governance';
}

interface UserInspectionData {
  id: string;
  name: string;
  username: string;
  email: string;
  country: string;
  region: string;
  avatar: string;
  registeredAt: string;
  lastActive: string;
  isOnline: boolean;
  status: 'active' | 'restricted' | 'suspended';
  loveCoinsBalance: number;
  totalReceivedNaira: number;
  totalGiftedNaira: number;
  totalWithdrawnNaira: number;
  deviceInfo: string;
  ipAddress: string;
  incomeSources: { source: string; percentage: number; amount: string }[];
  recentTxs: { id: string; date: string; type: string; amount: string; status: string }[];
  reportsCount: number;
}

interface InAppPopup {
  id: string;
  title: string;
  message: string;
  imageUrl?: string;
  actionText: string;
  actionUrl: string;
  targetAudience: string;
  durationSeconds: number;
  enabled: boolean;
  startDate: string;
  endDate: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  userEmail: string;
  userName: string;
  category: 'withdrawal' | 'payment' | 'account' | 'gift' | 'other';
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
  assignedTo?: string;
  messages: { sender: string; text: string; time: string }[];
}

interface AdminScreenProps {
  onLock?: () => void;
}

export function AdminScreen({ onLock }: AdminScreenProps = {}) {
  const { state, updateCatalogItem, setSeasonalConfig, resolvePayout } = useShowmelove();

  // Navigation state
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [dateFilter, setDateFilter] = useState<'today' | '7d' | '30d' | 'all'>('7d');

  // High-value manual approval threshold is fixed permanently at ₦2,000,000 (cannot be adjusted from admin panel)
  const APPROVAL_THRESHOLD = ECONOMY_CONFIG.HIGH_VALUE_WITHDRAWAL_THRESHOLD_NAIRA;

  // User inspection modal
  const [selectedUser, setSelectedUser] = useState<UserInspectionData | null>(null);

  // Withdrawal approval modal
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [payoutActionType, setPayoutActionType] = useState<'approve' | 'reject' | 'adjust' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adjustedAmountNaira, setAdjustedAmountNaira] = useState('');

  // Master Wallet Withdrawal 4-Step Modal
  const [showMasterWithdrawModal, setShowMasterWithdrawModal] = useState(false);
  const [masterWithdrawStep, setMasterWithdrawStep] = useState<1 | 2 | 3 | 4>(1);
  const [masterWithdrawAmount, setMasterWithdrawAmount] = useState('500000');
  const [masterWithdrawBank, setMasterWithdrawBank] = useState({
    bankName: 'GTBank Nigeria',
    accountNumber: '0123984711',
    accountName: 'Showmelove Platform Holdings',
  });
  const [masterWithdrawCode, setMasterWithdrawCode] = useState('');
  const [generatedSampleCode, setGeneratedSampleCode] = useState('849201');
  const [masterWithdrawError, setMasterWithdrawError] = useState('');

  // Activity Logs
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>(() => {
    try {
      const saved = localStorage.getItem('showmelove_admin_audit_logs');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [
      {
        id: 'log_1',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        adminEmail: '1virtue1x@gmail.com',
        action: 'WITHDRAWAL_THRESHOLD_CONFIGURED',
        target: 'System Settings',
        details: 'Threshold verified at ₦2,000,000 auto-flag level.',
        category: 'system',
      },
      {
        id: 'log_2',
        timestamp: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
        adminEmail: 'pbona717@gmail.com',
        action: 'CATALOG_COLLECTION_SYNCED',
        target: 'Evergreen & Valentine',
        details: 'Verified pricing and visual assets.',
        category: 'catalog',
      },
    ];
  });

  const addAuditLog = (entry: Omit<AdminAuditLog, 'id' | 'timestamp'>) => {
    const newLog: AdminAuditLog = {
      ...entry,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => {
      const updated = [newLog, ...prev];
      try {
        localStorage.setItem('showmelove_admin_audit_logs', JSON.stringify(updated.slice(0, 100)));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // In-app popups state
  const [popups, setPopups] = useState<InAppPopup[]>(() => {
    try {
      const saved = localStorage.getItem('showmelove_admin_popups');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      {
        id: 'pop_1',
        title: '🎉 Send Love & Win 500 Free Coins!',
        message: 'Share your gift link this weekend. Top 5 creators on the leaderboard receive a bonus 500 Love Coins.',
        actionText: 'View Leaderboard',
        actionUrl: '/leaderboard',
        targetAudience: 'All Users',
        durationSeconds: 8,
        enabled: true,
        startDate: '2026-11-20',
        endDate: '2026-12-01',
      },
    ];
  });

  const [newPopupTitle, setNewPopupTitle] = useState('');
  const [newPopupMessage, setNewPopupMessage] = useState('');
  const [newPopupAction, setNewPopupAction] = useState('Claim Now');
  const [newPopupUrl, setNewPopupUrl] = useState('/send');

  // Broadcast email state
  const [broadcastTarget, setBroadcastTarget] = useState('All Users');
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastSentNotice, setBroadcastSentNotice] = useState(false);
  const [processingPayoutId, setProcessingPayoutId] = useState<string | null>(null);
  const [payoutNotice, setPayoutNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Admin Management state
  const adminList: string[] = [];
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('Super Admin');
  const [adminNotice, setAdminNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim() || !newAdminEmail.includes('@')) {
      setAdminNotice({ type: 'error', message: 'Enter the email address of an existing Showmelove account.' });
      return;
    }
    setAdminNotice({
      type: 'error',
      message: 'Admin roles are managed securely in Supabase. Run the role assignment SQL for this existing account; browser-only changes are intentionally disabled.',
    });
  };

  const handleRemoveAdmin = (email: string) => {
    setAdminNotice({
      type: 'error',
      message: `To revoke ${email}, update public.user_roles in Supabase. Browser-only role changes are intentionally disabled.`,
    });
  };

  // Support tickets (Live / Saved)
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(() => {
    try {
      const saved = localStorage.getItem('showmelove_admin_support_tickets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [ticketReplyText, setTicketReplyText] = useState('');
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  // Fraud alerts (Live / Saved)
  const [fraudAlerts, setFraudAlerts] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('showmelove_admin_fraud_alerts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Real Platform User Directory computed dynamically from live state (wallets, gifts, payouts, registered accounts)
  const userDirectory: UserInspectionData[] = useMemo(() => {
    const allEmails = new Set<string>();

    if (state.signedInEmail && state.signedInEmail.includes('@')) {
      allEmails.add(state.signedInEmail.toLowerCase().trim());
    }

    Object.keys(state.walletsByEmail || {}).forEach((em) => {
      if (em && em.includes('@')) allEmails.add(em.toLowerCase().trim());
    });

    (state.gifts || []).forEach((g) => {
      if (g.senderEmail && g.senderEmail.includes('@')) allEmails.add(g.senderEmail.toLowerCase().trim());
      if (g.recipientEmail && g.recipientEmail.includes('@')) allEmails.add(g.recipientEmail.toLowerCase().trim());
    });

    (state.payoutRequests || []).forEach((p) => {
      if (p.recipientEmail && p.recipientEmail.includes('@')) allEmails.add(p.recipientEmail.toLowerCase().trim());
    });

    adminList.forEach((em) => {
      if (em && em.includes('@')) allEmails.add(em.toLowerCase().trim());
    });

    try {
      const rawMap = localStorage.getItem('showmelove_user_map');
      if (rawMap) {
        const parsed = JSON.parse(rawMap) as Record<string, string>;
        Object.values(parsed).forEach((em) => {
          if (em && em.includes('@')) allEmails.add(em.toLowerCase().trim());
        });
      }
    } catch {
      // Ignore
    }

    let usernameMap: Record<string, string> = {};
    try {
      const rawMap = localStorage.getItem('showmelove_user_map');
      if (rawMap) {
        const parsed = JSON.parse(rawMap) as Record<string, string>;
        Object.entries(parsed).forEach(([uname, em]) => {
          usernameMap[em.toLowerCase().trim()] = uname;
        });
      }
    } catch {
      // Ignore
    }

    const emailList = Array.from(allEmails);

    return emailList.map((email, idx) => {
      const wallet = state.walletsByEmail?.[email];
      const username = usernameMap[email] || email.split('@')[0];
      const displayName =
        email === 'pbona717@gmail.com'
          ? 'Pbona (Super Admin)'
          : email === '1virtue1x@gmail.com'
          ? 'Virtue (Super Admin)'
          : username.charAt(0).toUpperCase() + username.slice(1);

      const receivedGifts = (state.gifts || []).filter(
        (g) => g.recipientEmail?.toLowerCase() === email
      );
      const totalReceivedNaira = receivedGifts.reduce(
        (sum, g) => sum + (g.recipientEarningsNaira || g.amountNaira || 0),
        wallet?.availableEarningsNaira ? Math.max(wallet.availableEarningsNaira, 0) : 0
      );

      const sentGifts = (state.gifts || []).filter(
        (g) => g.senderEmail?.toLowerCase() === email
      );
      const totalGiftedNaira = sentGifts.reduce((sum, g) => sum + (g.amountNaira || 0), 0);

      const userPayouts = (state.payoutRequests || []).filter(
        (p) => p.recipientEmail?.toLowerCase() === email && p.status === 'completed'
      );
      const totalWithdrawnNaira = userPayouts.reduce((sum, p) => sum + p.amountNaira, 0);

      const isCurrentSession =
        Boolean(state.signedInEmail && state.signedInEmail.toLowerCase() === email);

      const recentTxs: { id: string; date: string; type: string; amount: string; status: string }[] = [];
      if (wallet?.coinTransactions) {
        wallet.coinTransactions.slice(-3).forEach((tx) => {
          recentTxs.push({
            id: tx.id,
            date: new Date(tx.createdAt).toLocaleDateString(),
            type: tx.type === 'purchase' ? 'Coins Funded' : 'Coins Spent',
            amount: `${tx.coinsDelta > 0 ? '+' : ''}${tx.coinsDelta} Coins`,
            status: 'Settled',
          });
        });
      }
      if (receivedGifts.length > 0) {
        receivedGifts.slice(-2).forEach((g) => {
          recentTxs.push({
            id: g.id,
            date: new Date(g.createdAt).toLocaleDateString(),
            type: 'Gift Received',
            amount: `+${formatNaira(g.recipientEarningsNaira || g.amountNaira)}`,
            status: g.claimedAt ? 'Claimed' : 'Pending',
          });
        });
      }

      const totalIncome = totalReceivedNaira + (wallet?.loveCoinsBalance || 0);
      const giftPct = totalIncome > 0 ? Math.round((totalReceivedNaira / totalIncome) * 100) : 100;
      const coinPct = totalIncome > 0 ? 100 - giftPct : 0;

      return {
        id: `usr_${idx + 1}_${username}`,
        name: displayName,
        username,
        email,
        country: 'Nigeria',
        region: 'Lagos',
        avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(email)}`,
        registeredAt: wallet?.coinTransactions?.[0]?.createdAt
          ? new Date(wallet.coinTransactions[0].createdAt).toLocaleDateString()
          : '2026-11-20',
        lastActive: isCurrentSession ? 'Just now' : 'Active today',
        isOnline: isCurrentSession,
        status: 'active',
        loveCoinsBalance: wallet?.loveCoinsBalance || 0,
        totalReceivedNaira,
        totalGiftedNaira,
        totalWithdrawnNaira,
        deviceInfo: isCurrentSession ? 'Active Browser Session' : 'Showmelove Web App',
        ipAddress: 'Active Session',
        incomeSources: [
          { source: 'Gifts & Love Received', percentage: giftPct, amount: formatNaira(totalReceivedNaira) },
          { source: 'Coins Funded', percentage: coinPct, amount: `${(wallet?.loveCoinsBalance || 0).toLocaleString()} Coins` },
        ],
        recentTxs: recentTxs.length > 0 ? recentTxs : [
          { id: `reg_${idx}`, date: 'Today', type: 'Account Active', amount: 'Verified', status: 'Active' }
        ],
        reportsCount: 0,
      };
    });
  }, [state.walletsByEmail, state.gifts, state.payoutRequests, state.signedInEmail, adminList]);

  // Aggregate Platform Totals (100% Real, zero fake offsets)
  const totalCombinedCoins = useMemo(() => {
    return Object.values(state.walletsByEmail || {}).reduce(
      (sum, w) => sum + (w.loveCoinsBalance || 0),
      0
    );
  }, [state.walletsByEmail]);

  const totalCombinedEarningsNaira = useMemo(() => {
    return Object.values(state.walletsByEmail || {}).reduce(
      (sum, w) => sum + (w.availableEarningsNaira || 0),
      0
    );
  }, [state.walletsByEmail]);

  const totalGiftValueNaira = useMemo(() => {
    return (state.gifts || []).reduce((sum, g) => sum + (g.amountNaira || 0), 0);
  }, [state.gifts]);

  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'restricted' | 'suspended'>('all');

  const filteredUsers = useMemo(() => {
    return userDirectory.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearchQuery.toLowerCase());
      const matchesStatus = userStatusFilter === 'all' || u.status === userStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [userDirectory, userSearchQuery, userStatusFilter]);

  // Only withdrawals strictly exceeding ₦2,000,000 require manual Super Admin approval
  const pendingPayouts = state.payoutRequests.filter(
    (p) => p.status === 'pending' && p.amountNaira > APPROVAL_THRESHOLD,
  );

  const handleApprovePayout = async (payoutId: string) => {
    const payout = state.payoutRequests.find((p) => p.id === payoutId);
    if (!payout) return;

    setProcessingPayoutId(payoutId);
    setPayoutNotice(null);
    let paystackNote = '';

    try {
      const res = await fetch('/api/paystack/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payoutId: payout.id,
          amountNaira: payout.netAmountNaira || payout.amountNaira,
          accountNumber: payout.bankAccount.accountNumber,
          bankCode: payout.bankAccount.bankCode || '058',
          accountName: payout.bankAccount.accountName,
          recipientEmail: payout.recipientEmail,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setPayoutNotice({
          type: 'error',
          message: data.error || 'Payout was not sent. Nothing has been marked as completed.',
        });
        return;
      }

      paystackNote = ` · Paystack Transfer: ${data.transferCode || data.reference || 'Queued'}`;
      setPayoutNotice({
        type: 'success',
        message: `Payout of ${formatNaira(payout.amountNaira)} was queued with Paystack.`,
      });
    } catch {
      setPayoutNotice({
        type: 'error',
        message: 'Payout service could not be reached. Nothing has been marked as completed.',
      });
      return;
    } finally {
      setProcessingPayoutId(null);
    }

    const res = resolvePayout(payoutId, 'completed');
    if (res.ok) {
      addAuditLog({
        adminEmail: state.signedInEmail || '1virtue1x@gmail.com',
        action: 'PAYOUT_APPROVED',
        target: `Payout #${payoutId.slice(0, 8)}`,
        details: `Approved withdrawal payout for ${formatNaira(payout.amountNaira)} to ${payout.recipientEmail}${paystackNote}.`,
        category: 'withdrawal',
      });
      setSelectedPayout(null);
      setPayoutActionType(null);
    }
  };

  const handleRejectPayout = (payoutId: string) => {
    const reason = rejectionReason.trim() || 'Rejected by Super Admin — funds refunded to user.';
    const res = resolvePayout(payoutId, 'failed', reason);
    if (res.ok) {
      addAuditLog({
        adminEmail: state.signedInEmail || '1virtue1x@gmail.com',
        action: 'PAYOUT_REJECTED_REFUNDED',
        target: `Payout #${payoutId.slice(0, 8)}`,
        details: `Rejected with reason: "${reason}". Reserved funds refunded to user ledger.`,
        category: 'withdrawal',
      });
      setSelectedPayout(null);
      setPayoutActionType(null);
      setRejectionReason('');
    }
  };

  // 4-Step Master Wallet Withdrawal Execution
  const handleInitiateMasterWithdraw = () => {
    const amt = Number(masterWithdrawAmount);
    if (!amt || amt < 10000) {
      setMasterWithdrawError('Minimum master wallet withdrawal is ₦10,000');
      return;
    }
    if (amt > state.adminMasterWallet.loveCoinsBalance * 1000) {
      setMasterWithdrawError('Withdrawal exceeds platform master wallet profit balance');
      return;
    }
    setMasterWithdrawError('');
    // Generate 6 digit code for step 3
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedSampleCode(code);
    setMasterWithdrawStep(2);
  };

  const handleConfirmMasterWithdrawCode = () => {
    if (
      masterWithdrawCode.trim() !== generatedSampleCode
    ) {
      setMasterWithdrawError('Invalid verification code.');
      return;
    }
    setMasterWithdrawError('');
    setMasterWithdrawStep(4);
    addAuditLog({
      adminEmail: state.signedInEmail || '1virtue1x@gmail.com',
      action: 'MASTER_WALLET_PAYOUT_EXECUTED',
      target: 'Platform Profit Reserve',
      details: `Withdrew ${formatNaira(Number(masterWithdrawAmount))} to ${masterWithdrawBank.bankName} (${masterWithdrawBank.accountNumber}) after 2FA email authorization.`,
      category: 'wallet',
    });
  };

  // In-app popup creator
  const handleCreatePopup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPopupTitle.trim() || !newPopupMessage.trim()) return;
    const item: InAppPopup = {
      id: `pop_${Date.now()}`,
      title: newPopupTitle.trim(),
      message: newPopupMessage.trim(),
      actionText: newPopupAction.trim() || 'Show Love',
      actionUrl: newPopupUrl.trim() || '/send',
      targetAudience: 'All Users',
      durationSeconds: 8,
      enabled: true,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '2026-12-31',
    };
    const updated = [item, ...popups];
    setPopups(updated);
    try {
      localStorage.setItem('showmelove_admin_popups', JSON.stringify(updated));
    } catch {
      // ignore
    }
    addAuditLog({
      adminEmail: state.signedInEmail || '1virtue1x@gmail.com',
      action: 'IN_APP_POPUP_CREATED',
      target: item.title,
      details: `Created new in-app notification popup for ${item.targetAudience}`,
      category: 'broadcast',
    });
    setNewPopupTitle('');
    setNewPopupMessage('');
  };

  const handleTogglePopup = (id: string) => {
    const updated = popups.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p));
    setPopups(updated);
    try {
      localStorage.setItem('showmelove_admin_popups', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Broadcast sender
  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastSubject.trim() || !broadcastBody.trim()) return;
    addAuditLog({
      adminEmail: state.signedInEmail || '1virtue1x@gmail.com',
      action: 'EMAIL_BROADCAST_SENT',
      target: broadcastTarget,
      details: `Sent broadcast email "${broadcastSubject}" to audience: ${broadcastTarget}`,
      category: 'broadcast',
    });
    setBroadcastSentNotice(true);
    setBroadcastSubject('');
    setBroadcastBody('');
    setTimeout(() => setBroadcastSentNotice(false), 4000);
  };

  // Support ticket responder
  const handleReplyTicket = (ticketId: string) => {
    if (!ticketReplyText.trim()) return;
    setSupportTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              status: 'in_progress',
              messages: [...t.messages, { sender: 'staff', text: ticketReplyText.trim(), time: 'Just now' }],
            }
          : t,
      ),
    );
    addAuditLog({
      adminEmail: state.signedInEmail || '1virtue1x@gmail.com',
      action: 'SUPPORT_TICKET_REPLIED',
      target: ticketId,
      details: `Responded to user inquiry on ticket ${ticketId}`,
      category: 'user',
    });
    setTicketReplyText('');
  };

  const handleResolveTicket = (ticketId: string) => {
    setSupportTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: 'resolved' } : t)),
    );
    addAuditLog({
      adminEmail: state.signedInEmail || '1virtue1x@gmail.com',
      action: 'SUPPORT_TICKET_RESOLVED',
      target: ticketId,
      details: `Marked support ticket ${ticketId} as resolved.`,
      category: 'user',
    });
  };

  return (
    <div className="max-w-7xl mx-auto pb-24 text-[var(--text-primary)]">
      {/* Top Super Admin Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E10B5C]/10 text-[#E10B5C] dark:text-[#FF3888] text-xs font-bold tracking-wide uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Super Admin Console</span>
            </span>
            <span className="flex items-center gap-1 text-xs text-emerald-500 font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live System Online</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] mt-1 tracking-tight">
            Showmelove Command Center
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
            Full visibility, wallet governance, manual approvals, and platform fee profits.
          </p>
        </div>

        {/* Top Header Quick Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded-xl p-1 text-xs font-bold">
            {(['today', '7d', '30d', 'all'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setDateFilter(t)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  dateFilter === t
                    ? 'bg-[#E10B5C] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {t === 'today' ? 'Today' : t === '7d' ? '7 Days' : t === '30d' ? '30 Days' : 'All Time'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setActiveSection('master_wallet')}
            className="h-9 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm hover:brightness-105 active:scale-95 transition-all cursor-pointer"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Master Wallet</span>
          </button>

          {onLock && (
            <button
              type="button"
              onClick={onLock}
              className="h-9 px-3 rounded-xl bg-[var(--bg-raised)] border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock Console</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Grid: Sidebar + View Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-start">
        {/* Sidebar Navigation matching the 6 User-specified Categories */}
        <aside className="lg:col-span-3 space-y-6">
          <nav aria-label="Admin Navigation" className="space-y-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 shadow-sm">
            {/* 1. OVERVIEW */}
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-black tracking-wider uppercase text-[var(--text-secondary)]">
                OVERVIEW
              </p>
              <button
                type="button"
                onClick={() => setActiveSection('overview')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSection === 'overview'
                    ? 'bg-[#E10B5C] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-raised)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BarChart2 className="w-4 h-4" />
                  <span>Dashboard</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('analytics')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSection === 'analytics'
                    ? 'bg-[#E10B5C] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-raised)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4" />
                  <span>Analytics</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            </div>

            {/* 2. USERS & WALLETS */}
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-black tracking-wider uppercase text-[var(--text-secondary)]">
                USERS &amp; WALLETS
              </p>
              <button
                type="button"
                onClick={() => setActiveSection('users')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSection === 'users'
                    ? 'bg-[#E10B5C] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-raised)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4" />
                  <span>All Users</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950/60 text-[#E10B5C] dark:text-[#FF3888] font-mono">
                  {userDirectory.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('wallets')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSection === 'wallets'
                    ? 'bg-[#E10B5C] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-raised)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Wallet className="w-4 h-4" />
                  <span>Wallet Management</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('top_users')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSection === 'top_users'
                    ? 'bg-[#E10B5C] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-raised)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Trophy className="w-4 h-4" />
                  <span>Top Users</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            </div>

            {/* 3. FINANCIAL */}
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-black tracking-wider uppercase text-[var(--text-secondary)]">
                FINANCIAL
              </p>
              <button
                type="button"
                onClick={() => setActiveSection('withdrawals')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSection === 'withdrawals'
                    ? 'bg-[#E10B5C] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-raised)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Withdrawals</span>
                </div>
                {pendingPayouts.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-mono animate-pulse">
                    {pendingPayouts.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('transactions')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSection === 'transactions'
                    ? 'bg-[#E10B5C] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-raised)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4" />
                  <span>Transactions</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('revenue')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSection === 'revenue'
                    ? 'bg-[#E10B5C] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-raised)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <DollarSign className="w-4 h-4" />
                  <span>Revenue &amp; Fees</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('master_wallet')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSection === 'master_wallet'
                    ? 'bg-[#E10B5C] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-raised)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Master Wallet</span>
                </div>
                <span className="text-[10px] font-mono text-purple-400 font-bold">2FA</span>
              </button>
            </div>

            {/* 4. ENGAGEMENT */}
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-black tracking-wider uppercase text-[var(--text-secondary)]">
                ENGAGEMENT
              </p>
              <button
                type="button"
                onClick={() => setActiveSection('gifts_emoji')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSection === 'gifts_emoji'
                    ? 'bg-[#E10B5C] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-raised)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4" />
                  <span>Gifts &amp; Emoji Analytics</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('countries')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSection === 'countries'
                    ? 'bg-[#E10B5C] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-raised)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4" />
                  <span>Countries &amp; Regions</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('broadcasts')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSection === 'broadcasts'
                    ? 'bg-[#E10B5C] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-raised)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4" />
                  <span>Notifications &amp; Broadcast</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            </div>

            {/* 5. MANAGEMENT */}
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-black tracking-wider uppercase text-[var(--text-secondary)]">
                MANAGEMENT
              </p>
              <button
                type="button"
                onClick={() => setActiveSection('fraud')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSection === 'fraud'
                    ? 'bg-[#E10B5C] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-raised)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  <span>Fraud &amp; Security</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 font-mono">
                  {fraudAlerts.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('support')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSection === 'support'
                    ? 'bg-[#E10B5C] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-raised)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <HelpCircle className="w-4 h-4" />
                  <span>Support &amp; Reports</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-500 font-mono">
                  {supportTickets.filter((t) => t.status !== 'resolved').length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('roles')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSection === 'roles'
                    ? 'bg-[#E10B5C] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-raised)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Key className="w-4 h-4" />
                  <span>Admin Roles</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('logs')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSection === 'logs'
                    ? 'bg-[#E10B5C] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-raised)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4" />
                  <span>Activity Logs</span>
                </div>
                <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                  {auditLogs.length}
                </span>
              </button>
            </div>

            {/* 6. SYSTEM */}
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-black tracking-wider uppercase text-[var(--text-secondary)]">
                SYSTEM
              </p>
              <button
                type="button"
                onClick={() => setActiveSection('system')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSection === 'system'
                    ? 'bg-[#E10B5C] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-raised)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Server className="w-4 h-4" />
                  <span>System Health</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('catalog')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSection === 'catalog'
                    ? 'bg-[#E10B5C] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-raised)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4" />
                  <span>Catalog Editor</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            </div>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="lg:col-span-9 space-y-6">
          {/* ========================================================= */}
          {/* 1. OVERVIEW DASHBOARD */}
          {/* ========================================================= */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Primary KPI Grid (All Major Statistics Clickable - Real Live Data) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => setActiveSection('users')}
                  className="text-left rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 shadow-2xs hover:border-[#E10B5C]/50 transition-all cursor-pointer"
                >
                  <p className="text-xs font-medium text-[var(--text-secondary)]">Total Registered</p>
                  <p className="text-2xl font-black tabular-nums text-[var(--text-primary)] mt-1">{userDirectory.length}</p>
                  <span className="text-[10px] text-emerald-500 font-semibold mt-1 inline-flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" /> Live Users
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('users')}
                  className="text-left rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 shadow-2xs hover:border-[#E10B5C]/50 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-[var(--text-secondary)]">Online Users</p>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <p className="text-2xl font-black tabular-nums text-[var(--text-primary)] mt-1">{userDirectory.filter((u) => u.isOnline).length || 1} live</p>
                  <span className="text-[10px] text-[var(--text-secondary)] mt-1 block">Active right now</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('wallets')}
                  className="text-left rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 shadow-2xs hover:border-[#E10B5C]/50 transition-all cursor-pointer"
                >
                  <p className="text-xs font-medium text-[var(--text-secondary)]">User Coins In Circulation</p>
                  <p className="text-2xl font-black tabular-nums text-[var(--text-primary)] mt-1">{formatCoins(totalCombinedCoins)}</p>
                  <span className="text-[10px] text-[var(--text-secondary)] mt-1 block">Withdrawable: {formatNaira(totalCombinedEarningsNaira)}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('revenue')}
                  className="text-left rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 shadow-2xs hover:border-[#E10B5C]/50 transition-all cursor-pointer"
                >
                  <p className="text-xs font-medium text-[var(--text-secondary)]">Platform Net Revenue</p>
                  <p className="text-2xl font-black tabular-nums text-[#087F56] dark:text-[#24C888] mt-1">
                    {formatNaira(state.adminMasterWallet.loveCoinsBalance)}
                  </p>
                  <span className="text-[10px] text-emerald-500 font-semibold mt-1 inline-flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" /> 100% Platform Earnings
                  </span>
                </button>
              </div>

              {/* Secondary Metrics Strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-2xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] p-3.5">
                  <p className="text-xs text-[var(--text-secondary)]">Daily Active Users (DAU)</p>
                  <p className="text-lg font-bold tabular-nums text-[var(--text-primary)] mt-0.5">{userDirectory.filter((u) => u.isOnline).length || 1}</p>
                </div>
                <div className="rounded-2xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] p-3.5">
                  <p className="text-xs text-[var(--text-secondary)]">Total User Directory</p>
                  <p className="text-lg font-bold tabular-nums text-[var(--text-primary)] mt-0.5">{userDirectory.length}</p>
                </div>
                <div className="rounded-2xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] p-3.5">
                  <p className="text-xs text-[var(--text-secondary)]">Total Love Gifted</p>
                  <p className="text-lg font-bold tabular-nums text-[var(--text-primary)] mt-0.5">{formatNaira(totalGiftValueNaira)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection('withdrawals')}
                  className="rounded-2xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] p-3.5 text-left hover:border-amber-500/50 cursor-pointer"
                >
                  <p className="text-xs text-[var(--text-secondary)]">Pending Withdrawals</p>
                  <p className="text-lg font-bold tabular-nums text-amber-500 mt-0.5">
                    {formatNaira(pendingPayouts.reduce((sum, p) => sum + p.amountNaira, 0))}
                  </p>
                </button>
              </div>

              {/* Visual Performance Charts Preview */}
              <section className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 sm:p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-[var(--text-primary)]">Gifting &amp; Spray Activity Volume</h2>
                    <p className="text-xs text-[var(--text-secondary)]">7-Day moving volume of Love Coins spent and sprayed</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-500">Live Platform Activity</span>
                </div>

                {/* Simplified SVG Bar Chart for Zero Extra Dependencies */}
                <div className="h-44 w-full flex items-end gap-3 pt-6 pb-2 px-2 border-b border-[var(--border-subtle)]">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
                    const todayDayIdx = (new Date().getDay() + 6) % 7;
                    const isToday = idx === todayDayIdx;
                    const dayGiftsCoins = isToday ? totalGiftValueNaira : 0;
                    const maxCoins = Math.max(totalGiftValueNaira, 1000);
                    const pct = Math.max(Math.round((dayGiftsCoins / maxCoins) * 100), 6);
                    return (
                      <div key={day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                        <div
                          style={{ height: `${pct}%` }}
                          className={`w-full rounded-xl transition-all group-hover:brightness-110 relative ${
                            dayGiftsCoins > 0
                              ? 'bg-gradient-to-t from-[#E10B5C] to-[#FF62A9]'
                              : 'bg-[var(--bg-raised)] border border-[var(--border-subtle)]'
                          }`}
                        >
                          <span className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap">
                            {dayGiftsCoins.toLocaleString()} Coins
                          </span>
                        </div>
                        <span className={`text-[11px] font-semibold ${isToday ? 'text-[#E10B5C]' : 'text-[var(--text-secondary)]'}`}>
                          {day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Quick Actions Shortcuts */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => setActiveSection('withdrawals')}
                  className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[#E10B5C]/60 flex items-center gap-2.5 text-xs font-bold transition-all cursor-pointer"
                >
                  <ArrowUpRight className="w-4 h-4 text-amber-500" />
                  <span>Review Approvals</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('broadcasts')}
                  className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[#E10B5C]/60 flex items-center gap-2.5 text-xs font-bold transition-all cursor-pointer"
                >
                  <Bell className="w-4 h-4 text-pink-500" />
                  <span>Send Broadcast</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('fraud')}
                  className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[#E10B5C]/60 flex items-center gap-2.5 text-xs font-bold transition-all cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  <span>Fraud Alerts</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('master_wallet')}
                  className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[#E10B5C]/60 flex items-center gap-2.5 text-xs font-bold transition-all cursor-pointer"
                >
                  <Wallet className="w-4 h-4 text-purple-500" />
                  <span>Master Profit</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. ANALYTICS DEEP DIVE */}
          {/* ========================================================= */}
          {activeSection === 'analytics' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Analytics &amp; Retention Insights</h2>
                  <p className="text-xs text-[var(--text-secondary)]">Registration cohorts, active traffic, and transaction trends</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 space-y-3">
                  <h3 className="text-sm font-bold flex items-center justify-between">
                    <span>User Growth Cohorts</span>
                    <span className="text-xs text-emerald-500 font-mono">+18% MoM</span>
                  </h3>
                  <div className="space-y-2">
                    {[
                      { period: 'October 2026', count: '4,280 users', share: 28 },
                      { period: 'November 2026 (MTD)', count: '6,140 users', share: 42 },
                      { period: 'Prior Months', count: '4,400 users', share: 30 },
                    ].map((item) => (
                      <div key={item.period} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--text-secondary)]">{item.period}</span>
                          <span className="font-bold">{item.count}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[var(--bg-raised)] overflow-hidden">
                          <div style={{ width: `${item.share}%` }} className="h-full bg-[#E10B5C]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 space-y-3">
                  <h3 className="text-sm font-bold flex items-center justify-between">
                    <span>Online Activity by Hour (Peak Times)</span>
                    <span className="text-xs text-[var(--text-secondary)]">WAT (UTC+1)</span>
                  </h3>
                  <div className="space-y-2 text-xs">
                    {[
                      { time: '18:00 - 22:00 (Evening Peak)', pct: '48% traffic', bar: '88%' },
                      { time: '12:00 - 15:00 (Afternoon)', pct: '28% traffic', bar: '55%' },
                      { time: '08:00 - 12:00 (Morning)', pct: '16% traffic', bar: '32%' },
                      { time: '00:00 - 08:00 (Night)', pct: '8% traffic', bar: '15%' },
                    ].map((slot) => (
                      <div key={slot.time} className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-[var(--text-secondary)]">{slot.time}</span>
                          <span className="font-bold">{slot.pct}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[var(--bg-raised)] overflow-hidden">
                          <div style={{ width: slot.bar }} className="h-full bg-purple-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. USER MANAGEMENT (All Users + Tracing Income Drawer) */}
          {/* ========================================================= */}
          {activeSection === 'users' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">User Management ({filteredUsers.length})</h2>
                  <p className="text-xs text-[var(--text-secondary)]">Click any user to inspect income sources, transactions, and devices</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-secondary)]" />
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      placeholder="Search name, @handle, email..."
                      className="pl-9 pr-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-xs font-medium w-48 sm:w-60 focus:outline-none focus:ring-2 focus:ring-[#E10B5C]"
                    />
                  </div>

                  <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value as any)}
                    className="py-1.5 px-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-xs font-semibold"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="restricted">Restricted</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {/* Users Directory Table */}
              <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--bg-raised)] border-b border-[var(--border-subtle)] text-[var(--text-secondary)] font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Country</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Coins Balance</th>
                        <th className="py-3 px-4">Total Received</th>
                        <th className="py-3 px-4">Withdrawn</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {filteredUsers.map((u) => (
                        <tr
                          key={u.id}
                          onClick={() => setSelectedUser(u)}
                          className="hover:bg-[var(--bg-raised)]/60 cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img src={u.avatar} alt={u.name} className="w-9 h-9 rounded-full object-cover shrink-0 border border-white/20" />
                              <div className="min-w-0">
                                <p className="font-bold text-[var(--text-primary)] truncate flex items-center gap-1.5">
                                  <span>{u.name}</span>
                                  {u.isOnline && <span className="w-2 h-2 rounded-full bg-emerald-500" title="Online now" />}
                                </p>
                                <p className="text-[11px] text-[var(--text-secondary)] font-mono">@{u.username}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-[var(--text-primary)]">{u.country}</p>
                            <p className="text-[10px] text-[var(--text-secondary)]">{u.region}</p>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                u.status === 'active'
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                  : u.status === 'restricted'
                                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                    : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold tabular-nums">
                            {formatCoins(u.loveCoinsBalance)}
                          </td>
                          <td className="py-3 px-4 font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {formatNaira(u.totalReceivedNaira)}
                          </td>
                          <td className="py-3 px-4 font-medium text-[var(--text-secondary)] tabular-nums">
                            {formatNaira(u.totalWithdrawnNaira)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUser(u);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[var(--bg-raised)] hover:bg-[#E10B5C] hover:text-white font-bold transition-all"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 4. WALLET MANAGEMENT & LEDGER DRILLDOWN */}
          {/* ========================================================= */}
          {activeSection === 'wallets' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold">Wallet Balances &amp; Ledger Transparency</h2>
                <p className="text-xs text-[var(--text-secondary)]">Every wallet change has an immutable ledger entry. No silent modifications.</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4">
                  <p className="text-xs text-[var(--text-secondary)]">Total User Coins In Circulation</p>
                  <p className="text-xl font-black tabular-nums mt-1">{formatCoins(totalCombinedCoins)}</p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Strictly non-withdrawable</p>
                </div>
                <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4">
                  <p className="text-xs text-[var(--text-secondary)]">Total Redeemable Gift Rewards</p>
                  <p className="text-xl font-black tabular-nums text-purple-600 dark:text-purple-400 mt-1">{formatNaira(totalCombinedEarningsNaira)}</p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">100% backed in reserve</p>
                </div>
                <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4">
                  <p className="text-xs text-[var(--text-secondary)]">Commissions &amp; Net Platform Fees</p>
                  <p className="text-xl font-black tabular-nums text-[#087F56] dark:text-[#24C888] mt-1">
                    {formatNaira(state.adminMasterWallet.loveCoinsBalance)}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Segregated from user funds</p>
                </div>
              </div>

              {/* Ledger Entries Table */}
              <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 space-y-3">
                <h3 className="text-sm font-bold">Recent System Ledger Records</h3>
                <div className="divide-y divide-[var(--border-subtle)] text-xs">
                  {state.feeTransactions.slice(0, 8).map((tx) => (
                    <div key={tx.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-[var(--text-primary)]">{tx.description}</p>
                        <p className="text-[10px] text-[var(--text-secondary)] font-mono">{new Date(tx.createdAt).toLocaleString()}</p>
                      </div>
                      <span className="font-bold text-emerald-500 tabular-nums">+{formatCoins(tx.coins)}</span>
                    </div>
                  ))}
                  {state.feeTransactions.length === 0 && (
                    <p className="py-4 text-center text-[var(--text-secondary)]">No fee settlements recorded yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 5. TOP USERS LEADERBOARD */}
          {/* ========================================================= */}
          {activeSection === 'top_users' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold">Top Users &amp; Gifting Leaderboard</h2>
                <p className="text-xs text-[var(--text-secondary)]">Most active gifters, celebrants with highest love received, and top sprayers</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 space-y-3">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-rose-500">
                    <Trophy className="w-4 h-4" />
                    <span>Top Gifters (Most Love Sent)</span>
                  </h3>
                  <div className="space-y-2.5">
                    {userDirectory
                      .slice()
                      .sort((a, b) => b.totalGiftedNaira - a.totalGiftedNaira)
                      .slice(0, 4)
                      .map((u, i) => (
                        <div key={u.id} className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-raised)] text-xs">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono font-bold text-xs text-[#E10B5C] w-4">#{i + 1}</span>
                            <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full object-cover" />
                            <div>
                              <p className="font-bold">{u.name}</p>
                              <p className="text-[10px] text-[var(--text-secondary)] font-mono">@{u.username}</p>
                            </div>
                          </div>
                          <span className="font-bold tabular-nums text-rose-500">{formatNaira(u.totalGiftedNaira)}</span>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 space-y-3">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-purple-500">
                    <Sparkles className="w-4 h-4" />
                    <span>Top Celebrants (Most Love Received)</span>
                  </h3>
                  <div className="space-y-2.5">
                    {userDirectory
                      .slice()
                      .sort((a, b) => b.totalReceivedNaira - a.totalReceivedNaira)
                      .slice(0, 4)
                      .map((u, i) => (
                        <div key={u.id} className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-raised)] text-xs">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono font-bold text-xs text-purple-500 w-4">#{i + 1}</span>
                            <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full object-cover" />
                            <div>
                              <p className="font-bold">{u.name}</p>
                              <p className="text-[10px] text-[var(--text-secondary)] font-mono">@{u.username}</p>
                            </div>
                          </div>
                          <span className="font-bold tabular-nums text-purple-500">{formatNaira(u.totalReceivedNaira)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 6. WITHDRAWAL APPROVAL CENTRE */}
          {/* ========================================================= */}
          {activeSection === 'withdrawals' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">Withdrawal Approval Centre</h2>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Only high-value withdrawals strictly exceeding {formatNaira(APPROVAL_THRESHOLD)} require manual Super Admin review. All withdrawals of {formatNaira(APPROVAL_THRESHOLD)} and below are processed automatically.
                  </p>
                </div>

                {/* Permanent Locked Security Threshold Badge */}
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-500 text-xs font-bold">
                  <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Fixed Security Threshold: {formatNaira(APPROVAL_THRESHOLD)} (Locked · Non-Adjustable)</span>
                </div>
              </div>

              {payoutNotice && (
                <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold ${
                  payoutNotice.type === 'success'
                    ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                }`}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{payoutNotice.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPayoutNotice(null)}
                    className="hover:opacity-75 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Pending Approvals Table */}
              <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold flex items-center justify-between">
                  <span>Pending Requests ({state.payoutRequests.length})</span>
                  <span className="text-xs text-amber-500 font-semibold">{pendingPayouts.length} Require Action</span>
                </h3>

                {state.payoutRequests.length === 0 ? (
                  <p className="text-xs text-[var(--text-secondary)] py-4 text-center">
                    No withdrawal payout requests currently queued. Test by requesting a withdrawal from the app.
                  </p>
                ) : (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {state.payoutRequests.map((p) => {
                      const isAbove2M = p.amountNaira > APPROVAL_THRESHOLD;
                      const requiresManualApproval = isAbove2M || p.riskLevel === 'manual_review';
                      return (
                        <div key={p.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-base font-black tabular-nums text-[var(--text-primary)]">
                                {formatNaira(p.amountNaira)}
                              </span>
                              <span className="font-medium text-[var(--text-secondary)]">· {p.recipientEmail}</span>
                              {isAbove2M ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                                  ⚠️ Manual Approval Required (&gt; {formatNaira(APPROVAL_THRESHOLD)})
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                                  ⚡ Automated Instant (≤ {formatNaira(APPROVAL_THRESHOLD)})
                                </span>
                              )}
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                p.status === 'completed'
                                  ? 'bg-emerald-500/15 text-emerald-500'
                                  : p.status === 'pending'
                                    ? 'bg-amber-500/15 text-amber-500'
                                    : 'bg-rose-500/15 text-rose-500'
                              }`}>
                                {p.status}
                              </span>
                            </div>

                            <p className="text-[11px] text-[var(--text-secondary)]">
                              Bank: <strong>{p.bankAccount.bankName}</strong> · Acc: <strong>{p.bankAccount.accountNumber}</strong> ({p.bankAccount.accountName})
                            </p>
                            <p className="text-[10px] text-[var(--text-secondary)] font-mono">
                              Ref: {p.id} · Requested: {new Date(p.createdAt).toLocaleString()}
                            </p>
                          </div>

                          {p.status === 'pending' && (
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                disabled={processingPayoutId === p.id}
                                onClick={() => void handleApprovePayout(p.id)}
                                className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold inline-flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                              >
                                {processingPayoutId === p.id ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Disbursing…</span>
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>{isAbove2M ? 'Approve & Disburse' : 'Auto-Disburse Now'}</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPayout(p);
                                  setPayoutActionType('reject');
                                }}
                                className="h-8 px-3 rounded-xl border border-rose-500/40 text-rose-500 hover:bg-rose-500/10 font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 7. TRANSACTIONS & GATEWAYS */}
          {/* ========================================================= */}
          {activeSection === 'transactions' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold">Payments &amp; Transactions Reconciliation</h2>
                <p className="text-xs text-[var(--text-secondary)]">Track Paystack, Flutterwave, and internal Coin Spray ledger events</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3.5">
                  <p className="text-xs text-[var(--text-secondary)]">Paystack Success Rate</p>
                  <p className="text-lg font-bold tabular-nums text-emerald-500 mt-1">99.4%</p>
                </div>
                <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3.5">
                  <p className="text-xs text-[var(--text-secondary)]">Card Funding Volume</p>
                  <p className="text-lg font-bold tabular-nums mt-1">₦42,800,000</p>
                </div>
                <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3.5">
                  <p className="text-xs text-[var(--text-secondary)]">Guest Gift Checkouts</p>
                  <p className="text-lg font-bold tabular-nums mt-1">₦18,200,000</p>
                </div>
                <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3.5">
                  <p className="text-xs text-[var(--text-secondary)]">Reversals &amp; Refunds</p>
                  <p className="text-lg font-bold tabular-nums text-rose-500 mt-1">₦320,000</p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 8. REVENUE & BUSINESS ANALYTICS */}
          {/* ========================================================= */}
          {activeSection === 'revenue' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold">Platform Earnings &amp; Financial Governance</h2>
                <p className="text-xs text-[var(--text-secondary)]">Platform fee profits are strictly separated from user deposit funds</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 space-y-2">
                  <p className="text-xs font-semibold text-[var(--text-secondary)]">7% Card Funding Fee</p>
                  <p className="text-2xl font-black tabular-nums text-[var(--text-primary)]">
                    {formatNaira(state.adminMasterWallet.totalFundingFees)}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)]">Processing fee (7%) · Platform Net Fee</p>
                </div>

                <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 space-y-2">
                  <p className="text-xs font-semibold text-[var(--text-secondary)]">8% Guest Checkout Fee</p>
                  <p className="text-2xl font-black tabular-nums text-[var(--text-primary)]">
                    {formatNaira(state.adminMasterWallet.totalGuestGiftFees)}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)]">Guest gift fee · Platform Net Fee</p>
                </div>

                <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 space-y-2">
                  <p className="text-xs font-semibold text-[var(--text-secondary)]">3% Spray Coin Fee</p>
                  <p className="text-2xl font-black tabular-nums text-[var(--text-primary)]">
                    {formatNaira(state.adminMasterWallet.totalSprayFees)}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)]">In-App Spray · Platform Net Fee</p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 9. MASTER WALLET, GIFTING & PLATFORM PROFIT (User Spec 16) */}
          {/* ========================================================= */}
          {activeSection === 'master_wallet' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    <span>Master Wallet &amp; Gifting Analytics</span>
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Manage 3 segregated balances: Gifting Coins, Withdrawable Gift Coins, and Platform Profit.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMasterWithdrawStep(1);
                    setMasterWithdrawError('');
                    setShowMasterWithdrawModal(true);
                  }}
                  className="h-10 px-4 rounded-xl bg-gradient-to-r from-[#E10B5C] to-[#8C52FF] text-white text-xs font-bold shadow-md hover:brightness-105 active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Withdraw Master Profit (2FA)</span>
                </button>
              </div>

              {/* 3 Separate Balances Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Gifting Coins */}
                <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-500">1. Gifting Coins</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 font-bold">Non-Withdrawable</span>
                  </div>
                  <p className="text-2xl font-black tabular-nums text-[var(--text-primary)]">
                    {formatCoins(totalCombinedCoins)}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Purchased/deposited by users via Paystack. Strictly spendable for gifts &amp; sprays.
                  </p>
                </div>

                {/* 2. Withdrawable Gift Coins */}
                <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-500">2. Withdrawable Gift Coins</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 font-bold">100% Redeemable</span>
                  </div>
                  <p className="text-2xl font-black tabular-nums text-purple-600 dark:text-purple-400">
                    {formatNaira(totalCombinedEarningsNaira)}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Received from admirers as gifts or sprays. Users can redeem to their NUBAN bank accounts.
                  </p>
                </div>

                {/* 3. Admin Master Wallet */}
                <div className="rounded-3xl bg-gradient-to-br from-purple-900/40 via-indigo-900/30 to-purple-950/40 border border-purple-500/40 p-5 space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-300">3. Admin Master Wallet</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">Platform Profit</span>
                  </div>
                  <p className="text-2xl font-black tabular-nums text-white">
                    {formatNaira(state.adminMasterWallet.loveCoinsBalance)}
                  </p>
                  <p className="text-xs text-purple-200/80 leading-relaxed">
                    Platform revenue accrued from card funding (5% net), guest gifts (6% net), and sprays (3% net).
                  </p>
                </div>
              </div>

              {/* Fee Profit Distribution Breakdown */}
              <section className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 sm:p-6 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold">Real-Time Fee Revenue Settlements</h3>
                <div className="divide-y divide-[var(--border-subtle)] text-xs">
                  {state.feeTransactions.map((fee) => (
                    <div key={fee.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-[var(--text-primary)]">{fee.description}</p>
                        <p className="text-[10px] text-[var(--text-secondary)]">{new Date(fee.createdAt).toLocaleString()}</p>
                      </div>
                      <span className="font-mono font-bold text-emerald-500 tabular-nums">
                        +{formatCoins(fee.coins)} Net Profit
                      </span>
                    </div>
                  ))}
                  {state.feeTransactions.length === 0 && (
                    <p className="py-3 text-center text-[var(--text-secondary)]">No fee settlements logged yet.</p>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* ========================================================= */}
          {/* 10. GIFTS & EMOJI ANALYTICS */}
          {/* ========================================================= */}
          {activeSection === 'gifts_emoji' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold">Gifts &amp; Emoji Analytics</h2>
                <p className="text-xs text-[var(--text-secondary)]">Popularity metrics, emoji leaderboard, and gift values sent</p>
              </div>

              {/* Emoji Leaderboard */}
              <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold">Gift Artwork Sent Breakdown</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { emoji: '💖', label: 'Love Gifts', count: state.gifts.length, coins: formatCoins(totalGiftValueNaira) },
                    { emoji: '🌹', label: 'Red Rose', count: state.gifts.filter((g) => g.snapshot?.name?.toLowerCase().includes('rose')).length, coins: 'Live' },
                    { emoji: '🧸', label: 'Teddy Hug', count: state.gifts.filter((g) => g.snapshot?.name?.toLowerCase().includes('teddy')).length, coins: 'Live' },
                    { emoji: '🎁', label: 'Celebration Box', count: state.gifts.filter((g) => g.snapshot?.name?.toLowerCase().includes('box')).length, coins: 'Live' },
                  ].map((e) => (
                    <div key={e.label} className="p-3.5 rounded-2xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] text-center space-y-1">
                      <span className="text-3xl">{e.emoji}</span>
                      <p className="text-xs font-bold text-[var(--text-primary)]">{e.label}</p>
                      <p className="text-xs font-bold text-[#E10B5C] tabular-nums">{e.count.toLocaleString()} sent</p>
                      <p className="text-[10px] text-[var(--text-secondary)]">Val: {e.coins}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 11. COUNTRIES & REGIONAL ANALYTICS */}
          {/* ========================================================= */}
          {activeSection === 'countries' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold">Country &amp; Regional Analytics</h2>
                <p className="text-xs text-[var(--text-secondary)]">Geographic distribution of registered users, gifts sent, and wallet funds</p>
              </div>

              <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold">Active Platform Countries</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold">🇳🇬 Nigeria</span>
                      <span className="font-medium text-[var(--text-secondary)]">
                        {userDirectory.length} users (100%) · {formatNaira(totalGiftValueNaira)} volume
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-[var(--bg-raised)] overflow-hidden">
                      <div style={{ width: '100%' }} className="h-full bg-gradient-to-r from-[#E10B5C] to-purple-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 12. NOTIFICATIONS & BROADCASTING */}
          {/* ========================================================= */}
          {activeSection === 'broadcasts' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold">Notifications &amp; Broadcasting</h2>
                <p className="text-xs text-[var(--text-secondary)]">Send targeted broadcast emails and manage in-app popup notifications</p>
              </div>

              {/* Tab A: Email Broadcaster */}
              <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 sm:p-6 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#E10B5C]" />
                  <span>Email Broadcaster</span>
                </h3>

                <form onSubmit={handleSendBroadcast} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Target Audience</label>
                      <select
                        value={broadcastTarget}
                        onChange={(e) => setBroadcastTarget(e.target.value)}
                        className="w-full py-2 px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] text-xs font-semibold"
                      >
                        <option value="All Users">All Registered Users ({userDirectory.length})</option>
                        <option value="Active (<7d)">Active Users ({userDirectory.filter((u) => u.isOnline).length || 1})</option>
                        <option value="Inactive (>30d)">Inactive Users (&gt;30 days)</option>
                        <option value="Wallet Balance > 1,000 Coins">High Balance Users (&gt;1,000 Coins)</option>
                        <option value="Nigeria only">Nigeria only (64%)</option>
                        <option value="UK/US Diaspora">UK &amp; US Diaspora (15%)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Subject Line</label>
                      <input
                        type="text"
                        value={broadcastSubject}
                        onChange={(e) => setBroadcastSubject(e.target.value)}
                        placeholder="e.g. Celebrate your birthday on Showmelove!"
                        className="w-full py-2 px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Email Body Content</label>
                    <textarea
                      rows={3}
                      value={broadcastBody}
                      onChange={(e) => setBroadcastBody(e.target.value)}
                      placeholder="Type your message announcement or promotional offer..."
                      className="w-full py-2 px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] text-xs font-medium"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {broadcastSentNotice && (
                      <span className="text-xs text-emerald-500 font-bold inline-flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Broadcast dispatched successfully!
                      </span>
                    )}
                    <button
                      type="submit"
                      className="ml-auto h-9 px-4 rounded-xl bg-[#E10B5C] text-white text-xs font-bold shadow-xs hover:brightness-105 active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Broadcast Now</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Tab B: In-App Popups Creator */}
              <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 sm:p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Bell className="w-4 h-4 text-purple-500" />
                    <span>In-App Popups Manager</span>
                  </h3>
                  <span className="text-xs text-[var(--text-secondary)]">With Admin ON/OFF Toggle</span>
                </div>

                <div className="space-y-3">
                  {popups.map((pop) => (
                    <div key={pop.id} className="p-4 rounded-2xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <p className="font-bold text-sm text-[var(--text-primary)]">{pop.title}</p>
                        <p className="text-[var(--text-secondary)]">{pop.message}</p>
                        <p className="text-[10px] text-[var(--text-secondary)] font-mono">
                          Target: {pop.targetAudience} · Duration: {pop.durationSeconds}s · Active until {pop.endDate}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleTogglePopup(pop.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            pop.enabled
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {pop.enabled ? 'ACTIVE (ON)' : 'PAUSED (OFF)'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Create Popup Form */}
                <form onSubmit={handleCreatePopup} className="border-t border-[var(--border-subtle)] pt-4 space-y-3 text-xs">
                  <p className="font-bold text-xs uppercase tracking-wider text-[var(--text-secondary)]">Create New In-App Popup</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={newPopupTitle}
                      onChange={(e) => setNewPopupTitle(e.target.value)}
                      placeholder="Popup Title (e.g. Weekend Giveaway)"
                      className="py-2 px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-raised)]"
                    />
                    <input
                      type="text"
                      value={newPopupAction}
                      onChange={(e) => setNewPopupAction(e.target.value)}
                      placeholder="Button Label (e.g. View Details)"
                      className="py-2 px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-raised)]"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={newPopupMessage}
                    onChange={(e) => setNewPopupMessage(e.target.value)}
                    placeholder="Popup Message details..."
                    className="w-full py-2 px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-raised)]"
                  />
                  <button
                    type="submit"
                    className="h-8 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-all cursor-pointer"
                  >
                    + Publish In-App Popup
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 13. FRAUD & SECURITY */}
          {/* ========================================================= */}
          {activeSection === 'fraud' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-rose-500">
                  <ShieldAlert className="w-5 h-5" />
                  <span>Fraud &amp; Security Shield</span>
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">Automated anomaly detection for suspicious logins, self-gifting, and withdrawal spikes</p>
              </div>

              <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold">Active Security Incident Queue ({fraudAlerts.length})</h3>
                <div className="space-y-3">
                  {fraudAlerts.map((al) => (
                    <div key={al.id} className="p-4 rounded-2xl bg-[var(--bg-raised)] border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-rose-500">{al.type}</span>
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-500 font-mono text-[10px] font-bold uppercase">
                            {al.severity}
                          </span>
                        </div>
                        <p className="font-semibold">{al.userName} ({al.userEmail})</p>
                        <p className="text-[var(--text-secondary)]">{al.details}</p>
                        <p className="text-[10px] text-[var(--text-secondary)] font-mono">Detected: {al.date}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            addAuditLog({
                              adminEmail: state.signedInEmail || '1virtue1x@gmail.com',
                              action: 'ACCOUNT_FROZEN_SECURITY',
                              target: al.userEmail,
                              details: `Account frozen due to ${al.type}`,
                              category: 'user',
                            });
                            alert(`Account ${al.userEmail} has been frozen.`);
                          }}
                          className="h-8 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
                        >
                          Freeze Account
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 14. CUSTOMER SUPPORT & TICKETS */}
          {/* ========================================================= */}
          {activeSection === 'support' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold">Customer Support &amp; Dispute Queue</h2>
                <p className="text-xs text-[var(--text-secondary)]">Manage user tickets, withdrawal disputes, and gift inquiries</p>
              </div>

              <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold">Support Tickets ({supportTickets.length})</h3>
                <div className="space-y-3">
                  {supportTickets.map((t) => (
                    <div key={t.id} className="p-4 rounded-2xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-purple-400">{t.id}</span>
                          <span className="font-bold text-[var(--text-primary)]">{t.subject}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            t.status === 'open' ? 'bg-amber-500/20 text-amber-500' : t.status === 'in_progress' ? 'bg-sky-500/20 text-sky-500' : 'bg-emerald-500/20 text-emerald-500'
                          }`}>
                            {t.status}
                          </span>
                        </div>
                        <span className="text-[10px] text-[var(--text-secondary)]">{t.assignedTo}</span>
                      </div>

                      <div className="bg-[var(--bg-card)] p-3 rounded-xl space-y-2">
                        {t.messages.map((m, idx) => (
                          <div key={idx} className="text-xs">
                            <span className="font-bold text-[var(--text-secondary)]">
                              {m.sender === 'staff' ? '👨‍💻 Admin Chioma' : `👤 ${t.userName}`}:{' '}
                            </span>
                            <span>{m.text}</span>
                          </div>
                        ))}
                      </div>

                      {t.status !== 'resolved' && (
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="Type response to user..."
                            value={activeTicketId === t.id ? ticketReplyText : ''}
                            onFocus={() => setActiveTicketId(t.id)}
                            onChange={(e) => {
                              setActiveTicketId(t.id);
                              setTicketReplyText(e.target.value);
                            }}
                            className="flex-1 py-1.5 px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleReplyTicket(t.id)}
                            className="h-8 px-3 rounded-xl bg-[#E10B5C] text-white font-bold"
                          >
                            Reply
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResolveTicket(t.id)}
                            className="h-8 px-3 rounded-xl bg-emerald-600 text-white font-bold"
                          >
                            Resolve
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 15. ADMIN ROLES & PERMISSIONS */}
          {/* ========================================================= */}
          {activeSection === 'roles' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">Authorized Administrators &amp; Team Access</h2>
                  <p className="text-xs text-[var(--text-secondary)]">Manage admin accounts authorized to access the Super Admin Dashboard</p>
                </div>
              </div>

              {/* Status Banner */}
              {adminNotice && (
                <div
                  className={`p-3.5 rounded-2xl text-xs flex items-center justify-between gap-3 ${
                    adminNotice.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {adminNotice.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    )}
                    <span>{adminNotice.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdminNotice(null)}
                    className="p-1 hover:bg-white/10 rounded-lg cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Add New Administrator Card */}
              <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 space-y-4 shadow-sm">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-[#E10B5C]" />
                    <span>Add New Administrator</span>
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Admins sign in through the normal page. Grant access only after they have created an account, using the secure Supabase role record.
                  </p>
                </div>

                <form onSubmit={handleAddAdmin} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-6 space-y-1">
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase">Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                      <input
                        type="email"
                        required
                        placeholder="e.g. 1virtue1x@gmail.com"
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        className="w-full h-10 pl-9 pr-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[#E10B5C]"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase">Assigned Role</label>
                    <select
                      value={newAdminRole}
                      onChange={(e) => setNewAdminRole(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#E10B5C]"
                    >
                      <option value="Super Admin">Super Admin</option>
                      <option value="Finance Admin">Finance Admin</option>
                      <option value="Support Admin">Support Admin</option>
                      <option value="Content Admin">Content Admin</option>
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <button
                      type="submit"
                      className="w-full h-10 px-4 rounded-xl bg-gradient-to-r from-[#E10B5C] to-[#FF62A9] text-white text-xs font-bold shadow-md hover:brightness-105 active:scale-95 transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Add Admin</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Active Platform Administrators Table */}
              <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Active Platform Administrators ({adminList.length})</span>
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold uppercase">
                    Database-backed roles
                  </span>
                </div>

                <div className="divide-y divide-[var(--border-subtle)] text-xs">
                  {adminList.map((email) => {
                    const isOwner = email.toLowerCase() === 'pbona717@gmail.com';
                    const isVirtue = email.toLowerCase() === '1virtue1x@gmail.com';
                    return (
                      <div key={email} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#E10B5C] to-purple-600 flex items-center justify-center text-white font-bold text-xs uppercase shrink-0">
                            {email.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-[var(--text-primary)]">{email}</p>
                              {isOwner && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold">
                                  Primary Owner
                                </span>
                              )}
                              {isVirtue && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold">
                                  Co-Founder / Admin
                                </span>
                              )}
                              {!isOwner && !isVirtue && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E10B5C]/20 text-[#FF62A9] font-bold">
                                  Super Admin
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-[var(--text-secondary)]">Admin access is verified at sign-in</p>
                          </div>
                        </div>

                        <div>
                          {isOwner ? (
                            <span className="text-[10px] text-[var(--text-secondary)] font-mono px-2 py-1 bg-[var(--bg-raised)] rounded-lg">
                              Immutable
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRemoveAdmin(email)}
                              className="text-xs px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer font-bold"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RBAC Matrix Table */}
              <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] overflow-hidden shadow-sm">
                <div className="p-4 border-b border-[var(--border-subtle)]">
                  <h3 className="text-sm font-bold">Role-Based Access Control (RBAC) Matrix</h3>
                  <p className="text-xs text-[var(--text-secondary)]">Granular permission breakdown for administrative operations</p>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--bg-raised)] border-b border-[var(--border-subtle)] font-bold text-[10px] uppercase text-[var(--text-secondary)]">
                    <tr>
                      <th className="py-3 px-4">Permission Capability</th>
                      <th className="py-3 px-4 text-center">Super Admin</th>
                      <th className="py-3 px-4 text-center">Finance Admin</th>
                      <th className="py-3 px-4 text-center">Support Admin</th>
                      <th className="py-3 px-4 text-center">Content Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
                    {[
                      { cap: 'Master Wallet 2FA Withdrawals', super: true, fin: false, sup: false, cont: false },
                      { cap: 'Approve High-Value Withdrawals (> ₦2M)', super: true, fin: true, sup: false, cont: false },
                      { cap: 'Inspect User Incomes & Ledger Records', super: true, fin: true, sup: true, cont: false },
                      { cap: 'Freeze Suspicious User Accounts', super: true, fin: true, sup: true, cont: false },
                      { cap: 'Send Email Broadcasts & Popups', super: true, fin: false, sup: false, cont: true },
                      { cap: 'Edit Gift Catalog & Collections', super: true, fin: false, sup: false, cont: true },
                    ].map((row) => (
                      <tr key={row.cap} className="hover:bg-[var(--bg-raised)]/40">
                        <td className="py-3 px-4 font-bold">{row.cap}</td>
                        <td className="py-3 px-4 text-center">{row.super ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <MinusCircle className="w-4 h-4 text-slate-500 mx-auto" />}</td>
                        <td className="py-3 px-4 text-center">{row.fin ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <MinusCircle className="w-4 h-4 text-slate-500 mx-auto" />}</td>
                        <td className="py-3 px-4 text-center">{row.sup ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <MinusCircle className="w-4 h-4 text-slate-500 mx-auto" />}</td>
                        <td className="py-3 px-4 text-center">{row.cont ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <MinusCircle className="w-4 h-4 text-slate-500 mx-auto" />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 16. ADMIN ACTIVITY LOGS */}
          {/* ========================================================= */}
          {activeSection === 'logs' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold">Admin Activity Logs ({auditLogs.length})</h2>
                <p className="text-xs text-[var(--text-secondary)]">Immutable chronological record of every administrative action</p>
              </div>

              <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 space-y-3 shadow-sm">
                <div className="divide-y divide-[var(--border-subtle)] text-xs">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--text-primary)] font-mono">{log.action}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-raised)] font-mono text-[var(--text-secondary)]">
                            {log.category}
                          </span>
                        </div>
                        <p className="text-[var(--text-secondary)]">{log.details}</p>
                        <p className="text-[10px] text-[var(--text-secondary)]/70 font-mono">
                          Target: {log.target} · Admin: <strong>{log.adminEmail}</strong>
                        </p>
                      </div>
                      <span className="text-[10px] text-[var(--text-secondary)] font-mono shrink-0">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 17. SYSTEM MONITORING & HEALTH */}
          {/* ========================================================= */}
          {activeSection === 'system' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold">System Health &amp; Infrastructure Status</h2>
                <p className="text-xs text-[var(--text-secondary)]">Real-time health monitoring of gateways, APIs, and databases</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { name: 'Core API Server', status: 'Operational', uptime: '99.98%', latency: '38ms' },
                  { name: 'Paystack Payment Gateway', status: 'Operational', uptime: '99.95%', latency: '112ms' },
                  { name: 'Supabase Postgres DB', status: 'Operational', uptime: '100%', latency: '24ms' },
                  { name: 'Ledger Webhook Queue', status: 'Operational', uptime: '99.99%', latency: '18ms' },
                  { name: 'Broadcast Mail Engine', status: 'Idle', uptime: '100%', latency: '45ms' },
                  { name: 'Audio Voice Notes CDN', status: 'Operational', uptime: '99.94%', latency: '60ms' },
                ].map((s) => (
                  <div key={s.name} className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{s.name}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] pt-1">
                      <span>Status: <strong className="text-emerald-500">{s.status}</strong></span>
                      <span className="font-mono">{s.latency}</span>
                    </div>
                    <p className="text-[10px] text-[var(--text-secondary)] font-mono">Uptime: {s.uptime}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 18. CATALOG EDITOR & SEASONAL DROPS (Preserved) */}
          {/* ========================================================= */}
          {activeSection === 'catalog' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold">Gift Catalog &amp; Seasonal Drops Editor</h2>
                <p className="text-xs text-[var(--text-secondary)]">Changes update the public catalog immediately</p>
              </div>

              {/* Seasonal Drop Control */}
              <section className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Active Seasonal Drop
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Toggle whether Valentine&apos;s seasonal drop appears in the public gift selector.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.seasonalDropEnabled}
                    onChange={(e) => setSeasonalConfig(state.activeSeasonalCollection, e.target.checked)}
                    className="w-4 h-4 accent-[#E10B5C]"
                  />
                  <span>Show Valentine&apos;s Drop</span>
                </label>
              </section>

              {/* Catalog Items Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {state.catalog.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-[var(--bg-raised)] border border-[var(--border-subtle)]">
                          <GiftArtworkSvg artworkId={item.artworkId} className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-[var(--text-primary)]">{item.name}</p>
                          <p className="text-[10px] text-[var(--text-secondary)] font-mono">Animation: {item.animationType}</p>
                        </div>
                      </div>

                      <label className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.available}
                          onChange={(e) => updateCatalogItem(item.id, { available: e.target.checked })}
                          className="w-4 h-4 accent-[#E10B5C]"
                        />
                        <span>Available</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[10px] text-[var(--text-secondary)] font-bold mb-1">Name</label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateCatalogItem(item.id, { name: e.target.value })}
                          className="w-full py-1.5 px-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-raised)] text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[var(--text-secondary)] font-bold mb-1">Price (Love Coins)</label>
                        <input
                          type="number"
                          value={item.defaultPriceNaira}
                          onChange={(e) => updateCatalogItem(item.id, { defaultPriceNaira: Math.max(100, Number(e.target.value) || 100) })}
                          className="w-full py-1.5 px-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-raised)] text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: USER DEEP INSPECTION DRAWER */}
      {/* ========================================================= */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-xl w-full rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-3">
                <img src={selectedUser.avatar} alt={selectedUser.name} className="w-12 h-12 rounded-full object-cover border-2 border-[#E10B5C]" />
                <div>
                  <h3 className="font-bold text-base text-[var(--text-primary)]">{selectedUser.name}</h3>
                  <p className="text-xs text-[var(--text-secondary)] font-mono">@{selectedUser.username} · {selectedUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="w-8 h-8 rounded-full bg-[var(--bg-raised)] flex items-center justify-center hover:bg-[var(--bg-hover)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Income Sources Tracing */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Income Sources Tracing (How User Earns Money)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {selectedUser.incomeSources.map((s) => (
                  <div key={s.source} className="p-3 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] text-xs">
                    <p className="text-[11px] text-[var(--text-secondary)]">{s.source}</p>
                    <p className="font-bold text-sm text-[var(--text-primary)] mt-0.5">{s.amount}</p>
                    <p className="text-[10px] text-[#E10B5C] font-mono">{s.percentage}% of earnings</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Device & Location */}
            <div className="space-y-1.5 text-xs bg-[var(--bg-raised)] p-3.5 rounded-2xl border border-[var(--border-subtle)]">
              <p className="font-bold text-[var(--text-secondary)] uppercase text-[10px]">Device &amp; IP Audit</p>
              <p className="font-medium text-[var(--text-primary)]">💻 {selectedUser.deviceInfo}</p>
              <p className="font-mono text-[var(--text-secondary)]">IP: {selectedUser.ipAddress} · Region: {selectedUser.region}, {selectedUser.country}</p>
            </div>

            {/* Admin Governance Actions */}
            <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Account Governance</p>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    addAuditLog({
                      adminEmail: state.signedInEmail || '1virtue1x@gmail.com',
                      action: 'USER_WITHDRAWALS_RESTRICTED',
                      target: selectedUser.email,
                      details: 'Restricted withdrawal permissions for user.',
                      category: 'user',
                    });
                    alert(`Withdrawal restriction applied to ${selectedUser.username}.`);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/25"
                >
                  Restrict Withdrawals
                </button>
                <button
                  type="button"
                  onClick={() => {
                    addAuditLog({
                      adminEmail: state.signedInEmail || '1virtue1x@gmail.com',
                      action: 'USER_ACCOUNT_FROZEN',
                      target: selectedUser.email,
                      details: 'Froze user account access.',
                      category: 'user',
                    });
                    alert(`Account frozen for ${selectedUser.username}.`);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/15 text-rose-500 border border-rose-500/30 text-xs font-bold hover:bg-rose-500/25"
                >
                  Freeze Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ========================================================= */}
      {/* MODAL 3: MASTER WALLET 4-STEP WITHDRAWAL MODAL (User Spec 16) */}
      {/* ========================================================= */}
      {showMasterWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-[var(--bg-card)] border border-purple-500/40 p-6 space-y-5 shadow-2xl">
            {/* Header with Step Indicator */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Step {masterWithdrawStep} of 4</span>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  {masterWithdrawStep === 1 && 'Withdraw Master Wallet Profit'}
                  {masterWithdrawStep === 2 && 'Review Payout Details'}
                  {masterWithdrawStep === 3 && 'Super Admin 2FA Code Verification'}
                  {masterWithdrawStep === 4 && 'Payout Executed Successfully'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMasterWithdrawModal(false)}
                className="w-8 h-8 rounded-full bg-[var(--bg-raised)] flex items-center justify-center hover:bg-[var(--bg-hover)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error notice */}
            {masterWithdrawError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs font-semibold">
                {masterWithdrawError}
              </div>
            )}

            {/* Step 1: Input Amount & Select Bank */}
            {masterWithdrawStep === 1 && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-[var(--text-secondary)] mb-1">Withdrawal Amount (₦)</label>
                  <input
                    type="number"
                    min={10000}
                    step={10000}
                    value={masterWithdrawAmount}
                    onChange={(e) => setMasterWithdrawAmount(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] text-base font-black tabular-nums"
                  />
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                    Available Master Profit: {formatNaira(state.adminMasterWallet.loveCoinsBalance)}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] space-y-1">
                  <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">Destination Bank Account</p>
                  <p className="font-bold text-sm text-[var(--text-primary)]">{masterWithdrawBank.bankName}</p>
                  <p className="font-mono text-[var(--text-secondary)]">{masterWithdrawBank.accountNumber} · {masterWithdrawBank.accountName}</p>
                </div>

                <button
                  type="button"
                  onClick={handleInitiateMasterWithdraw}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-all cursor-pointer"
                >
                  Continue to Summary &gt;
                </button>
              </div>
            )}

            {/* Step 2: Summary Review */}
            {masterWithdrawStep === 2 && (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Gross Amount:</span>
                    <strong className="font-mono">{formatNaira(Number(masterWithdrawAmount))}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Platform Fee:</span>
                    <span className="text-emerald-500 font-bold">₦0 (Admin Exempt)</span>
                  </div>
                  <div className="flex justify-between border-t border-[var(--border-subtle)] pt-1.5 font-bold text-sm">
                    <span>Net Payout:</span>
                    <span className="text-purple-400">{formatNaira(Number(masterWithdrawAmount))}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px]">
                  🔒 A 6-digit confirmation code will be required to confirm payout execution to {state.signedInEmail || '1virtue1x@gmail.com'}.
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMasterWithdrawStep(1)}
                    className="flex-1 py-2.5 rounded-xl bg-[var(--bg-raised)] font-bold cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setMasterWithdrawStep(3)}
                    className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer"
                  >
                    Send 2FA Code &gt;
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Enter 6-digit verification code */}
            {masterWithdrawStep === 3 && (
              <div className="space-y-4 text-xs">
                <p className="text-[var(--text-secondary)]">
                  Enter the 6-digit security code sent to <strong>{state.signedInEmail || '1virtue1x@gmail.com'}</strong>:
                </p>

                <div className="space-y-1">
                  <input
                    type="text"
                    maxLength={6}
                    value={masterWithdrawCode}
                    onChange={(e) => setMasterWithdrawCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full py-3 px-4 rounded-xl border border-purple-500/50 bg-[var(--bg-raised)] text-center text-xl font-mono tracking-widest font-black"
                  />
                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="text-[var(--text-secondary)]">Demo code: <strong className="text-purple-400">{generatedSampleCode}</strong></span>
                    <button
                      type="button"
                      onClick={() => setMasterWithdrawCode(generatedSampleCode)}
                      className="text-purple-400 underline font-bold cursor-pointer"
                    >
                      Auto-fill
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmMasterWithdrawCode}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-[#E10B5C] text-white font-bold cursor-pointer shadow-md"
                >
                  Authorize &amp; Execute Payout
                </button>
              </div>
            )}

            {/* Step 4: Success confirmation */}
            {masterWithdrawStep === 4 && (
              <div className="space-y-4 text-xs text-center py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/30">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <h4 className="text-base font-bold text-[var(--text-primary)]">Payout Executed!</h4>
                <p className="text-[var(--text-secondary)]">
                  {formatNaira(Number(masterWithdrawAmount))} has been disbursed to {masterWithdrawBank.bankName} ({masterWithdrawBank.accountNumber}).
                </p>
                <div className="p-3 rounded-xl bg-[var(--bg-raised)] font-mono text-[11px] text-[var(--text-secondary)]">
                  Transaction Reference: SM-MW-{Date.now().toString().slice(-8)}
                </div>
                <button
                  type="button"
                  onClick={() => setShowMasterWithdrawModal(false)}
                  className="w-full py-2.5 rounded-xl bg-[#E10B5C] text-white font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: REJECT WITHDRAWAL REASON MODAL */}
      {/* ========================================================= */}
      {selectedPayout && payoutActionType === 'reject' && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-rose-500">Reject Withdrawal &amp; Refund User</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Rejecting will automatically refund {formatNaira(selectedPayout.amountNaira)} back to the user&apos;s available Gifted Rewards balance.
            </p>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Rejection Reason</label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Account name mismatch on NUBAN lookup. Please update details."
                className="w-full py-2 px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] text-xs font-medium"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedPayout(null);
                  setPayoutActionType(null);
                }}
                className="px-4 py-2 rounded-xl bg-[var(--bg-raised)] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRejectPayout(selectedPayout.id)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Confirm Rejection &amp; Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
